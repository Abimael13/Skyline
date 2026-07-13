import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp, requireAdmin } from "@/lib/firebaseAdmin";
import { sendExamResultEmail } from "@/lib/email";
import { getExamAttemptEligibility, EXAM_INELIGIBLE_MESSAGES, ExamResultRecord } from "@/lib/examEligibility";

export async function POST(req: Request) {
    try {
        await requireAdmin(req);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { studentId, courseId, passed, score, diplomaUrl, feedback } = body;

        if (!studentId || !courseId || score === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // This route is admin-only (requireAdmin() above), so all Firestore
        // access here goes through the Admin SDK, which bypasses
        // firestore.rules entirely by design - that's correct since the real
        // authorization check already happened above. Do NOT switch this back
        // to the client SDK (lib/firebase.ts); an unauthenticated client SDK
        // connection would be rejected by firestore.rules in production even
        // though requireAdmin() already verified the caller.
        const adminDb = getFirestore(getAdminApp());

        // 1. Fetch User Data to get email
        const userRef = adminDb.collection("users").doc(studentId);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        const userData = userSnap.data()!;
        const studentEmail = userData.email;
        const studentName = userData.displayName || "Student";

        // Two-attempt exam cap: re-verify server-side, exactly like
        // app/api/admin/approve-retake/route.ts and
        // app/api/exam/submit/route.ts already do - never trust the admin
        // UI's decision to render (or hide) the grading form as the only
        // thing standing between this route and an out-of-sequence write.
        // A direct call to this route (compromised admin session, internal
        // script, future UI change) must be blocked the same way a direct
        // call to submit/route.ts would be. See lib/examEligibility.ts for
        // the full state machine: this only allows manual grading when the
        // student is genuinely starting a fresh attempt 1 (no result yet)
        // or has been approved for their final attempt 2 - never a student
        // who has already passed, already exhausted both attempts, or is
        // sitting in an un-approved failed-attempt-1 state.
        const existingResult = userData.examResults?.[courseId] as ExamResultRecord | undefined;
        const eligibility = getExamAttemptEligibility(existingResult);

        if (!eligibility.eligible) {
            return NextResponse.json(
                { error: EXAM_INELIGIBLE_MESSAGES[eligibility.reason] },
                { status: 409 }
            );
        }

        // 2. Fetch Course Data to get title
        const courseRef = adminDb.collection("courses").doc(courseId);
        const courseSnap = await courseRef.get();
        const courseTitle = courseSnap.exists ? courseSnap.data()!.title : "Course Exam";

        // 3. Update User Record with Exam Result
        // We'll store this in an 'examResults' map keyed by courseId for easy access
        // e.g. users/{uid} -> { examResults: { "f89-flsd": { status: 'passed', score: 90 ... } } }
        //
        // `attempt` reflects the student's ACTUAL current attempt number,
        // taken from the eligibility check above (1 for a fresh student, 2
        // for an admin-approved retake) rather than being hardcoded - a
        // hardcoded `attempt: 1` here would let a second attempt graded
        // through this tool silently reset the attempt counter and bypass
        // the two-attempt cap. `retakeApproved` is reset to false on every
        // write, same as submit/route.ts: it's only ever true again once an
        // admin approves a fresh retake after a new failed first attempt.
        const examResultData = {
            status: passed ? 'passed' : 'failed',
            score,
            diplomaUrl: passed ? diplomaUrl : null,
            gradedAt: new Date().toISOString(),
            feedback: feedback || "",
            attempt: eligibility.attemptNumber,
            retakeApproved: false,
        };

        // Deep-merge via .set(..., { merge: true }) instead of .update() on
        // a dotted field path - .update() with a dotted key like
        // `examResults.${courseId}` replaces the ENTIRE nested map at that
        // path, which would silently wipe any retakeApprovedBy/
        // retakeApprovedAt audit trail already on the record. merge:true
        // only touches the fields listed here and leaves the rest of the
        // nested map (including that audit trail) intact. Same pattern as
        // app/api/admin/approve-retake/route.ts and
        // app/api/exam/submit/route.ts.
        await userRef.set(
            { examResults: { [courseId]: examResultData } },
            { merge: true }
        );

        // 4. Send Email
        await sendExamResultEmail({
            email: studentEmail,
            name: studentName,
            courseTitle,
            passed,
            score,
            diplomaDownloadUrl: diplomaUrl,
        });

        return NextResponse.json({ success: true, message: "Exam graded and email sent." });

    } catch (error: any) {
        console.error("Error in grade-exam API:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
