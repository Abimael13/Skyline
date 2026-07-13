import { NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAdminApp, verifyIdToken } from "@/lib/firebaseAdmin";
import { COURSES } from "@/lib/courses";

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

        const submissionData = {
            courseId,
            submittedAt: gradedAt,
            answers,
            totalQuestions: questions.length,
            status: "submitted",
            score,
            passed,
        };

        // 1. Save the detailed submission record (Admin SDK - same
        // examSubmissions doc the client used to write directly; keeping it
        // here too so admins retain the raw-answers audit trail).
        await adminDb
            .collection("users")
            .doc(uid)
            .collection("examSubmissions")
            .doc(courseId)
            .set(submissionData);

        // 2. Update the student's profile with the server-computed grade.
        // This is the write that firestore.rules now blocks from the client
        // SDK - the Admin SDK bypasses that rule entirely, which is correct
        // here because the authorization + grading already happened above.
        await adminDb
            .collection("users")
            .doc(uid)
            .set(
                {
                    examResults: {
                        [courseId]: {
                            status: passed ? "passed" : "failed",
                            score,
                            gradedAt,
                            diplomaUrl,
                        },
                    },
                },
                { merge: true }
            );

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
                // (e.g. dev resets). The exam result itself is already saved.
                console.error("Failed to close exam session:", err);
            });

        return NextResponse.json({
            success: true,
            score,
            passed,
            totalQuestions: questions.length,
            correctCount,
            diplomaUrl,
        });
    } catch (error: any) {
        console.error("Exam submission failed:", error);
        return NextResponse.json(
            { error: error.message || "Failed to submit exam." },
            { status: 500 }
        );
    }
}
