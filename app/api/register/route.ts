import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, runTransaction } from "firebase/firestore";
import { sendWelcomeEmail } from "@/lib/email";
import { getCourseById } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { sessionId, seatsRequested, userDetails } = body; // Expecting userDetails: { name, email }

        if (!sessionId || !seatsRequested || seatsRequested <= 0) {
            return NextResponse.json(
                { error: "Invalid request parameters" },
                { status: 400 }
            );
        }

        const sessionRef = doc(db, "sessions", sessionId);
        let sessionDate = "";
        let courseTitle = "FLSD Course"; // Default or fetched
        let courseId = "";

        await runTransaction(db, async (transaction) => {
            const sessionDoc = await transaction.get(sessionRef);

            if (!sessionDoc.exists()) {
                throw new Error("Session does not exist");
            }

            const data = sessionDoc.data();
            const currentEnrolled = data.enrolledCount || 0;
            const capacity = data.globalCapacity || 25;
            const newTotal = currentEnrolled + seatsRequested;

            if (newTotal > capacity) {
                throw new Error(`Capacity exceeded. Only ${capacity - currentEnrolled} seats remaining.`);
            }

            sessionDate = new Date(data.startDate).toLocaleDateString();
            courseId = data.courseId; // Capture courseId for email

            // Update the enrolled count
            transaction.update(sessionRef, {
                enrolledCount: newTotal
            });
        });

        // Send Email (Fire and Forget or Await - here await for feedback)
        if (userDetails && userDetails.email) {
            if (courseId) {
                const course = await getCourseById(courseId);
                if (course) courseTitle = course.title;
            }

            await sendWelcomeEmail({
                email: userDetails.email,
                name: userDetails.name || "Student",
                courseTitle: courseTitle,
                startDate: sessionDate,
                portalLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`
            });
        }

        return NextResponse.json({ success: true, message: "Registration successful" });

    } catch (error: any) {
        console.error("Registration transaction failed:", error);
        return NextResponse.json(
            { error: error.message || "Registration failed" },
            { status: 400 }
        );
    }
}
