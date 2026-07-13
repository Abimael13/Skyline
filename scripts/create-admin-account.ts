// One-time script: creates a real Firebase Auth account + matching Firestore
// user profile, then grants it the "admin" custom claim. This exists purely
// to bootstrap the owner's first admin account without needing the email/2FA
// signup flow to be working yet.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/create-admin-account.ts <email> <password> "<display name>"

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

async function main() {
    const [email, password, displayName] = process.argv.slice(2);

    if (!email || !password) {
        console.error('Usage: npx tsx --env-file=.env.local scripts/create-admin-account.ts <email> <password> "<display name>"');
        process.exit(1);
    }

    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
        console.error("Missing Firebase Admin credentials.");
        process.exit(1);
    }

    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });

    const auth = getAuth();
    const db = getFirestore();

    console.log(`Creating account for ${email}...`);
    const userRecord = await auth.createUser({
        email,
        password,
        displayName: displayName || "Andy Herrera",
        emailVerified: true,
    });

    console.log(`Creating Firestore profile for ${userRecord.uid}...`);
    await db.collection("users").doc(userRecord.uid).set({
        displayName: displayName || "Andy Herrera",
        email,
        role: "admin",
        isVerified: true,
        createdAt: FieldValue.serverTimestamp(),
        enrolledCourses: [],
    }, { merge: true });

    console.log("Granting admin claim...");
    await auth.setCustomUserClaims(userRecord.uid, { admin: true });

    console.log(`\n✅ Done. Account ${email} created and granted admin access.`);
    console.log(`UID: ${userRecord.uid}`);
}

main().catch((error) => {
    console.error("Failed:", error.message || error);
    process.exit(1);
});
