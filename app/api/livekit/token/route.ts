import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { getFirestore } from "firebase-admin/firestore";
import { verifyIdToken, requireAdmin, getAdminApp } from "@/lib/firebaseAdmin";
import { isWithinJoinWindow } from "@/lib/reviewCalls";

const EXAM_ROOM_PREFIX = "exam-";
const REVIEW_ROOM_PREFIX = "review-";

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

    // Two kinds of video room exist in this app, each with its own
    // ownership/authorization rule and its own publish/subscribe grants:
    //   - graduation exam proctoring (`exam-${uid}`): one student + any
    //     verified admin proctor, student publish-only / admin
    //     subscribe-only (see components/learning/ExamPortal.tsx,
    //     components/admin/LiveProctorDashboard.tsx).
    //   - post-exam review calls (`review-${bookingId}`): one specific
    //     student + one verified admin, a real two-way conversation, so
    //     both sides publish AND subscribe (see lib/reviewCalls.ts,
    //     components/portal/ReviewCallPortal.tsx,
    //     components/admin/ReviewCallAdminView.tsx).
    // Anything that isn't one of these two known prefixes is rejected
    // outright rather than silently issuing a token for an arbitrary room
    // name.
    let canPublish: boolean;
    let canSubscribe: boolean;

    if (room.startsWith(EXAM_ROOM_PREFIX)) {
        // The moderator/proctor token may only be issued to a verified admin.
        if (isAdminRequest) {
            try {
                await requireAdmin(req);
            } catch (error: any) {
                return NextResponse.json({ error: error.message || "Admin privileges required" }, { status: 403 });
            }
        } else {
            // Every other token requires a verified, signed-in user, and
            // that user must actually own the exam session behind this
            // room - we don't let anyone join an arbitrary proctoring room.
            let decodedToken;
            try {
                decodedToken = await verifyIdToken(req);
            } catch (error: any) {
                return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
            }

            const expectedRoom = `${EXAM_ROOM_PREFIX}${decodedToken.uid}`;
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

        canPublish = !isAdminRequest; // Students publish
        canSubscribe = isAdminRequest; // Admins subscribe
    } else if (room.startsWith(REVIEW_ROOM_PREFIX)) {
        const bookingId = room.slice(REVIEW_ROOM_PREFIX.length);
        if (!bookingId) {
            return NextResponse.json({ error: "Invalid review call room." }, { status: 400 });
        }

        // Authenticate the caller BEFORE ever touching Firestore for this
        // booking - mirrors the exam-* branch above exactly, so an
        // unauthenticated caller can't learn anything about whether/how a
        // booking exists (does it exist? is it cancelled? is it active?)
        // just by hitting this endpoint with no credentials.
        let decodedToken: Awaited<ReturnType<typeof verifyIdToken>> | undefined;
        if (isAdminRequest) {
            try {
                await requireAdmin(req);
            } catch (error: any) {
                return NextResponse.json({ error: error.message || "Admin privileges required" }, { status: 403 });
            }
        } else {
            try {
                decodedToken = await verifyIdToken(req);
            } catch (error: any) {
                return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
            }
        }

        const adminDb = getFirestore(getAdminApp());
        const bookingSnap = await adminDb.collection("reviewBookings").doc(bookingId).get();

        if (!bookingSnap.exists) {
            return NextResponse.json({ error: "This review call could not be found." }, { status: 404 });
        }
        const booking = bookingSnap.data()!;

        if (booking.status !== "booked") {
            return NextResponse.json({ error: "This review call is no longer active." }, { status: 403 });
        }

        if (!isAdminRequest) {
            // Only the specific student who booked this slot may join as
            // the student side - never any other signed-in student.
            if (booking.studentId !== decodedToken!.uid) {
                return NextResponse.json(
                    { error: "You are not authorized to join this review call." },
                    { status: 403 }
                );
            }
        }

        // Real server-side time gating, not just a UI convenience - a
        // token cannot be minted outside the join window, using the exact
        // same window definition the client UI reads from
        // lib/reviewCalls.ts, so the two never disagree.
        if (!isWithinJoinWindow(booking.startTime, booking.durationMinutes)) {
            return NextResponse.json(
                { error: "This review call isn't open to join yet. You can join a few minutes before the scheduled time." },
                { status: 403 }
            );
        }

        // Unlike exam proctoring, a review call is a real two-way
        // conversation - both sides publish and subscribe.
        canPublish = true;
        canSubscribe = true;
    } else {
        return NextResponse.json({ error: "Unknown room." }, { status: 400 });
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
        canPublish,
        canSubscribe,
    });

    return NextResponse.json({ token: await at.toJwt() });
}
