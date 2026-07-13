import { NextResponse } from "next/server";
import crypto from "crypto";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        // Cryptographically random 6-digit code (not the old hardcoded "123456").
        const code = crypto.randomInt(100000, 1000000).toString();

        // Expire in 10 minutes
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        // Stored via the Admin SDK so it is not client-writable/readable -
        // the browser never sees this document.
        const adminDb = getFirestore(getAdminApp());
        await adminDb.collection("verification_codes").doc(email).set({
            email,
            code,
            expiresAt: expiresAt.toISOString(),
            type: "email_signup",
            createdAt: new Date().toISOString(),
        });

        const emailSent = await sendVerificationEmail(email, code);

        if (!emailSent) {
            return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Verification code sent" });

    } catch (error: any) {
        console.error("2FA Send Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
