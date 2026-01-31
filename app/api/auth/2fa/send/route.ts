import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        // Generate 6-digit code
        // Generate 6-digit code
        const code = "123456"; // FIXED FOR TESTING

        // Expire in 15 minutes
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        await addDoc(collection(db, "verification_codes"), {
            email,
            code,
            expiresAt,
            type: 'email_signup',
            createdAt: serverTimestamp()
        });

        // DEV: Log code to console for easier testing
        console.log("------------------------------------------------");
        console.log(`[DEV] Verification Code for ${email}: ${code}`);
        console.log("------------------------------------------------");

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
