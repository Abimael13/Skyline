import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";

export async function POST() {
    try {
        // 1. Clear existing sessions
        const sessionsRef = collection(db, "sessions");
        const snapshot = await getDocs(sessionsRef);

        // This is safe for dev, be careful in prod
        snapshot.forEach(async (d) => {
            await deleteDoc(doc(db, "sessions", d.id));
        });

        // 2. Create a session for NOW
        const now = new Date();
        const start = new Date(now);
        start.setHours(now.getHours() - 1); // Started 1 hour ago

        const end = new Date(now);
        end.setHours(now.getHours() + 4); // Ends in 4 hours

        const session = await addDoc(sessionsRef, {
            courseId: "class-1",
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            zoomLink: "https://zoom.us/j/test-live-now",
            topic: "Class 1: Fire Emergencies (TEST LIVE)",
            instructor: "Test Instructor"
        });

        return NextResponse.json({
            message: "Seeded LIVE Session",
            sessionId: session.id,
            start: start.toISOString(),
            end: end.toISOString()
        });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
