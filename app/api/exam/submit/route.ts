import { NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAdminApp, verifyIdToken } from "@/lib/firebaseAdmin";
import { COURSES } from "@/lib/courses";
import { getExamAttemptEligibility, EXAM_INELIGIBLE_MESSAGES, ExamResultRecord, ExamIneligibleReason } from "@/lib/examEligibility";

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
// looks up the correct answer key from lib/courses.ts, grades independently,
// and is the only writer of users/{uid}.examResults (via the Admin SDK,
// which bypasses firestore.rules by design - same pattern as
// app/api/admin/grade-exam/route.ts and app/api/auth/redeem-code/route.ts).
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
// IMPORTANT CAVEAT (see report to owner): lib/courses.ts, including each
// question's `correctIndex`, is imported directly into the client bundle by
// ExamPortal.tsx to render the questions. That means the answer key is still
// visible to anyone who inspects the JS bundle or React state in devtools,
// even though grading itself now happens here on the server. This route
// closes the "forge your own score" hole (the client can no longer just
// assert a score/pass value), but it does NOT hide the answer key from a
// determined student. See the written report for what a real fix for that
// would require.
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

        // Look up the exam question bank + correct-answer key server-side.
        // The graduation exam lives on the course's "exam" type module
        // (see lib/courses.ts - same Module/content.questions shape used by
        // the Class 8 review quiz and QuizPlayer elsewhere in the app).
        const course = COURSES.find((c) => c.id === courseId);
        const examModule = course?.modules.find((m) => m.type === "exam");
        const questions = examModule?.content?.questions;

        if (!course || !examModule || !questions || questions.length === 0) {
            return NextResponse.json({ error: "No exam found for this course." }, { status: 404 });
        }

        // Independently compute the score from the answer key. Never trust
        // any score/pass value the client might send - only raw selections.
        let correctCount = 0;
        questions.forEach((q, idx) => {
            const submitted = answers[idx];
            if (typeof submitted === "number" && submitted === q.correctIndex) {
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
