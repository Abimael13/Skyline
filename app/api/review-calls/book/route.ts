import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp, verifyIdToken } from "@/lib/firebaseAdmin";
import { getExamAttemptEligibility, ExamResultRecord } from "@/lib/examEligibility";
import { ReviewBooking } from "@/lib/reviewCalls";
import { sendReviewCallBookedEmail } from "@/lib/email";
import { COURSES } from "@/lib/courses";

// ---------------------------------------------------------------------------
// Book an open review-call slot (see lib/reviewCalls.ts for the full data
// model). This is the ONLY place a reviewSlots doc ever moves from "open" to
// "booked", and the only place a reviewBookings doc is ever created - both
// firestore.rules block a client from doing either directly, so this route
// (Admin SDK) is the real boundary, not just a convenience layer.
//
// Two things this route has to get right:
//
//   1. Race safety: two students racing to book the same open slot at the
//      same moment must never both win. The read-check-write on the slot
//      doc happens inside a single Firestore transaction, exactly the same
//      pattern app/api/exam/submit/route.ts uses for the attempt-cap check -
//      Firestore transactions retry automatically on write conflicts, so
//      only one of two racing bookings can ever commit. tx.create() on the
//      booking doc (whose ID is always the same as the slot ID) is a second,
//      independent guarantee: it throws outright if a booking for this slot
//      already exists, even in a hypothetical scenario where the slot-status
//      check alone wasn't enough.
//
//   2. Eligibility is re-checked here, server-side, from the student's own
//      examResults - never trusted from the client. A student can only book
//      a review call while genuinely sitting in the
//      failed-attempt-1-awaiting-review state (see lib/examEligibility.ts).
//      This blocks booking a review call for a course they passed, never
//      attempted, or already have a retake approved for.
// ---------------------------------------------------------------------------

class ReviewCallBookingError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = "ReviewCallBookingError";
        this.status = status;
    }
}

export async function POST(req: Request) {
    let decodedToken;
    try {
        decodedToken = await verifyIdToken(req);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { slotId } = body;

        if (!slotId || typeof slotId !== "string") {
            return NextResponse.json({ error: "Missing slotId." }, { status: 400 });
        }

        const uid = decodedToken.uid;
        const adminDb = getFirestore(getAdminApp());
        const slotRef = adminDb.collection("reviewSlots").doc(slotId);
        const bookingRef = adminDb.collection("reviewBookings").doc(slotId);
        const userRef = adminDb.collection("users").doc(uid);

        let booking: ReviewBooking;
        try {
            booking = await adminDb.runTransaction(async (tx) => {
                const slotSnap = await tx.get(slotRef);
                if (!slotSnap.exists) {
                    throw new ReviewCallBookingError("This time slot is no longer available.", 404);
                }
                const slot = slotSnap.data()!;

                if (slot.status !== "open") {
                    throw new ReviewCallBookingError("This time slot has already been booked. Please pick another.", 409);
                }
                if (new Date(slot.startTime).getTime() <= Date.now()) {
                    throw new ReviewCallBookingError("This time slot has already passed.", 409);
                }

                const userSnap = await tx.get(userRef);
                if (!userSnap.exists) {
                    throw new ReviewCallBookingError("Student profile not found.", 404);
                }
                const userData = userSnap.data()!;

                const existingResult = userData.examResults?.[slot.courseId] as ExamResultRecord | undefined;
                const eligibility = getExamAttemptEligibility(existingResult);
                if (eligibility.eligible || eligibility.reason !== "awaiting-review") {
                    throw new ReviewCallBookingError(
                        "You are not currently eligible to book a review call for this course.",
                        403
                    );
                }

                const studentEmail = userData.email;
                if (!studentEmail) {
                    throw new ReviewCallBookingError(
                        "Your account is missing an email address. Contact support before booking.",
                        400
                    );
                }
                const studentName = userData.displayName || "Student";

                // One active booking per student per course at a time. A
                // single-field equality query (studentId only, filtered for
                // courseId/status in code) avoids any dependency on a
                // manual composite index - this codebase already relies on
                // compound equality-only queries elsewhere (e.g.
                // app/corporate/dashboard/page.tsx), but there is no
                // firestore.indexes.json checked in, so we deliberately
                // don't add a new compound-query dependency here.
                const existingBookingsSnap = await tx.get(
                    adminDb.collection("reviewBookings").where("studentId", "==", uid)
                );
                const hasActiveBooking = existingBookingsSnap.docs.some((doc) => {
                    const data = doc.data();
                    return data.courseId === slot.courseId && data.status === "booked";
                });
                if (hasActiveBooking) {
                    throw new ReviewCallBookingError(
                        "You already have a review call booked for this course. Contact us if you need to change it.",
                        409
                    );
                }

                const nowIso = new Date().toISOString();
                const bookingData: Omit<ReviewBooking, "id"> = {
                    slotId,
                    courseId: slot.courseId,
                    startTime: slot.startTime,
                    durationMinutes: slot.durationMinutes,
                    studentId: uid,
                    studentName,
                    studentEmail,
                    failedAttemptNumber: existingResult?.attempt ?? 1,
                    adminUid: slot.createdByAdminUid,
                    status: "booked",
                    bookedAt: nowIso,
                };

                tx.update(slotRef, { status: "booked" });
                tx.create(bookingRef, bookingData);

                return { ...bookingData, id: slotId };
            });
        } catch (error: any) {
            if (error instanceof ReviewCallBookingError) {
                return NextResponse.json({ error: error.message }, { status: error.status });
            }
            throw error;
        }

        const course = COURSES.find((c) => c.id === booking.courseId);
        const courseTitle = course?.title || booking.courseId.toUpperCase();
        const joinLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/portal/review-call/${booking.id}`;

        const emailSent = await sendReviewCallBookedEmail({
            email: booking.studentEmail,
            name: booking.studentName,
            courseTitle,
            startTime: booking.startTime,
            durationMinutes: booking.durationMinutes,
            joinLink,
        });

        return NextResponse.json({ success: true, booking, emailSent });
    } catch (error: any) {
        console.error("Error booking review call:", error);
        return NextResponse.json(
            { error: error.message || "Failed to book review call." },
            { status: 500 }
        );
    }
}
