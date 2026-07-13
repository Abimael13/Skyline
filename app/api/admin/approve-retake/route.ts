import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp, requireAdmin } from "@/lib/firebaseAdmin";
import { getExamAttemptEligibility, ExamResultRecord } from "@/lib/examEligibility";
import { sendRetakeApprovedEmail } from "@/lib/email";
import { COURSES } from "@/lib/courses";

// ---------------------------------------------------------------------------
// Admin-only: approve a student's second (and final) attempt at the
// graduation exam after they failed their first attempt.
//
// A failed first attempt never lets a student self-schedule or self-start a
// retake (see app/api/exam/submit/route.ts + lib/examEligibility.ts) - an
// admin has to explicitly approve it here first. This route is the only
// place that flips `retakeApproved` to true, and it only does so after
// re-checking (server-side, via the same eligibility function the submit
// route uses) that the student is genuinely sitting in the
// failed-attempt-1-awaiting-review state. That blocks an admin from
// accidentally approving a "retake" for a student who already passed,
// already used both attempts, or has no result at all for this course.
//
// A short required note (`retakeApprovalNotes`) is stored alongside
// `retakeApprovedBy`/`retakeApprovedAt` so there's always a real record of
// why a given retake was approved - what the admin reviewed, any context.
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
    let decodedToken;
    try {
        decodedToken = await requireAdmin(req);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { studentId, courseId, notes } = body;

        if (!studentId || typeof studentId !== "string") {
            return NextResponse.json({ error: "Missing studentId." }, { status: 400 });
        }
        if (!courseId || typeof courseId !== "string") {
            return NextResponse.json({ error: "Missing courseId." }, { status: 400 });
        }
        if (!notes || typeof notes !== "string" || !notes.trim()) {
            return NextResponse.json(
                { error: "A short note explaining why this retake is being approved is required." },
                { status: 400 }
            );
        }
        const retakeApprovalNotes = notes.trim();

        const adminDb = getFirestore(getAdminApp());
        const userRef = adminDb.collection("users").doc(studentId);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return NextResponse.json({ error: "Student not found." }, { status: 404 });
        }

        const userData = userSnap.data()!;
        const existingResult = userData.examResults?.[courseId] as ExamResultRecord | undefined;
        const eligibility = getExamAttemptEligibility(existingResult);

        // Only a genuine failed-attempt-1-awaiting-review result can be
        // approved. This rejects: no result yet, already passed, already
        // used both attempts, and already-approved (no double-approving).
        if (eligibility.eligible || eligibility.reason !== "awaiting-review") {
            return NextResponse.json(
                { error: "This student is not currently eligible for retake approval." },
                { status: 409 }
            );
        }

        const retakeApprovedAt = new Date().toISOString();
        const adminUid = decodedToken.uid;

        await userRef.set(
            {
                examResults: {
                    [courseId]: {
                        retakeApproved: true,
                        retakeApprovedBy: adminUid,
                        retakeApprovedAt,
                        retakeApprovalNotes,
                    },
                },
            },
            { merge: true }
        );

        const course = COURSES.find((c) => c.id === courseId);
        const courseTitle = course?.title || courseId.toUpperCase();
        const studentEmail = userData.email;
        const studentName = userData.displayName || "Student";

        let emailSent = false;
        if (studentEmail) {
            emailSent = await sendRetakeApprovedEmail({
                email: studentEmail,
                name: studentName,
                courseTitle,
            });
        } else {
            console.error(`Cannot send retake approval email: student ${studentId} has no email on file.`);
        }

        return NextResponse.json({ success: true, emailSent });
    } catch (error: any) {
        console.error("Error approving retake:", error);
        return NextResponse.json(
            { error: error.message || "Failed to approve retake." },
            { status: 500 }
        );
    }
}
