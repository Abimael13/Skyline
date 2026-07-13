import { NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAdminApp, verifyIdToken } from "@/lib/firebaseAdmin";
import { COURSES } from "@/lib/courses";
import { getExamAnswerKey } from "@/lib/examAnswerKeys";
import { getExamAttemptEligibility, EXAM_INELIGIBLE_MESSAGES, ExamResultRecord, ExamIneligibleReason } from "@/lib/examEligibility";
import { stopExamRoomRecording } from "@/lib/examRecording";

// ---------------------------------------------------------------------------
// Submit + grade the proctored graduation exam.
//
// Why this exists: components/learning/ExamPortal.tsx used to compute the
// score itself from the student's own `answers` state (trusting the browser)
// and then write the result straight to users/{uid}.examResults with the
// client SDK. That is a certification-forgery vector for a fire/life-safety
// training business - a student could submit any score they wanted - and as
// of the firestore.rules change that blocks client writes to `examResults`
// (see firestore.rules comments on match /users/{uid}), that write also now
// fails outright with permission-denied, breaking exam submission entirely.
//
// This route is the fix: the client sends only its raw answer selections
// (option index per question), never a score or pass/fail flag. The server
// looks up the question bank from lib/courses.ts (text/options only - safe
// to be public, needed to render the exam) and the correct-answer key from
// lib/examAnswerKeys.ts (server-only - see that file's header for why it's
// kept separate), grades independently, and is the only writer of
// users/{uid}.examResults (via the Admin SDK, which bypasses firestore.rules
// by design - same pattern as app/api/admin/grade-exam/route.ts and
// app/api/auth/redeem-code/route.ts).
//
// This route also enforces the two-attempt cap (see lib/examEligibility.ts
// for the full state machine): a student gets at most two attempts, ever.
// A failed first attempt requires an admin to explicitly approve a retake
// (app/api/admin/approve-retake/route.ts) before a second attempt is
// possible, and a second attempt - pass or fail - is always final. The
// eligibility check and the result write happen inside a single Firestore
// transaction so two near-simultaneous submissions (a double click, two
// open tabs) can't both read "attempt not yet used" and sneak in an extra
// attempt.
//
// NOTE ON THE ANSWER-KEY FIX: lib/courses.ts is imported directly into the
// client bundle by components/learning/ExamPortal.tsx to render question
// text/options, and gets seeded into the publicly-readable Firestore
// `courses` collection. As of this fix, lib/courses.ts's exam questions no
// longer carry a `correctIndex` field at all - the answer key lives only in
// lib/examAnswerKeys.ts, a server-only file never imported by any client
// component. That closes the "read the answer key out of the JS bundle or
// Firestore" hole, on top of the "forge your own score" hole this route
// already closed (the client can no longer assert a score/pass value).
// ---------------------------------------------------------------------------

const PASSING_SCORE = 70;

// Thrown inside the attempt-cap transaction below when a student is not
// currently allowed to start a new attempt (already passed, already used
// both attempts, or on a failed first attempt without admin approval).
// Caught right outside the transaction and turned into a 403 response.
class ExamAttemptBlockedError extends Error {
    constructor(reason: ExamIneligibleReason) {
        super(EXAM_INELIGIBLE_MESSAGES[reason]);
        this.name = "ExamAttemptBlockedError";
    }
}

export async function POST(req: Request) {
    let decodedToken;
    try {
        decodedToken = await verifyIdToken(req);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { courseId, answers } = body;

        if (!courseId || typeof courseId !== "string") {
            return NextResponse.json({ error: "Missing courseId." }, { status: 400 });
        }
        if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
            return NextResponse.json({ error: "Missing or invalid answers." }, { status: 400 });
        }

        const uid = decodedToken.uid;

        // Look up the exam question bank (text/options, public) server-side.
        // The graduation exam lives on the course's "exam" type module
        // (see lib/courses.ts - same Module/content.questions shape used by
        // the Class 8 review quiz and QuizPlayer elsewhere in the app).
        const course = COURSES.find((c) => c.id === courseId);
        const examModule = course?.modules.find((m) => m.type === "exam");
        const questions = examModule?.content?.questions;

        if (!course || !examModule || !questions || questions.length === 0) {
            return NextResponse.json({ error: "No exam found for this course." }, { status: 404 });
        }

        // Look up the correct-answer key from the server-only source (see
        // lib/examAnswerKeys.ts). This is the ONLY place in the app that
        // should ever read this file to compute a real, authoritative score.
        const answerKey = getExamAnswerKey(courseId);
        if (!answerKey || answerKey.length !== questions.length) {
            // Fail closed: a missing or mismatched answer key means we
            // cannot trust a graded score, so refuse to grade rather than
            // silently mis-grade (e.g. every answer coming back "wrong").
            console.error(
                `Exam answer key missing or mismatched for course "${courseId}": ` +
                `${questions.length} question(s), ${answerKey?.length ?? 0} answer(s) on file.`
            );
            return NextResponse.json(
                { error: "This exam is not currently configured for grading. Please contact support." },
                { status: 500 }
            );
        }

        // Independently compute the score from the answer key. Never trust
        // any score/pass value the client might send - only raw selections.
        let correctCount = 0;
        answerKey.forEach((correctIndex, idx) => {
            const submitted = answers[idx];
            if (typeof submitted === "number" && submitted === correctIndex) {
                correctCount++;
            }
        });

        const score = Math.round((correctCount / questions.length) * 100);
        const passed = score >= PASSING_SCORE;

        // Diploma reference is assigned server-side, and only on a genuine
        // pass. This follows the same placeholder convention already used
        // across the app (app/portal/documents/page.tsx,
        // app/api/admin/grade-exam/route.ts) - a real per-student generated
        // PDF is a separate project, not part of this fix.
        const diplomaUrl = passed ? "/certificates/f89-placeholder.pdf" : null;
        const gradedAt = new Date().toISOString();

        const adminDb = getFirestore(getAdminApp());
        const userRef = adminDb.collection("users").doc(uid);

        // 1. Attempt-cap gate + grade write, done atomically in one
        // transaction. Reading the student's current examResults[courseId]
        // and writing the new one in the same transaction is what actually
        // prevents a race (e.g. a double-submit, or two open tabs) from
        // both reading "no attempt used yet" and both getting through -
        // Firestore transactions retry automatically on write conflicts, so
        // only one of two racing submissions can ever win the eligibility
        // check.
        let attemptNumber: 1 | 2;
        try {
            attemptNumber = await adminDb.runTransaction(async (tx) => {
                const userSnap = await tx.get(userRef);
                const existingResult = userSnap.exists
                    ? (userSnap.data()?.examResults?.[courseId] as ExamResultRecord | undefined)
                    : undefined;

                const eligibility = getExamAttemptEligibility(existingResult);
                if (!eligibility.eligible) {
                    throw new ExamAttemptBlockedError(eligibility.reason);
                }

                // This is the write that firestore.rules blocks from the
                // client SDK entirely - the Admin SDK bypasses that rule by
                // design, which is correct here because the authorization,
                // grading, and attempt-cap check have already happened
                // above/in this same transaction. `retakeApproved` is reset
                // to false on every write: it is only ever "true" again
                // once an admin approves a fresh retake after a new failed
                // first attempt, and once this is attempt 2 the value is
                // moot anyway since `attempt >= 2` blocks all further
                // attempts regardless of it. `retakeApprovedBy`/
                // `retakeApprovedAt` are deliberately left out of this
                // write (not overwritten) so the audit trail of who
                // approved this attempt survives into the graded result.
                tx.set(
                    userRef,
                    {
                        examResults: {
                            [courseId]: {
                                status: passed ? "passed" : "failed",
                                score,
                                gradedAt,
                                diplomaUrl,
                                attempt: eligibility.attemptNumber,
                                retakeApproved: false,
                            },
                        },
                    },
                    { merge: true }
                );

                return eligibility.attemptNumber;
            });
        } catch (error: any) {
            if (error instanceof ExamAttemptBlockedError) {
                return NextResponse.json({ error: error.message }, { status: 403 });
            }
            throw error;
        }

        const submissionData = {
            courseId,
            submittedAt: gradedAt,
            answers,
            totalQuestions: questions.length,
            status: "submitted",
            score,
            passed,
            attempt: attemptNumber,
        };

        // 2. Save the detailed submission record (Admin SDK - same
        // examSubmissions collection the client used to write directly;
        // keeping it here too so admins retain the raw-answers audit trail).
        // Only reached once the attempt has been accepted above.
        //
        // Doc ID is keyed by BOTH courseId and attempt number
        // (`${courseId}_attempt${attemptNumber}`, e.g. "f89-flsd_attempt1"
        // and "f89-flsd_attempt2"), not just courseId. A fixed
        // `${courseId}`-only doc ID would mean a second attempt's raw
        // answers silently overwrite the first attempt's - the exact
        // opposite of an audit trail. See app/admin/students/[studentId]/page.tsx
        // for the matching read side, which looks up the submission for
        // each attempt this way too.
        await adminDb
            .collection("users")
            .doc(uid)
            .collection("examSubmissions")
            .doc(`${courseId}_attempt${attemptNumber}`)
            .set(submissionData);

        // 3. Close out the proctoring session, if one exists.
        const sessionId = `${uid}_f89-flsd`;
        await adminDb
            .collection("exam_sessions")
            .doc(sessionId)
            .set(
                {
                    status: "completed",
                    endTime: FieldValue.serverTimestamp(),
                },
                { merge: true }
            )
            .catch((err) => {
                // Non-fatal: the session doc may not exist in edge cases
                // (e.g. it was never created, or was already cleaned up).
                // The exam result itself is already saved.
                console.error("Failed to close exam session:", err);
            });

        // 4. Stop the proctoring room recording for this attempt, if one is
        // running (see lib/examRecording.ts - recording is started by an
        // admin authorizing the session in components/admin/LiveProctorDashboard.tsx).
        // This runs with this route's own server-side LiveKit credentials,
        // not the caller's identity, so it works regardless of whether the
        // student or an admin ultimately triggered the submission. Best
        // effort and never blocks the exam result from being returned - a
        // student's score must never be held up by a recording-infrastructure
        // problem.
        await stopExamRoomRecording({
            sessionId,
            attemptNumber,
            reason: "exam_submitted",
        }).catch((err) => {
            console.error("Failed to stop exam recording on submit:", err);
        });

        return NextResponse.json({
            success: true,
            score,
            passed,
            totalQuestions: questions.length,
            correctCount,
            diplomaUrl,
            attempt: attemptNumber,
        });
    } catch (error: any) {
        console.error("Exam submission failed:", error);
        return NextResponse.json(
            { error: error.message || "Failed to submit exam." },
            { status: 500 }
        );
    }
}
