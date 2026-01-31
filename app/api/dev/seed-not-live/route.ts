import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";

export async function POST() {
    try {
        // 1. Clear existing sessions to avoid conflict
        const sessionsRef = collection(db, "sessions");
        const snapshot = await getDocs(sessionsRef);
        snapshot.forEach(async (d) => {
            await deleteDoc(doc(db, "sessions", d.id));
        });

        // 2. Create a session for TOMORROW (Not Live)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow

        const tomorrowEnd = new Date(tomorrow);
        tomorrowEnd.setHours(17, 0, 0, 0); // 5 PM tomorrow

        const session = await addDoc(sessionsRef, {
            courseId: "class-1", // Matching the ID in courses.ts
            startDate: tomorrow.toISOString(),
            endDate: tomorrowEnd.toISOString(),
            zoomLink: "https://zoom.us/j/test",
            topic: "Class 1: Fire Emergencies",
            instructor: "Test Instructor"
        });

        return NextResponse.json({
            message: "Seeded Future Session (NOT LIVE)",
            sessionId: session.id,
            start: tomorrow.toISOString()
        });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
