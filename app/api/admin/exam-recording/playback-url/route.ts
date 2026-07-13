import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/firebaseAdmin";
import { getExamRecordingPlaybackUrl } from "@/lib/examRecording";

// ---------------------------------------------------------------------------
// Admin-only: generate a short-lived (1 hour) signed URL to view a completed
// exam recording. Used from app/admin/students/[studentId]/page.tsx. A
// student can never reach this route for their own or anyone else's
// recording - it requires the `admin` custom claim (see requireAdmin in
// lib/firebaseAdmin.ts), the same server-side check every other admin-only
// route in this app uses. Nothing about exam recordings is ever exposed to
// a student-facing page or API route.
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
    try {
        await requireAdmin(req);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Admin privileges required" }, { status: 403 });
    }

    const sessionId = req.nextUrl.searchParams.get("sessionId");
    const attemptParam = req.nextUrl.searchParams.get("attempt");
    if (!sessionId) {
        return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });
    }
    const attemptNumber = attemptParam ? parseInt(attemptParam, 10) : 1;
    if (!Number.isFinite(attemptNumber) || attemptNumber < 1) {
        return NextResponse.json({ error: "Invalid attempt number." }, { status: 400 });
    }

    const result = await getExamRecordingPlaybackUrl({ sessionId, attemptNumber });
    if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json({ url: result.url });
}
