import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp, requireAdmin } from "@/lib/firebaseAdmin";
import { sendExamResultEmail } from "@/lib/email";

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

        // 2. Fetch Course Data to get title
        const courseRef = adminDb.collection("courses").doc(courseId);
        const courseSnap = await courseRef.get();
        const courseTitle = courseSnap.exists ? courseSnap.data()!.title : "Course Exam";

        // 3. Update User Record with Exam Result
        // We'll store this in an 'examResults' map keyed by courseId for easy access
        // e.g. users/{uid} -> { examResults: { "f89-flsd": { status: 'passed', score: 90 ... } } }

        const examResultData = {
            status: passed ? 'passed' : 'failed',
            score,
            diplomaUrl: passed ? diplomaUrl : null,
            gradedAt: new Date().toISOString(),
            feedback: feedback || ""
        };

        const updateData = {
            [`examResults.${courseId}`]: examResultData
        };

        await userRef.update(updateData);

        // 4. Send Email
        const retakeDate = new Date();
        retakeDate.setDate(retakeDate.getDate() + 30);
        const retakeDateString = retakeDate.toLocaleDateString();

        await sendExamResultEmail({
            email: studentEmail,
            name: studentName,
            courseTitle,
            passed,
            score,
            diplomaDownloadUrl: diplomaUrl,
            retakeDateLimit: retakeDateString
        });

        return NextResponse.json({ success: true, message: "Exam graded and email sent." });

    } catch (error: any) {
        console.error("Error in grade-exam API:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
