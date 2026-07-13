// One-time (or occasional) script to grant a user the "admin" custom claim.
// Custom claims can ONLY be set via the Admin SDK, so this script is the only
// way to make someone an admin - there is no in-app button for this on purpose.
//
// Usage:
//   npx tsx scripts/set-admin-claim.ts owner@email.com
//   npx tsx scripts/set-admin-claim.ts <firebase-uid>
//
// Requires the same FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL /
// FIREBASE_ADMIN_PRIVATE_KEY env vars as lib/firebaseAdmin.ts (set them in
// .env.local, or export them in your shell before running this script).

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

async function main() {
    const identifier = process.argv[2];

    if (!identifier) {
        console.error("Usage: npx tsx scripts/set-admin-claim.ts <email-or-uid>");
        process.exit(1);
    }

    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
        console.error(
            "Missing Firebase Admin credentials. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY."
        );
        process.exit(1);
    }

    initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
    });

    const auth = getAuth();

    console.log(`Looking up user: ${identifier}...`);

    const userRecord = identifier.includes("@")
        ? await auth.getUserByEmail(identifier)
        : await auth.getUser(identifier);

    await auth.setCustomUserClaims(userRecord.uid, { admin: true });

    console.log(`✅ Granted admin claim to ${userRecord.email || userRecord.uid} (uid: ${userRecord.uid})`);
    console.log("Note: the user must sign out and sign back in (or refresh their ID token) for the claim to take effect.");
}

main().catch((error) => {
    console.error("Failed to set admin claim:", error);
    process.exit(1);
});
