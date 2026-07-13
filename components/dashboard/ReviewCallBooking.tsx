"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { ReviewSlot, ReviewBooking, isWithinJoinWindow } from "@/lib/reviewCalls";
import { Button } from "@/components/ui/Button";
import { Calendar, Clock, Video, Loader2, CheckCircle2 } from "lucide-react";

interface Props {
    courseId: string;
    // Whether the student is currently allowed to book a NEW slot - true
    // only while genuinely sitting in the failed-attempt-1-awaiting-review
    // state (see app/portal/dashboard/page.tsx and lib/examEligibility.ts).
    // An EXISTING confirmed booking is always shown regardless of this flag
    // - once an admin approves a retake, the student moves out of
    // "awaiting-review" (so the "browse open slots" list correctly
    // disappears), but if they already booked a review call before that
    // happened, they must still be able to see and join it. The real
    // eligibility gate lives server-side in
    // app/api/review-calls/book/route.ts regardless of what this prop is
    // set to - this only controls what the UI offers.
    canBookNew: boolean;
}

// Shown on the dashboard for a student who failed attempt 1 (see
// app/portal/dashboard/page.tsx and lib/examEligibility.ts). Lets them
// optionally book a 1:1 review call with an admin - this is a real teaching
// conversation about what they missed, not the same thing as being cleared
// for a retake, and doesn't affect whether/when a retake gets approved.
export function ReviewCallBooking({ courseId, canBookNew }: Props) {
    const { user } = useAuth();
    const [openSlots, setOpenSlots] = useState<ReviewSlot[]>([]);
    const [myBooking, setMyBooking] = useState<ReviewBooking | null>(null);
    const [loading, setLoading] = useState(true);
    const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        setLoading(true);

        // Only subscribed to when new bookings are actually offered - a
        // student who isn't currently allowed to book (e.g. already
        // cleared for a retake) has no use for the open-slots list, even
        // though their own existing booking (below) is always watched.
        let unsubSlots = () => {};
        if (canBookNew) {
            unsubSlots = onSnapshot(
                query(
                    collection(db, "reviewSlots"),
                    where("courseId", "==", courseId),
                    where("status", "==", "open")
                ),
                (snap) => {
                    const list: ReviewSlot[] = [];
                    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ReviewSlot));
                    const upcoming = list.filter((s) => new Date(s.startTime).getTime() > Date.now());
                    upcoming.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                    setOpenSlots(upcoming);
                },
                (err) => console.error("Error loading review slots:", err)
            );
        } else {
            setOpenSlots([]);
        }

        // Single-field query (studentId only), filtered client-side for
        // this course + active status - see app/api/review-calls/book/route.ts
        // for why a single-field query is deliberately used here.
        const bookingsQ = query(collection(db, "reviewBookings"), where("studentId", "==", user.uid));
        const unsubBookings = onSnapshot(
            bookingsQ,
            (snap) => {
                let found: ReviewBooking | null = null;
                snap.forEach((d) => {
                    const data = { id: d.id, ...d.data() } as ReviewBooking;
                    if (data.courseId === courseId && data.status === "booked") found = data;
                });
                setMyBooking(found);
                setLoading(false);
            },
            (err) => {
                console.error("Error loading my review bookings:", err);
                setLoading(false);
            }
        );

        return () => {
            unsubSlots();
            unsubBookings();
        };
    }, [user, courseId, canBookNew]);

    const handleBook = async (slotId: string) => {
        if (!auth.currentUser) return;
        if (!confirm("Book this review call time? You'll get a confirmation email with the details.")) return;

        setBookingSlotId(slotId);
        setError(null);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const resp = await fetch("/api/review-calls/book", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ slotId }),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || "Failed to book this slot.");
        } catch (e: any) {
            setError(e.message || "Failed to book this slot.");
        } finally {
            setBookingSlotId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-3">
                <Loader2 size={14} className="animate-spin" /> Checking for available review call times...
            </div>
        );
    }

    if (myBooking) {
        const canJoinNow = isWithinJoinWindow(myBooking.startTime, myBooking.durationMinutes);
        const start = new Date(myBooking.startTime);
        return (
            <div className="mt-3 flex items-start gap-2 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 max-w-md">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <div className="space-y-2 w-full">
                    <p>
                        Your review call is booked for{" "}
                        <strong>
                            {start.toLocaleString(undefined, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                            })}
                        </strong>
                        . We'll go over what you missed on your first attempt together - a real conversation, not just an answer sheet.
                    </p>
                    <p className="text-xs text-emerald-400/80">
                        This call is a live conversation only. It is not recorded.
                    </p>
                    <Button
                        href={`/portal/review-call/${myBooking.id}`}
                        size="sm"
                        className={canJoinNow ? "bg-emerald-600 hover:bg-emerald-500 border-emerald-500" : ""}
                        variant={canJoinNow ? "primary" : "outline"}
                    >
                        <Video size={14} className="mr-2" /> {canJoinNow ? "Join Call" : "View Call Details"}
                    </Button>
                </div>
            </div>
        );
    }

    // No existing booking, and this student isn't currently allowed to book
    // a new one (e.g. already cleared for a retake, or exhausted their
    // attempts) - the dashboard's other messaging already covers their
    // actual state, so this component has nothing useful to add.
    if (!canBookNew) {
        return null;
    }

    if (openSlots.length === 0) {
        return (
            <p className="mt-3 text-xs text-slate-500 max-w-md">
                No review call times are open yet. Our team will add times soon - check back, or reach out using the contact details above.
            </p>
        );
    }

    return (
        <div className="mt-3 space-y-2 max-w-md">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Video size={12} /> Book a Review Call (Optional)
            </p>
            <p className="text-xs text-slate-500">
                Talk through what you missed with one of our instructors before your retake is decided. This is optional and separate from your retake approval.
            </p>
            <p className="text-xs text-slate-500">
                This is a live conversation only. It is not recorded.
            </p>
            <div className="grid gap-2">
                {openSlots.slice(0, 6).map((slot) => {
                    const start = new Date(slot.startTime);
                    return (
                        <button
                            key={slot.id}
                            onClick={() => handleBook(slot.id)}
                            disabled={bookingSlotId !== null}
                            className="flex items-center justify-between bg-navy-950/50 border border-white/10 hover:border-blue-500/40 rounded-lg px-4 py-2.5 text-left transition-all disabled:opacity-50"
                        >
                            <span className="flex items-center gap-2 text-sm text-slate-200">
                                <Calendar size={14} className="text-blue-400" />
                                {start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                                <Clock size={14} className="text-blue-400 ml-1" />
                                {start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                                <span className="text-slate-500">({slot.durationMinutes} min)</span>
                            </span>
                            {bookingSlotId === slot.id ? (
                                <Loader2 size={14} className="animate-spin text-blue-400" />
                            ) : (
                                <span className="text-xs font-bold text-blue-400 uppercase">Book</span>
                            )}
                        </button>
                    );
                })}
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
    );
}
