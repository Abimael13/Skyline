import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const courseId = searchParams.get('courseId');

        const sessionsRef = collection(db, "sessions");
        let q = query(sessionsRef);

        // If courseId is provided, filter sessions for this course
        if (courseId) {
            // Filter by courseId field (set by Schedule Manager)
            q = query(sessionsRef, where("courseId", "==", courseId));
        }

        const querySnapshot = await getDocs(q);
        const sessions = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return NextResponse.json(sessions);
    } catch (error: any) {
        console.error("Error fetching sessions:", error);
        return NextResponse.json(
            { error: "Failed to fetch sessions" },
            { status: 500 }
        );
    }
}
