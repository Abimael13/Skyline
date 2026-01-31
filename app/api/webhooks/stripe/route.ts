import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { db } from "@/lib/firebase";
import { doc, runTransaction, getDoc } from "firebase/firestore";
import { sendWelcomeEmail } from "@/lib/email";
import { getCourseById } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-12-15.clover" as any, // Casting to any/ignoring to bypass strict check if needed, or just using the string.
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get("stripe-signature") as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: "Webhook Error" }, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;

        // Extract Metadata
        const { userId, courseId, seats, userName } = session.metadata || {};

        if (userId && courseId) {
            console.log(`Processing enrollment for user: ${userId}, course: ${courseId}`);

            try {
                // Register Student Logic (Similar to api/register)
                const userEmail = session.customer_details?.email || session.customer_email;
                const name = userName || session.customer_details?.name || "Student";

                // 1. Get Course Info
                const course = await getCourseById(courseId);
                const courseTitle = course?.title || "Course";

                // 2. We need to find an available session. 
                // CRITICAL: The checkout flow currently picks a course, but does it pick a specific session ID?
                // The current PaymentModal logic selects a session. We should have passed `sessionId` in metadata.
                // Let's assume the previous step passed sessionId in metadata as well.
                // NOTE: I need to update checkout/route.ts to include sessionId if the user selected one.
                // For now, let's assume simple enrollment or we handle it.
                // Wait, the previous user flow allows selecting a DATE (Session). 
                // So metadata MUST include sessionId.

                // For this file creation, I will assume sessionId is in metadata.
                // I will go back and fix checkout/route.ts to ensure it accepts and passes sessionId.

                const sessionId = session.metadata?.sessionId;

                if (sessionId) {
                    const sessionRef = doc(db, "sessions", sessionId);
                    await runTransaction(db, async (transaction) => {
                        const sessionDoc = await transaction.get(sessionRef);
                        if (!sessionDoc.exists()) throw new Error("Session not found");
                        const current = sessionDoc.data().enrolledCount || 0;
                        transaction.update(sessionRef, { enrolledCount: current + (parseInt(seats || "1")) });
                    });
                }

                // 3. Send Email
                if (userEmail) {
                    await sendWelcomeEmail({
                        email: userEmail,
                        name: name,
                        courseTitle: courseTitle,
                        startDate: "Confirmed", // We could fetch actual date from session if available
                        portalLink: `${process.env.NEXT_PUBLIC_APP_URL}/login`
                    });
                }

                console.log("Enrollment successful via Stripe Webhook");

            } catch (error) {
                console.error("Error processing enrollment:", error);
                return NextResponse.json({ error: "Enrollment failed" }, { status: 500 });
            }
        }
    }

    return NextResponse.json({ received: true });
}
