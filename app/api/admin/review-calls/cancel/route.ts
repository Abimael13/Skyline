import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp, requireAdmin } from "@/lib/firebaseAdmin";
import { sendReviewCallCancelledEmail } from "@/lib/email";
import { COURSES } from "@/lib/courses";

// ---------------------------------------------------------------------------
// Admin-only: cancel a student's confirmed review call booking.
//
// Cancelling touches two documents that must stay consistent - the booking
// (marked "cancelled", never deleted, so there's a real record it happened)
// and the slot it was booking (freed back to "open" so another student can
// take that time, or an admin can delete it separately). Both writes happen
// in one transaction so a booking can never end up "cancelled" while its
// slot still shows "booked" with no one able to take it, or vice versa.
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
    let decodedToken;
    try {
        decodedToken = await requireAdmin(req);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { bookingId } = body;

        if (!bookingId || typeof bookingId !== "string") {
            return NextResponse.json({ error: "Missing bookingId." }, { status: 400 });
        }

        const adminDb = getFirestore(getAdminApp());
        const bookingRef = adminDb.collection("reviewBookings").doc(bookingId);
        const slotRef = adminDb.collection("reviewSlots").doc(bookingId);
        const adminUid = decodedToken.uid;

        const cancelled = await adminDb.runTransaction(async (tx) => {
            const bookingSnap = await tx.get(bookingRef);
            if (!bookingSnap.exists) {
                throw new Error("Booking not found.");
            }
            const booking = bookingSnap.data()!;

            if (booking.status !== "booked") {
                throw new Error("Only an active, booked review call can be cancelled.");
            }

            const nowIso = new Date().toISOString();

            tx.update(bookingRef, {
                status: "cancelled",
                statusUpdatedAt: nowIso,
                statusUpdatedBy: adminUid,
            });

            const slotSnap = await tx.get(slotRef);
            if (slotSnap.exists) {
                // Free the time back up rather than deleting it outright -
                // an admin can still delete the slot separately from
                // app/admin/review-slots/page.tsx if the time no longer
                // works for anyone.
                tx.update(slotRef, { status: "open" });
            }

            return booking;
        });

        const course = COURSES.find((c) => c.id === cancelled.courseId);
        const courseTitle = course?.title || cancelled.courseId.toUpperCase();

        let emailSent = false;
        if (cancelled.studentEmail) {
            emailSent = await sendReviewCallCancelledEmail({
                email: cancelled.studentEmail,
                name: cancelled.studentName || "Student",
                courseTitle,
                startTime: cancelled.startTime,
            });
        }

        return NextResponse.json({ success: true, emailSent });
    } catch (error: any) {
        console.error("Error cancelling review call:", error);
        return NextResponse.json(
            { error: error.message || "Failed to cancel review call." },
            { status: 500 }
        );
    }
}
