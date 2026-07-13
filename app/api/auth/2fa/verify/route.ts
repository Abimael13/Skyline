import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";

// A 6-digit code has 1,000,000 possibilities. Without a limit on attempts,
// anyone who knows (or guesses) an email mid-signup could brute-force the
// code within its 10-minute expiry window. We cap it at 5 wrong guesses per
// code - after that, the code is deleted outright and the visitor has to
// request a fresh one via /api/auth/2fa/send. The counter lives on the same
// Firestore doc as the code/expiry (Admin SDK only, never client-writable).
const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
    try {
        const { email, code } = await req.json();

        if (!email || !code) {
            return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
        }

        const adminDb = getFirestore(getAdminApp());
        const codeRef = adminDb.collection("verification_codes").doc(email);
        const codeSnap = await codeRef.get();

        if (!codeSnap.exists) {
            return NextResponse.json({ success: false, error: "Invalid code" }, { status: 400 });
        }

        const data = codeSnap.data()!;
        const attempts = data.attempts || 0;

        // Already over the limit from previous failed guesses - force a
        // fresh code rather than keep letting the caller try.
        if (attempts >= MAX_ATTEMPTS) {
            await codeRef.delete();
            return NextResponse.json(
                { success: false, error: "Too many incorrect attempts. Please request a new code." },
                { status: 429 }
            );
        }

        const expiresAt = new Date(data.expiresAt);
        if (new Date() > expiresAt) {
            await codeRef.delete();
            return NextResponse.json({ success: false, error: "Code expired" }, { status: 400 });
        }

        if (data.code !== code) {
            const newAttempts = attempts + 1;

            if (newAttempts >= MAX_ATTEMPTS) {
                // This was the last allowed try - delete the code so it
                // can't be guessed further; the user must request a new one.
                await codeRef.delete();
                return NextResponse.json(
                    { success: false, error: "Too many incorrect attempts. Please request a new code." },
                    { status: 429 }
                );
            }

            await codeRef.update({ attempts: newAttempts });
            return NextResponse.json({ success: false, error: "Invalid code" }, { status: 400 });
        }

        // Consume the code so it can't be reused.
        await codeRef.delete();

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("2FA Verify Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
