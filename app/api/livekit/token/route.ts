import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function GET(req: NextRequest) {
    const room = req.nextUrl.searchParams.get("room");
    const username = req.nextUrl.searchParams.get("username");
    const admin = req.nextUrl.searchParams.get("admin");

    if (!room || !username) {
        return NextResponse.json(
            { error: 'Missing "room" or "username"' },
            { status: 400 }
        );
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
        canPublish: admin !== "true", // Students publish
        canSubscribe: admin === "true", // Admins subscribe
    });

    return NextResponse.json({ token: await at.toJwt() });
}
