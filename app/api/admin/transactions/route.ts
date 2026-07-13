import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAdmin } from "@/lib/firebaseAdmin";
import { COURSES } from "@/lib/courses";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
    apiVersion: "2025-12-15.clover" as any,
});

const MAX_TRANSACTIONS = 20;

export async function GET(req: Request) {
    try {
        await requireAdmin(req);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 403 });
    }

    try {
        // Same reasoning as app/api/admin/dashboard-stats/route.ts: we read
        // Stripe Checkout Sessions (not raw Charges) because that's the
        // object our own checkout flow creates (app/api/checkout/route.ts),
        // and it already carries the course/customer info this table needs.
        // Only completed ("paid") sessions are returned - an abandoned
        // checkout isn't a transaction. Stripe returns sessions newest-first,
        // so we stop as soon as we have enough.
        const transactions: {
            id: string;
            studentName: string;
            studentEmail: string | null;
            courseTitle: string;
            date: string;
            amount: number;
            currency: string;
            status: string;
        }[] = [];

        for await (const session of stripe.checkout.sessions.list({ limit: 100 })) {
            if (session.payment_status !== "paid") continue;

            const courseId = session.metadata?.courseId;
            const course = COURSES.find((c) => c.id === courseId);

            transactions.push({
                id: session.id,
                studentName: session.customer_details?.name || session.metadata?.userName || "Unknown",
                studentEmail: session.customer_details?.email || null,
                courseTitle: course?.title || courseId || "Unknown Course",
                date: new Date(session.created * 1000).toISOString(),
                amount: (session.amount_total || 0) / 100,
                currency: session.currency || "usd",
                status: session.payment_status,
            });

            if (transactions.length >= MAX_TRANSACTIONS) break;
        }

        return NextResponse.json({ transactions });
    } catch (error: any) {
        console.error("Error in transactions API:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
