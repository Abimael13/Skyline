import { NextRequest, NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { applyEgressWebhookUpdate } from "@/lib/examRecording";

// ---------------------------------------------------------------------------
// Receives egress lifecycle events from LiveKit Cloud so this app can know
// - with real confirmation, not just "the start/stop request was accepted"
// - whether an exam recording actually finished uploading successfully.
// This is only reachable at all if NEXT_PUBLIC_APP_URL is a real public
// HTTPS URL when the recording is started (see lib/examRecording.ts) -
// LiveKit Cloud's servers cannot call back to http://localhost. If that
// variable isn't set to this app's real deployed URL, this endpoint simply
// never gets called, and recording status stays based only on the
// start/stop request results.
//
// The signature is verified using the same LIVEKIT_API_KEY/LIVEKIT_API_SECRET
// already configured for this app (WebhookReceiver signs/verifies with the
// same key pair used to mint tokens) - no separate webhook secret needed.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) {
        return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const body = await req.text();
    const authHeader = req.headers.get("authorization") || undefined;

    const receiver = new WebhookReceiver(apiKey, apiSecret);
    let event;
    try {
        event = await receiver.receive(body, authHeader);
    } catch (error: any) {
        console.error("Invalid LiveKit webhook signature:", error);
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    try {
        if ((event.event === "egress_ended" || event.event === "egress_updated") && event.egressInfo) {
            const info = event.egressInfo;
            await applyEgressWebhookUpdate({
                roomName: info.roomName,
                egressId: info.egressId,
                ended: event.event === "egress_ended",
                errorMessage: info.error || undefined,
            });
        }
    } catch (error) {
        // Never fail the webhook response over an internal bookkeeping
        // error - LiveKit will retry on non-2xx responses, and there's
        // nothing a retry can fix here.
        console.error("Failed to apply egress webhook update:", error);
    }

    return NextResponse.json({ ok: true });
}
