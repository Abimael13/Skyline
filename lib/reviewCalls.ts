// Shared types + pure helpers for the post-exam review call feature: after a
// student fails attempt 1 of a graduation exam (see lib/examEligibility.ts
// for that state machine), they can optionally book a 1:1 video call with an
// admin to talk through what they missed, before any retake decision is
// made. This is deliberately separate from - and happens before -
// app/api/admin/approve-retake/route.ts.
//
// Two Firestore collections model this (see firestore.rules for the access
// rules that enforce the boundaries described here):
//
//   reviewSlots/{slotId}    - admin-created inventory of open time slots.
//     Created/edited/deleted directly by an admin via the client SDK
//     (isAdmin() in firestore.rules), the same pattern
//     app/admin/schedule/page.tsx already uses for `sessions`. A slot's
//     `status` only ever moves open -> booked (a student booking it,
//     server-side - see app/api/review-calls/book/route.ts) or
//     open/booked -> cancelled/open again (an admin cancelling a booking -
//     see app/api/admin/review-calls/cancel/route.ts).
//
//   reviewBookings/{bookingId}  - the reservation record for a booked slot.
//     The doc ID is always IDENTICAL to the reviewSlots doc ID it books - a
//     review call is strictly 1:1 (one student, one admin, one slot), so
//     reusing the slot's own ID as the booking's ID means "does this slot
//     have a booking" is a single cheap document lookup (no query needed),
//     and the data model itself guarantees at most one booking can ever
//     exist per slot. Created only inside the booking transaction in
//     app/api/review-calls/book/route.ts (Admin SDK, bypasses
//     firestore.rules) - a client can never create one directly.
//
// The LiveKit room for a given booking is always named
// `review-${bookingId}` (mirrors the exam proctoring room's `exam-${uid}`
// convention in components/learning/ExamPortal.tsx) - see
// app/api/livekit/token/route.ts for how a token for this room is only ever
// issued to the student who owns the booking, or a verified admin, and only
// inside the join window defined below.

export type ReviewSlotStatus = "open" | "booked" | "cancelled";
export type ReviewBookingStatus = "booked" | "completed" | "no-show" | "cancelled";

export interface ReviewSlot {
    id: string;
    courseId: string;
    startTime: string; // ISO
    durationMinutes: number;
    status: ReviewSlotStatus;
    createdByAdminUid: string;
    createdByAdminName: string;
    createdAt: string; // ISO
}

export interface ReviewBooking {
    id: string; // === the reviewSlots doc ID it books
    slotId: string; // denormalized copy of id, kept for query/display convenience
    courseId: string;
    startTime: string; // ISO, copied from the slot at booking time
    durationMinutes: number;
    studentId: string;
    studentName: string;
    studentEmail: string;
    // Which failed attempt this call is reviewing (1, since a review call
    // only ever happens in the failed-attempt-1-awaiting-review state - see
    // lib/examEligibility.ts). Stored explicitly rather than re-derived so
    // the admin call view knows exactly which examSubmissions doc to pull
    // up even if the student's examResults change later.
    failedAttemptNumber: number;
    adminUid: string; // the admin who created the slot being booked
    status: ReviewBookingStatus;
    bookedAt: string; // ISO
    statusUpdatedAt?: string;
    statusUpdatedBy?: string; // admin uid - set on completed/no-show/cancelled
}

export function getReviewCallRoomName(bookingId: string): string {
    return `review-${bookingId}`;
}

// How early a participant may join before the scheduled start, and how long
// after the scheduled start the room stays reachable at all before it's
// treated as over. Both sides (components/portal/ReviewCallPortal.tsx,
// components/admin/ReviewCallAdminView.tsx) and the server
// (app/api/livekit/token/route.ts) import these same constants/helpers so
// the UI never promises a join window the server won't actually honor.
export const JOIN_WINDOW_MINUTES_BEFORE = 10;
export const JOIN_WINDOW_MINUTES_AFTER_END = 60; // grace period past scheduled end before the room closes

export function getReviewCallJoinWindow(
    startTime: string,
    durationMinutes: number
): { opensAt: Date; closesAt: Date } {
    const start = new Date(startTime);
    const opensAt = new Date(start.getTime() - JOIN_WINDOW_MINUTES_BEFORE * 60_000);
    const closesAt = new Date(start.getTime() + (durationMinutes + JOIN_WINDOW_MINUTES_AFTER_END) * 60_000);
    return { opensAt, closesAt };
}

export function isWithinJoinWindow(startTime: string, durationMinutes: number, now: Date = new Date()): boolean {
    const { opensAt, closesAt } = getReviewCallJoinWindow(startTime, durationMinutes);
    return now >= opensAt && now <= closesAt;
}

// This business operates out of NYC, so every review call slot is meant to
// be entered and stored as an Eastern-time instant regardless of what
// timezone the admin's own device happens to be set to - the counterpart to
// formatEasternDateTime() in lib/email-templates.ts, which always DISPLAYS
// times in Eastern. Without this, `new Date(`${date}T${time}`)` (what the
// admin slot-creation form used to do) is interpreted in the browser's local
// timezone, so an admin working from a non-Eastern device would silently
// create a slot at the wrong real-world instant while the (correctly
// Eastern-formatted) confirmation email confidently tells the student a
// different, wrong time.
//
// There's no timezone library in this project's dependencies, so this uses
// the standard Intl-based technique for converting a "wall clock time in a
// named zone" to a real UTC instant: format a candidate instant back out in
// the target zone, measure the drift, and correct for it. Two passes handles
// the (rare) case where the correction itself crosses a DST boundary.
function getTimeZoneOffsetMs(instant: Date, timeZone: string): number {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).formatToParts(instant);

    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
    const asUtc = Date.UTC(
        get("year"),
        get("month") - 1,
        get("day"),
        get("hour"),
        get("minute"),
        get("second")
    );
    return asUtc - instant.getTime();
}

// Parses a `<input type="date">` value ("YYYY-MM-DD") and `<input
// type="time">` value ("HH:MM") as a wall-clock time in America/New_York and
// returns the real UTC instant it refers to. Returns an invalid Date (mirrors
// `new Date(NaN)`) if either input is malformed.
//
// KNOWN LIMITATION - DST transition edge cases: this does not detect or flag
// the two narrow windows, twice a year, where a local Eastern wall-clock time
// isn't well-defined: the "spring forward" gap (a local time like 2:30 AM
// that never occurs, since clocks jump from 1:59:59 to 3:00:00) and the "fall
// back" repeat (a local time like 1:30 AM that occurs twice, once before and
// once after clocks roll back). The Intl-based offset lookup below will
// silently resolve either case to *some* plausible-looking instant rather
// than erroring or flagging the ambiguity - it's just not guaranteed to be
// the one a human meant. In practice nobody books/creates a 1:00-3:00 AM
// review call slot, so this is a low-risk, deliberately-not-hardened edge
// case rather than an oversight; see the lightweight same-window warning on
// the admin slot-creation form (app/admin/review-slots/page.tsx) for the
// only mitigation currently in place.
export function parseEasternDateTime(date: string, time: string): Date {
    const naive = new Date(`${date}T${time}:00.000Z`);
    if (Number.isNaN(naive.getTime())) return naive;

    const timeZone = "America/New_York";
    const offset = getTimeZoneOffsetMs(naive, timeZone);
    let utcMs = naive.getTime() - offset;

    // Re-derive the offset from the corrected instant in case the first
    // guess landed on the wrong side of a DST transition.
    const offset2 = getTimeZoneOffsetMs(new Date(utcMs), timeZone);
    if (offset2 !== offset) {
        utcMs = naive.getTime() - offset2;
    }

    return new Date(utcMs);
}
