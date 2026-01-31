import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { sendExamResultEmail } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { studentId, courseId, passed, score, diplomaUrl, feedback } = body;

        if (!studentId || !courseId || score === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Fetch User Data to get email
        const userRef = doc(db, "users", studentId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        const userData = userSnap.data();
        const studentEmail = userData.email;
        const studentName = userData.displayName || "Student";

        // 2. Fetch Course Data to get title
        const courseRef = doc(db, "courses", courseId);
        const courseSnap = await getDoc(courseRef);
        const courseTitle = courseSnap.exists() ? courseSnap.data().title : "Course Exam";

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

        await updateDoc(userRef, updateData);

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
