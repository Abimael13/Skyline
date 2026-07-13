import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp, requireAdmin } from "@/lib/firebaseAdmin";
import { stopExamRoomRecording } from "@/lib/examRecording";
import { getExamAttemptEligibility, ExamResultRecord } from "@/lib/examEligibility";

// ---------------------------------------------------------------------------
// Admin-only: stop recording the proctored exam room. Called by
// components/admin/LiveProctorDashboard.tsx when an admin voids or force
// submits an exam session (the two ways an exam can end from the proctor
// side outside of a normal student submission - a normal submission stops
// its own recording server-side from app/api/exam/submit/route.ts directly,
// without needing this route, since that route already runs with the same
// server-side LiveKit credentials).
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
    let decodedToken;
    try {
        decodedToken = await requireAdmin(req);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Admin privileges required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const sessionId = body?.sessionId;
    const reason = typeof body?.reason === "string" && body.reason ? body.reason : "admin_action";
    if (!sessionId || typeof sessionId !== "string") {
        return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });
    }

    const adminDb = getFirestore(getAdminApp());
    const sessionSnap = await adminDb.collection("exam_sessions").doc(sessionId).get();
    if (!sessionSnap.exists) {
        return NextResponse.json({ error: "Exam session not found." }, { status: 404 });
    }

    const sessionData = sessionSnap.data()!;
    const uid = sessionData.userId as string | undefined;
    const courseId = (sessionData.courseId as string | undefined) || "f89-flsd";

    let attemptNumber = 1;
    if (uid) {
        const userSnap = await adminDb.collection("users").doc(uid).get();
        const existingResult = userSnap.data()?.examResults?.[courseId] as ExamResultRecord | undefined;
        const eligibility = getExamAttemptEligibility(existingResult);
        attemptNumber = eligibility.eligible ? eligibility.attemptNumber : (existingResult?.attempt ?? 1);
    }

    await stopExamRoomRecording({
        sessionId,
        attemptNumber,
        stoppedByAdminUid: decodedToken.uid,
        reason,
    });

    return NextResponse.json({ ok: true });
}
