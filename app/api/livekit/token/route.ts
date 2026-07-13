import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { getFirestore } from "firebase-admin/firestore";
import { verifyIdToken, requireAdmin, getAdminApp } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
    const room = req.nextUrl.searchParams.get("room");
    const username = req.nextUrl.searchParams.get("username");
    const isAdminRequest = req.nextUrl.searchParams.get("admin") === "true";

    if (!room || !username) {
        return NextResponse.json(
            { error: 'Missing "room" or "username"' },
            { status: 400 }
        );
    }

    // The moderator/proctor token may only be issued to a verified admin.
    if (isAdminRequest) {
        try {
            await requireAdmin(req);
        } catch (error: any) {
            return NextResponse.json({ error: error.message || "Admin privileges required" }, { status: 403 });
        }
    } else {
        // Every other token requires a verified, signed-in user, and that
        // user must actually own the exam session behind this room - we
        // don't let anyone join an arbitrary proctoring room.
        let decodedToken;
        try {
            decodedToken = await verifyIdToken(req);
        } catch (error: any) {
            return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
        }

        // Proctoring rooms are named `exam-${uid}` (see components/learning/
        // ExamPortal.tsx). The room must belong to this user, and an
        // exam_sessions doc owned by them must exist (created when they
        // start proctoring).
        const expectedRoom = `exam-${decodedToken.uid}`;
        if (room !== expectedRoom) {
            return NextResponse.json(
                { error: "You are not authorized to join this room." },
                { status: 403 }
            );
        }

        const adminDb = getFirestore(getAdminApp());
        const sessionId = `${decodedToken.uid}_f89-flsd`;
        const sessionSnap = await adminDb.collection("exam_sessions").doc(sessionId).get();

        if (!sessionSnap.exists || sessionSnap.data()?.userId !== decodedToken.uid) {
            return NextResponse.json(
                { error: "No active exam session found for this user." },
                { status: 403 }
            );
        }
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
        return NextResponse.json(
            { error: "Server misconfigured" },
            { status: 500 }
        );
    }

    const at = new AccessToken(apiKey, apiSecret, {
        identity: username,
        ttl: "10m",
    });

    at.addGrant({
        roomJoin: true,
        room: room,
        canPublish: !isAdminRequest, // Students publish
        canSubscribe: isAdminRequest, // Admins subscribe
    });

    return NextResponse.json({ token: await at.toJwt() });
}
