import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getCourseById } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
    apiVersion: "2025-12-15.clover" as any,
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { courseId, seats = 1, userId, userEmail, userName, sessionId } = body;

        if (!courseId || !userId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Validate User ID (Simple check to ensure it's not missing, though strict auth check should be upstream or via token)
        // For now, we trust the client sends the correct UID after login.

        const course = await getCourseById(courseId);
        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        // Create Checkout Session
        const params: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: course.title,
                            description: course.description,
                            images: [], // Optionally add course image URL if available
                        },
                        unit_amount: Math.round(course.price * 100), // Stripe expects cents
                    },
                    quantity: seats,
                },
            ],
            mode: "payment",
            ui_mode: "embedded",
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/signup/success?session_id={CHECKOUT_SESSION_ID}`,
            customer_email: userEmail, // Pre-fill email
            metadata: {
                courseId,
                userId,
                sessionId: sessionId || "", // Pass session ID
                seats: seats.toString(),
                userName: userName || "",
            },
        };

        const session = await stripe.checkout.sessions.create(params);

        return NextResponse.json({ clientSecret: session.client_secret });
    } catch (error: any) {
        console.error("Stripe Checkout Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
