"use client";

import { useEffect, useState } from "react";
import {
    collection,
    onSnapshot,
    addDoc,
    deleteDoc,
    updateDoc,
    doc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { COURSES } from "@/lib/courses";
import { ReviewSlot, ReviewBooking, parseEasternDateTime } from "@/lib/reviewCalls";
import { Button } from "@/components/ui/Button";
import {
    Calendar,
    Plus,
    Trash2,
    Clock,
    Video,
    User,
    ExternalLink,
    CheckCircle,
    XCircle,
    Ban,
    Loader2,
} from "lucide-react";

// Only courses that actually have a graduation exam module can have review
// calls booked for them - matches the same "exam" module type check used by
// lib/examEligibility.ts's callers elsewhere.
const REVIEWABLE_COURSES = COURSES.filter((c) => c.modules.some((m) => m.type === "exam"));

export default function ReviewSlotsManager() {
    const { user } = useAuth();
    const [slots, setSlots] = useState<ReviewSlot[]>([]);
    const [bookings, setBookings] = useState<Record<string, ReviewBooking>>({});
    const [loading, setLoading] = useState(true);

    // Form state
    const [courseId, setCourseId] = useState(REVIEWABLE_COURSES[0]?.id || "");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("10:00");
    const [duration, setDuration] = useState(20);
    const [submitting, setSubmitting] = useState(false);
    const [actionId, setActionId] = useState<string | null>(null);

    useEffect(() => {
        const unsubSlots = onSnapshot(collection(db, "reviewSlots"), (snap) => {
            const list: ReviewSlot[] = [];
            snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ReviewSlot));
            list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
            setSlots(list);
            setLoading(false);
        }, (error) => {
            console.error("Error loading review slots:", error);
            setLoading(false);
        });

        const unsubBookings = onSnapshot(collection(db, "reviewBookings"), (snap) => {
            const map: Record<string, ReviewBooking> = {};
            snap.forEach((d) => {
                map[d.id] = { id: d.id, ...d.data() } as ReviewBooking;
            });
            setBookings(map);
        }, (error) => {
            console.error("Error loading review bookings:", error);
        });

        return () => {
            unsubSlots();
            unsubBookings();
        };
    }, []);

    const handleCreateSlot = async () => {
        if (!courseId || !date || !time || !auth.currentUser) return;

        // Discourage (but don't block) picking a time in the 1:00-3:00 AM
        // Eastern window, the twice-yearly stretch where a local clock time
        // can be ambiguous (falls back) or not exist at all (springs
        // forward) - see the KNOWN LIMITATION note on parseEasternDateTime()
        // in lib/reviewCalls.ts. Nobody should be booking a review call at
        // that hour anyway, so this is just a nudge, not validation.
        const [hourStr] = time.split(":");
        const hour = Number(hourStr);
        if (hour === 1 || hour === 2) {
            const proceed = confirm(
                "Heads up: 1:00-3:00 AM Eastern is the window where daylight saving time changes can make a clock time ambiguous or skipped. Double-check this is really the intended time before continuing."
            );
            if (!proceed) return;
        }

        setSubmitting(true);
        try {
            // Always interpreted as Eastern time (where this business
            // operates), regardless of the admin's own device timezone - see
            // parseEasternDateTime() in lib/reviewCalls.ts.
            const startTime = parseEasternDateTime(date, time);
            if (Number.isNaN(startTime.getTime())) {
                alert("Please enter a valid date and time.");
                return;
            }
            if (startTime.getTime() <= Date.now()) {
                alert("Please pick a time in the future.");
                return;
            }

            await addDoc(collection(db, "reviewSlots"), {
                courseId,
                startTime: startTime.toISOString(),
                durationMinutes: duration,
                status: "open",
                createdByAdminUid: auth.currentUser.uid,
                createdByAdminName: user?.displayName || user?.email || "Admin",
                createdAt: new Date().toISOString(),
            });

            setDate("");
        } catch (error) {
            console.error("Error creating review slot:", error);
            alert("Failed to create review call slot.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteSlot = async (slotId: string) => {
        if (!confirm("Delete this open review call slot?")) return;
        setActionId(slotId);
        try {
            await deleteDoc(doc(db, "reviewSlots", slotId));
        } catch (error) {
            console.error("Error deleting review slot:", error);
            alert("Failed to delete slot.");
        } finally {
            setActionId(null);
        }
    };

    const handleMarkBookingStatus = async (bookingId: string, status: "completed" | "no-show") => {
        if (!auth.currentUser) return;
        setActionId(bookingId);
        try {
            await updateDoc(doc(db, "reviewBookings", bookingId), {
                status,
                statusUpdatedAt: new Date().toISOString(),
                statusUpdatedBy: auth.currentUser.uid,
            });
        } catch (error) {
            console.error("Error updating booking status:", error);
            alert("Failed to update status.");
        } finally {
            setActionId(null);
        }
    };

    const handleCancelBooking = async (bookingId: string) => {
        if (!confirm("Cancel this student's review call? They will be emailed and the time will reopen.")) return;
        if (!auth.currentUser) return;
        setActionId(bookingId);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const resp = await fetch("/api/admin/review-calls/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ bookingId }),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || "Failed to cancel review call.");
            alert(data.emailSent ? "Call cancelled. The student has been emailed." : "Call cancelled, but the notification email failed to send.");
        } catch (error: any) {
            console.error("Error cancelling booking:", error);
            alert(error.message || "Failed to cancel review call.");
        } finally {
            setActionId(null);
        }
    };

    if (loading) return <div className="p-12 text-center text-slate-500">Loading review call manager...</div>;

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Review Call Manager</h1>
                <p className="text-slate-400">
                    Create open time slots for 1:1 exam review calls with students who failed attempt 1 and are awaiting review.
                </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left: Create Slot Form */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-navy-900 border border-white/5 rounded-2xl p-6 shadow-xl sticky top-24">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Plus size={20} className="text-blue-500" /> Add Review Call Slot
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="review-slot-course" className="block text-xs font-semibold text-slate-400 uppercase mb-1">Course</label>
                                <select
                                    id="review-slot-course"
                                    className="w-full bg-navy-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
                                    value={courseId}
                                    onChange={(e) => setCourseId(e.target.value)}
                                >
                                    {REVIEWABLE_COURSES.map((c) => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="review-slot-date" className="block text-xs font-semibold text-slate-400 uppercase mb-1">Date</label>
                                    <input
                                        id="review-slot-date"
                                        type="date"
                                        className="w-full bg-navy-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="review-slot-time" className="block text-xs font-semibold text-slate-400 uppercase mb-1">Time (Eastern)</label>
                                    <input
                                        id="review-slot-time"
                                        type="time"
                                        className="w-full bg-navy-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 -mt-2">
                                Times are always stored and emailed to students in Eastern (ET), no matter what timezone your device is set to.
                            </p>

                            <div>
                                <label htmlFor="review-slot-duration" className="block text-xs font-semibold text-slate-400 uppercase mb-1">Duration (minutes)</label>
                                <input
                                    id="review-slot-duration"
                                    type="number"
                                    min={5}
                                    step={5}
                                    className="w-full bg-navy-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                    value={duration}
                                    onChange={(e) => setDuration(Math.max(5, Number(e.target.value)))}
                                />
                            </div>

                            <Button
                                className="w-full mt-4"
                                onClick={handleCreateSlot}
                                disabled={submitting || !date || !time || !courseId}
                            >
                                {submitting ? "Creating..." : "Add Slot"}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Right: Slot List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">All Review Call Slots</h2>
                        <div className="text-sm text-slate-400">{slots.length} total</div>
                    </div>

                    {slots.length === 0 ? (
                        <div className="bg-navy-900/50 border border-dashed border-white/10 rounded-xl p-12 text-center text-slate-500">
                            No review call slots yet. Add one on the left.
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {slots.map((slot) => {
                                const course = COURSES.find((c) => c.id === slot.courseId);
                                const booking = bookings[slot.id];
                                const start = new Date(slot.startTime);
                                const isPast = start.getTime() < Date.now();

                                return (
                                    <div key={slot.id} className="bg-navy-900 border border-white/5 rounded-xl p-5">
                                        <div className="flex justify-between items-start gap-4 flex-wrap">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <StatusBadge status={slot.status} isPast={isPast} bookingStatus={booking?.status} />
                                                    <span className="text-xs text-slate-500">{course?.title || slot.courseId}</span>
                                                </div>
                                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                    <Calendar size={18} className="text-blue-500" />
                                                    {start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                                                </h3>
                                                <div className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                                                    <Clock size={14} />
                                                    {start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                                                    <span className="text-slate-600">&middot;</span>
                                                    {slot.durationMinutes} min
                                                </div>
                                            </div>

                                            {slot.status === "open" && (
                                                <button
                                                    onClick={() => handleDeleteSlot(slot.id)}
                                                    disabled={actionId === slot.id}
                                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                    title="Delete Slot"
                                                    aria-label="Delete this review call slot"
                                                >
                                                    {actionId === slot.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                                </button>
                                            )}
                                        </div>

                                        {booking && slot.status === "booked" && (
                                            <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                                                <div className="flex items-center gap-2 text-sm text-slate-200">
                                                    <User size={14} className="text-blue-400" />
                                                    <strong>{booking.studentName}</strong>
                                                    <span className="text-slate-500">({booking.studentEmail})</span>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        href={`/admin/students/${booking.studentId}`}
                                                        target="_blank"
                                                        size="sm"
                                                        variant="outline"
                                                    >
                                                        <ExternalLink size={14} className="mr-2" /> Student Profile
                                                    </Button>
                                                    <Button
                                                        href={`/admin/review-call/${booking.id}`}
                                                        size="sm"
                                                        className="bg-blue-600 hover:bg-blue-500"
                                                    >
                                                        <Video size={14} className="mr-2" /> Open Call
                                                    </Button>
                                                    {booking.status === "booked" && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                                                                onClick={() => handleMarkBookingStatus(booking.id, "completed")}
                                                                disabled={actionId === booking.id}
                                                            >
                                                                <CheckCircle size={14} className="mr-2" /> Mark Completed
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                                                                onClick={() => handleMarkBookingStatus(booking.id, "no-show")}
                                                                disabled={actionId === booking.id}
                                                            >
                                                                <XCircle size={14} className="mr-2" /> Mark No-Show
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                                                                onClick={() => handleCancelBooking(booking.id)}
                                                                disabled={actionId === booking.id}
                                                            >
                                                                <Ban size={14} className="mr-2" /> Cancel Call
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
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

function StatusBadge({ status, isPast, bookingStatus }: { status: string; isPast: boolean; bookingStatus?: string }) {
    if (status === "booked" && bookingStatus) {
        const styles: Record<string, string> = {
            booked: "bg-blue-500/20 text-blue-300",
            completed: "bg-emerald-500/20 text-emerald-300",
            "no-show": "bg-yellow-500/20 text-yellow-300",
            cancelled: "bg-slate-500/20 text-slate-300",
        };
        return (
            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${styles[bookingStatus] || "bg-slate-500/20 text-slate-300"}`}>
                {bookingStatus.replace("-", " ")}
            </span>
        );
    }
    if (status === "cancelled") {
        return <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-500/20 text-slate-300">Cancelled</span>;
    }
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${isPast ? "bg-slate-500/20 text-slate-400" : "bg-emerald-500/20 text-emerald-300"}`}>
            {isPast ? "Past / Open" : "Open"}
        </span>
    );
}
