import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import Stripe from "stripe";
import { getAdminApp, requireAdmin } from "@/lib/firebaseAdmin";
import { COURSES } from "@/lib/courses";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
    apiVersion: "2025-12-15.clover" as any,
});

export async function GET(req: Request) {
    try {
        await requireAdmin(req);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 403 });
    }

    try {
        // This route is admin-only (requireAdmin() above), so all Firestore
        // access here goes through the Admin SDK, which bypasses
        // firestore.rules entirely by design - see app/api/admin/grade-exam/route.ts
        // for the same established pattern.
        const adminDb = getFirestore(getAdminApp());

        // ---- Students + enrollments, straight from Firestore `users` ----
        // "Total Students" here intentionally excludes any user document
        // whose role is "admin" (new accounts default to role: "student"
        // at signup - see app/signup/page.tsx - and lib/AuthContext.tsx
        // also defaults a missing role to "student" for the same user).
        // This is deliberately narrower than app/admin/students/page.tsx,
        // which fetches and lists every `users` doc with no role filter
        // at all (it shows admin accounts too, just with an "Admin" badge
        // instead of a "Student" one). That's the right call for each
        // screen: students/page.tsx is an account-management view where
        // admins still need to appear, while this stat is meant to answer
        // "how many actual students do we have," so an admin account
        // shouldn't inflate it.
        const usersSnap = await adminDb.collection("users").get();

        let totalStudents = 0;
        let totalEnrollments = 0;
        const recentSignups: { uid: string; name: string; email: string; createdAt: string | null }[] = [];

        usersSnap.forEach((doc) => {
            const data = doc.data();

            if (data.role !== "admin") {
                totalStudents += 1;
            }

            if (Array.isArray(data.enrolledCourses)) {
                totalEnrollments += data.enrolledCourses.length;
            }

            let createdAt: string | null = null;
            if (data.createdAt) {
                // Firestore Timestamp (Admin SDK) has .toDate(); older docs
                // written as a plain JS Date via the client SDK serialize
                // to a Timestamp too, but guard for any legacy string/number
                // just in case.
                createdAt = typeof data.createdAt?.toDate === "function"
                    ? data.createdAt.toDate().toISOString()
                    : new Date(data.createdAt).toISOString();
            }

            recentSignups.push({
                uid: doc.id,
                name: data.displayName || data.email || "Unknown",
                email: data.email || "",
                createdAt,
            });
        });

        recentSignups.sort((a, b) => {
            if (!a.createdAt && !b.createdAt) return 0;
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        // ---- Upcoming classes, straight from Firestore `sessions` ----
        // (app/admin/schedule/page.tsx is where these get created; startDate
        // is stored as an ISO string, which sorts/compares correctly as a
        // plain string filter here).
        const nowIso = new Date().toISOString();
        const upcomingSessionsSnap = await adminDb
            .collection("sessions")
            .where("startDate", ">", nowIso)
            .orderBy("startDate", "asc")
            .get();

        const upcomingClassesCount = upcomingSessionsSnap.size;
        const nextSessionData = upcomingSessionsSnap.docs[0]?.data();
        const nextSessionCourse = nextSessionData
            ? COURSES.find((c) => c.id === nextSessionData.courseId)
            : undefined;

        // ---- Revenue + recent paid enrollments, straight from Stripe ----
        // Firestore never records a dollar amount anywhere - the webhook
        // (app/api/webhooks/stripe/route.ts) only writes enrollment arrays
        // when a checkout completes, it doesn't store the amount paid. So
        // Stripe is the only real source of truth for money actually
        // collected. We read Checkout Sessions specifically (rather than
        // raw Charges/PaymentIntents) because that's the exact object our
        // own checkout flow creates (app/api/checkout/route.ts) and it
        // already carries the courseId/userId metadata we set at checkout
        // time, so there's no need to cross-reference a second Stripe
        // object type.
        //
        // Note: this sums amount_total for every session whose
        // payment_status is "paid" - it does not currently net out later
        // refunds (Checkout Sessions don't directly expose refund status).
        // For a small course business this is a reasonable, simple measure
        // of revenue collected; if refunds become common this should be
        // reconciled against Stripe's balance transactions instead.
        let totalRevenueCents = 0;
        const recentPaidSessions: Stripe.Checkout.Session[] = [];

        for await (const session of stripe.checkout.sessions.list({ limit: 100 })) {
            if (session.payment_status === "paid") {
                totalRevenueCents += session.amount_total || 0;
                if (recentPaidSessions.length < 5) {
                    recentPaidSessions.push(session);
                }
            }
        }

        const recentActivity = recentPaidSessions.map((session) => {
            const courseId = session.metadata?.courseId;
            const course = COURSES.find((c) => c.id === courseId);

            return {
                name: session.customer_details?.name || session.metadata?.userName || "Student",
                courseTitle: course?.title || courseId || "Course",
                amount: (session.amount_total || 0) / 100,
                currency: session.currency || "usd",
                createdAt: new Date(session.created * 1000).toISOString(),
            };
        });

        return NextResponse.json({
            totalStudents,
            totalEnrollments,
            totalRevenue: totalRevenueCents / 100,
            upcomingClassesCount,
            nextClass: nextSessionData
                ? {
                    startDate: nextSessionData.startDate,
                    courseTitle: nextSessionCourse?.title || nextSessionData.courseId || "Class",
                }
                : null,
            recentSignups: recentSignups.slice(0, 5),
            recentActivity,
        });
    } catch (error: any) {
        console.error("Error in dashboard-stats API:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
