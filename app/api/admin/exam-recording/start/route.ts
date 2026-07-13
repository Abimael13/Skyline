import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp, requireAdmin } from "@/lib/firebaseAdmin";
import { startExamRoomRecording } from "@/lib/examRecording";
import { getExamAttemptEligibility, ExamResultRecord } from "@/lib/examEligibility";

const EXAM_ROOM_PREFIX = "exam-";

// ---------------------------------------------------------------------------
// Admin-only: start recording the proctored exam room. Called by
// components/admin/LiveProctorDashboard.tsx right when the proctor
// authorizes a session (status -> "active") - i.e. when the exam actually
// begins, not when the student merely connects to run the device/room-scan
// checks beforehand.
//
// This is deliberately best-effort from the exam's point of view: if
// recording fails to start (e.g. the recording infrastructure isn't fully
// configured yet - see lib/examRecording.ts), the proctored session still
// proceeds. The failure is recorded on the exam_sessions doc
// (recordings.{attempt}.status) so it's visible to admins, rather than
// silently pretending everything is fine or blocking a legitimate student
// from taking their exam because of an infrastructure gap.
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
    if (!uid) {
        return NextResponse.json({ error: "Exam session is missing a userId." }, { status: 400 });
    }

    // Best-effort attempt number for keying/labeling this recording (see
    // lib/examRecording.ts for why recordings are keyed by attempt). This is
    // not the authoritative attempt count - that only exists inside the
    // transaction in app/api/exam/submit/route.ts - it's only used here to
    // file the recording under the right attempt number so a later retake's
    // recording never overwrites this one's Firestore reference.
    const userSnap = await adminDb.collection("users").doc(uid).get();
    const existingResult = userSnap.data()?.examResults?.[courseId] as ExamResultRecord | undefined;
    const eligibility = getExamAttemptEligibility(existingResult);
    const attemptNumber = eligibility.eligible ? eligibility.attemptNumber : (existingResult?.attempt ?? 1);

    // Don't start a second egress if one is already running for this
    // attempt (e.g. a double click on "Authorize"). "recording_unconfirmed"
    // means the egress genuinely started (only the status write afterward
    // failed) so it counts as already-recording too - see lib/examRecording.ts.
    const existingRecording = sessionData.recordings?.[String(attemptNumber)];
    if (existingRecording?.status === "recording" || existingRecording?.status === "recording_unconfirmed") {
        return NextResponse.json({ ok: true, alreadyRecording: true });
    }

    const roomName = `${EXAM_ROOM_PREFIX}${uid}`;
    const result = await startExamRoomRecording({
        sessionId,
        roomName,
        uid,
        attemptNumber,
        startedByAdminUid: decodedToken.uid,
    });

    if (!result.ok) {
        // Not a hard error status - see the module comment above.
        return NextResponse.json({ ok: false, error: result.error });
    }

    return NextResponse.json({ ok: true, egressId: result.egressId, attemptNumber });
}
