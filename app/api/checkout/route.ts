import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getCourseById } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
    apiVersion: "2025-12-15.clover" as any,
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { courseId, seats = 1, userId, userEmail, userName } = body;

        if (!courseId || !userId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const course = await getCourseById(courseId);
        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: course.title,
                            description: course.description,
                            images: [], // Optionally add course image URL
                        },
                        unit_amount: Math.round(course.price * 100), // Stripe expects cents
                    },
                    quantity: seats,
                },
            ],
            mode: "payment",
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/signup?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/courses/${courseId}?canceled=true`,
            customer_email: userEmail, // Pre-fill email if known
            metadata: {
                courseId,
                userId,
                sessionId: body.sessionId, // Add sessionId
                seats: seats.toString(),
                userName: userName || "",
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error("Stripe Checkout Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
