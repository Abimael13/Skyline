"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/Button";
import { Loader2, Video, User, ExternalLink, ArrowLeft, Clock, Eye } from "lucide-react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import {
    ReviewBooking,
    getReviewCallRoomName,
    getReviewCallJoinWindow,
    isWithinJoinWindow,
} from "@/lib/reviewCalls";
import { COURSES } from "@/lib/courses";

interface ExamSubmission {
    courseId: string;
    submittedAt: string;
    answers: Record<string, number>;
}

// Admin-side join UI for a 1:1 post-exam review call, plus a "what they
// missed" reference panel pulled from the same examSubmissions data
// app/admin/students/[studentId]/page.tsx already shows, so an admin doesn't
// have to alt-tab to a second screen to remember what the conversation is
// about. The full student profile (grading history, Approve Retake action)
// stays a separate, deliberate click away - that decision belongs on its
// own page, after the call, not bundled into this one.
export function ReviewCallAdminView({ bookingId }: { bookingId: string }) {
    const { user } = useAuth();
    const [booking, setBooking] = useState<ReviewBooking | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [submission, setSubmission] = useState<ExamSubmission | null>(null);
    const [token, setToken] = useState("");
    const [tokenError, setTokenError] = useState<string | null>(null);
    const [now, setNow] = useState(new Date());
    const [revealedIdx, setRevealedIdx] = useState<Set<number>>(new Set());

    useEffect(() => {
        const unsub = onSnapshot(
            doc(db, "reviewBookings", bookingId),
            (snap) => {
                if (!snap.exists()) {
                    setNotFound(true);
                    return;
                }
                setBooking({ id: snap.id, ...snap.data() } as ReviewBooking);
            },
            () => setNotFound(true)
        );
        return () => unsub();
    }, [bookingId]);

    useEffect(() => {
        if (!booking) return;
        const fetchSubmission = async () => {
            try {
                const attempt = booking.failedAttemptNumber || 1;
                const subRef = doc(db, "users", booking.studentId, "examSubmissions", `${booking.courseId}_attempt${attempt}`);
                const snap = await getDoc(subRef);
                if (snap.exists()) {
                    setSubmission(snap.data() as ExamSubmission);
                }
            } catch (error) {
                console.error("Error fetching exam submission for review call:", error);
            }
        };
        fetchSubmission();
    }, [booking]);

    // Re-evaluate the join window periodically so this view reacts
    // automatically as the scheduled time approaches/passes, matching the
    // student-facing page (app/portal/review-call/[bookingId]/page.tsx).
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 15000);
        return () => clearInterval(interval);
    }, []);

    const canJoin = booking ? isWithinJoinWindow(booking.startTime, booking.durationMinutes, now) : false;

    // Client-side time-window pre-check, mirroring the student-facing page -
    // without this, an admin opening the call page outside the allowed
    // window would request a token the server correctly rejects, but with no
    // UI feedback at all (just a console.error), leaving them staring at an
    // unexplained "Connecting..." forever.
    useEffect(() => {
        if (!booking || booking.status !== "booked" || !canJoin || !user || token) return;
        const fetchToken = async () => {
            try {
                const idToken = await user.getIdToken();
                const roomName = getReviewCallRoomName(booking.id);
                const resp = await fetch(
                    `/api/livekit/token?room=${roomName}&username=${encodeURIComponent(user.displayName || "Admin")}&admin=true`,
                    { headers: { Authorization: `Bearer ${idToken}` } }
                );
                const data = await resp.json();
                if (data.token) {
                    setToken(data.token);
                } else {
                    console.error("Failed to get review call token:", data);
                    setTokenError(data.error || "Couldn't connect to this call. Try refreshing the page.");
                }
            } catch (error) {
                console.error("Failed to get admin review call token:", error);
                setTokenError("Couldn't connect to this call. Try refreshing the page.");
            }
        };
        fetchToken();
    }, [booking, canJoin, user, token]);

    if (notFound) {
        return <div className="p-12 text-center text-slate-500">Review call not found.</div>;
    }

    if (!booking) {
        return (
            <div className="p-12 flex justify-center">
                <Loader2 className="animate-spin text-blue-500" />
            </div>
        );
    }

    const course = COURSES.find((c) => c.id === booking.courseId);
    const courseTitle = course?.title || booking.courseId.toUpperCase();
    const examModule = course?.modules.find((m) => m.type === "exam");
    const questions = examModule?.content?.questions || [];
    const missedQuestions = submission
        ? questions
            .map((q, idx) => ({ q, idx, studentAnswer: submission.answers[idx] }))
            .filter(({ q, studentAnswer }) => studentAnswer !== q.correctIndex)
        : [];

    return (
        <div className="space-y-6">
            <Button href="/admin/review-slots" variant="outline" size="sm">
                <ArrowLeft size={16} className="mr-2" /> Back to Review Calls
            </Button>

            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Video className="text-blue-500" /> Review Call with {booking.studentName}
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {courseTitle} &middot; Attempt {booking.failedAttemptNumber} &middot;{" "}
                        {new Date(booking.startTime).toLocaleString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                        })}
                    </p>
                </div>
                <Button href={`/admin/students/${booking.studentId}`} target="_blank" variant="outline" size="sm">
                    <ExternalLink size={14} className="mr-2" /> Full Student Profile
                </Button>
            </div>

            {booking.status !== "booked" && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-sm text-yellow-300">
                    This call is marked <strong>{booking.status.replace("-", " ")}</strong>. Video is disabled - update it from the Review Call Manager if that's not right.
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-black rounded-2xl overflow-hidden border border-white/10" style={{ minHeight: 480 }}>
                    {booking.status !== "booked" ? (
                        <div className="h-full flex items-center justify-center text-slate-500 p-12 text-center text-sm">
                            This call is not currently active.
                        </div>
                    ) : !canJoin ? (
                        <ReviewCallWaitPanel booking={booking} now={now} />
                    ) : tokenError ? (
                        <div className="h-full flex flex-col items-center justify-center text-center gap-3 p-12">
                            <p className="text-red-400 text-sm">{tokenError}</p>
                            <Button size="sm" variant="outline" onClick={() => setTokenError(null)}>
                                Try Again
                            </Button>
                        </div>
                    ) : token ? (
                        <LiveKitRoom
                            video
                            audio
                            token={token}
                            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                            connect={true}
                            data-lk-theme="default"
                            style={{ height: "100%", minHeight: 480 }}
                        >
                            <VideoConference />
                        </LiveKitRoom>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 p-12 text-center">
                            <Loader2 className="animate-spin" />
                            <span>Connecting...</span>
                            <p className="text-xs text-slate-600 max-w-xs">
                                This call uses your camera and microphone. Your browser will ask for permission in a moment.
                            </p>
                        </div>
                    )}
                </div>

                <div className="bg-navy-900 border border-white/5 rounded-2xl p-6 max-h-[600px] overflow-y-auto">
                    <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                        <User size={16} className="text-blue-500" /> What They Missed
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                        Reference during the call - a guide for the conversation, not a script to read off.
                    </p>

                    {!submission ? (
                        <p className="text-sm text-slate-500 italic">No submission record found for this attempt.</p>
                    ) : questions.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">No question data available for this course.</p>
                    ) : missedQuestions.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">No missed questions found on record for this attempt.</p>
                    ) : (
                        <div className="space-y-3">
                            {missedQuestions.map(({ q, idx, studentAnswer }) => {
                                const isRevealed = revealedIdx.has(idx);
                                return (
                                    <div key={idx} className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-sm">
                                        <p className="font-medium text-white mb-2">Q{idx + 1}. {q.text}</p>
                                        <p className="text-red-300 mb-2">Answered: {q.options[studentAnswer] ?? "No answer"}</p>
                                        {isRevealed ? (
                                            <p className="text-emerald-400">Correct: {q.options[q.correctIndex]}</p>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setRevealedIdx((prev) => {
                                                        const next = new Set(prev);
                                                        next.add(idx);
                                                        return next;
                                                    })
                                                }
                                                className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 uppercase tracking-wide"
                                            >
                                                <Eye size={12} /> Reveal correct answer
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Shown in place of the video area while a call is confirmed but the join
// window (lib/reviewCalls.ts) hasn't opened yet, or has already closed -
// without this, an admin opening the page early/late previously just sat on
// an unexplained "Connecting..." forever, since the server silently rejects
// the token request outside the window. Mirrors the student-facing gate
// screen in app/portal/review-call/[bookingId]/page.tsx.
function ReviewCallWaitPanel({ booking, now }: { booking: ReviewBooking; now: Date }) {
    const start = new Date(booking.startTime);
    const { closesAt } = getReviewCallJoinWindow(booking.startTime, booking.durationMinutes);
    const hasClosed = now > closesAt;

    return (
        <div className="h-full flex flex-col items-center justify-center text-center gap-3 p-12">
            <Clock className="text-slate-600" size={28} />
            <p className="text-slate-300 text-sm">
                Scheduled for{" "}
                <strong className="text-white">
                    {start.toLocaleString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                    })}
                </strong>
            </p>
            {hasClosed ? (
                <p className="text-red-400 text-sm">This call's join window has closed.</p>
            ) : (
                <p className="text-slate-500 text-sm">The call opens a few minutes before the scheduled time.</p>
            )}
            <p className="text-xs text-slate-600 max-w-xs">
                This call uses your camera and microphone. Your browser will ask for permission when the call opens.
            </p>
        </div>
    );
}
