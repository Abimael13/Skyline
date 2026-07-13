"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/Button";
import { Loader2, Video, ArrowLeft, Clock } from "lucide-react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import {
    ReviewBooking,
    getReviewCallRoomName,
    getReviewCallJoinWindow,
    isWithinJoinWindow,
} from "@/lib/reviewCalls";

type Params = Promise<{ bookingId: string }>;

export default function ReviewCallPage(props: { params: Params }) {
    const { bookingId } = use(props.params);
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [booking, setBooking] = useState<ReviewBooking | null>(null);
    const [notFoundOrDenied, setNotFoundOrDenied] = useState(false);
    const [token, setToken] = useState("");
    const [tokenError, setTokenError] = useState<string | null>(null);
    const [now, setNow] = useState(new Date());

    // Real-time listener on the booking - if an admin cancels or marks it
    // complete/no-show mid-session, this reflects immediately.
    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(
            doc(db, "reviewBookings", bookingId),
            (snap) => {
                if (!snap.exists()) {
                    setNotFoundOrDenied(true);
                    return;
                }
                const data = { id: snap.id, ...snap.data() } as ReviewBooking;
                if (data.studentId !== user.uid) {
                    setNotFoundOrDenied(true);
                    return;
                }
                setBooking(data);
            },
            () => setNotFoundOrDenied(true)
        );
        return () => unsub();
    }, [user, bookingId]);

    // Re-evaluate the join window periodically so the "join" button enables
    // itself automatically as the scheduled time approaches, with no manual
    // refresh needed.
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 15000);
        return () => clearInterval(interval);
    }, []);

    const canJoin = booking ? isWithinJoinWindow(booking.startTime, booking.durationMinutes, now) : false;

    // Extracted so the "Try Again" button below can call this directly on a
    // genuine token-fetch failure (unrelated to join-window timing), not
    // just clear the error message and leave the student stuck waiting on
    // an effect that won't re-run - matches the pattern used by the
    // admin-side equivalent, components/admin/ReviewCallAdminView.tsx.
    const fetchToken = useCallback(async () => {
        if (!booking || !user) return;
        try {
            const idToken = await user.getIdToken();
            const roomName = getReviewCallRoomName(booking.id);
            const resp = await fetch(
                `/api/livekit/token?room=${roomName}&username=${encodeURIComponent(user.displayName || user.email || "Student")}`,
                { headers: { Authorization: `Bearer ${idToken}` } }
            );
            const data = await resp.json();
            if (data.token) {
                setToken(data.token);
                setTokenError(null);
            } else {
                console.error("Failed to get review call token:", data);
                setTokenError(data.error || "Couldn't connect to this call. Please try again.");
            }
        } catch (error) {
            console.error("Failed to get review call token:", error);
            setTokenError("Couldn't connect to this call. Please try again.");
        }
    }, [booking, user]);

    useEffect(() => {
        if (!booking || booking.status !== "booked" || !canJoin || !user || token || tokenError) return;
        fetchToken();
    }, [booking, canJoin, user, token, tokenError, fetchToken]);

    if (authLoading || (!booking && !notFoundOrDenied)) {
        return (
            <div className="min-h-screen bg-navy-950 flex items-center justify-center text-blue-500">
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    if (notFoundOrDenied || !booking) {
        return (
            <div className="min-h-screen bg-navy-950 flex items-center justify-center p-8 text-center text-white">
                <div className="max-w-md bg-navy-900 border border-white/10 p-8 rounded-3xl">
                    <h2 className="text-2xl font-bold mb-4">Review Call Not Found</h2>
                    <p className="text-slate-400 mb-8">This review call doesn't exist, or isn't yours to join.</p>
                    <Button onClick={() => router.push("/portal/dashboard")} className="w-full">
                        Return to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    if (booking.status === "cancelled") {
        return (
            <div className="min-h-screen bg-navy-950 flex items-center justify-center p-8 text-center text-white">
                <div className="max-w-md bg-navy-900 border border-red-500/30 p-8 rounded-3xl">
                    <h2 className="text-2xl font-bold mb-4">This Review Call Was Cancelled</h2>
                    <p className="text-slate-400 mb-8">Check your email for details, or reach out to our team to find a new time.</p>
                    <Button onClick={() => router.push("/portal/dashboard")} className="w-full">
                        Return to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    if (booking.status === "completed" || booking.status === "no-show") {
        return (
            <div className="min-h-screen bg-navy-950 flex items-center justify-center p-8 text-center text-white">
                <div className="max-w-md bg-navy-900 border border-white/10 p-8 rounded-3xl">
                    <h2 className="text-2xl font-bold mb-4">This Review Call Has Ended</h2>
                    <p className="text-slate-400 mb-8">This call has already taken place. Reach out to our team if you have questions.</p>
                    <Button onClick={() => router.push("/portal/dashboard")} className="w-full">
                        Return to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    if (canJoin && tokenError) {
        return (
            <div className="min-h-screen bg-navy-950 flex items-center justify-center p-8 text-center text-white">
                <div className="max-w-md bg-navy-900 border border-white/10 p-8 rounded-3xl">
                    <div className="w-16 h-16 bg-red-600/20 rounded-2xl mx-auto flex items-center justify-center mb-6">
                        <Video size={32} className="text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Couldn&apos;t Connect</h2>
                    <p className="text-slate-400 mb-8">{tokenError}</p>
                    <div className="flex flex-col gap-3">
                        <Button onClick={() => fetchToken()} className="w-full">
                            Try Again
                        </Button>
                        <Button onClick={() => router.push("/portal/dashboard")} variant="outline" className="w-full">
                            <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (!canJoin || !token) {
        const start = new Date(booking.startTime);
        const { closesAt } = getReviewCallJoinWindow(booking.startTime, booking.durationMinutes);
        const hasClosed = now > closesAt;

        return (
            <div className="min-h-screen bg-navy-950 flex items-center justify-center p-8 text-center text-white">
                <div className="max-w-md bg-navy-900 border border-white/10 p-8 rounded-3xl">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-6">
                        <Video size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Review Call</h2>
                    <p className="text-slate-400 mb-2">
                        Scheduled for{" "}
                        <strong className="text-white">
                            {start.toLocaleString(undefined, {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                            })}
                        </strong>
                    </p>
                    {hasClosed ? (
                        <p className="text-red-400 text-sm mb-4">This call's join window has closed. Contact our team if you still need to connect.</p>
                    ) : (
                        <p className="text-slate-500 text-sm mb-4 flex items-center justify-center gap-2">
                            <Clock size={14} /> You can join a few minutes before the scheduled time.
                        </p>
                    )}
                    <p className="text-xs text-slate-500 mb-2">
                        This call uses your camera and microphone. Your browser will ask for permission when you join.
                    </p>
                    <p className="text-xs text-slate-500 mb-8">
                        This is a live conversation only. It is not recorded.
                    </p>
                    <Button onClick={() => router.push("/portal/dashboard")} variant="outline" className="w-full">
                        <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-navy-950 relative">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-black/70 backdrop-blur border border-white/10 rounded-full px-4 py-1.5 text-xs text-slate-300">
                Live conversation only. Not recorded.
            </div>
            <LiveKitRoom
                video
                audio
                token={token}
                serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                connect={!!token}
                data-lk-theme="default"
                style={{ height: "100%" }}
                onDisconnected={() => router.push("/portal/dashboard")}
            >
                <VideoConference />
            </LiveKitRoom>
        </div>
    );
}
