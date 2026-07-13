import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";

// Server-only Firebase Admin SDK. This is what enforces "admin only" access
// on the server - the client-side `role` check in AuthContext is for UI only
// and can be bypassed by anyone calling the API directly, so every privileged
// route must go through the helpers below instead of trusting the client.

// Guard against re-initializing the Admin app on every hot reload in dev.
function getAdminApp(): App {
    const existingApp = getApps()[0];
    if (existingApp) return existingApp;

    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            "Firebase Admin SDK is not configured. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY."
        );
    }

    return initializeApp({
        credential: cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
}

/**
 * Verifies the Firebase ID token sent in the `Authorization: Bearer <token>`
 * header of a request. Throws if the header is missing or the token is invalid.
 */
export async function verifyIdToken(request: Request): Promise<DecodedIdToken> {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Error("Missing or malformed Authorization header. Expected 'Bearer <idToken>'.");
    }

    const token = authHeader.slice("Bearer ".length).trim();

    if (!token) {
        throw new Error("Missing ID token.");
    }

    try {
        return await getAuth(getAdminApp()).verifyIdToken(token);
    } catch (error) {
        console.error("verifyIdToken failed:", error);
        throw new Error("Invalid or expired authentication token.");
    }
}

/**
 * Verifies the caller's ID token AND requires the `admin` custom claim to be
 * true. This claim is set via the Admin SDK only (see scripts/set-admin-claim.ts)
 * - it is NOT the same thing as the `role` field stored on the user's Firestore
 * document, which is client-writable and must never be trusted for authorization.
 */
export async function requireAdmin(request: Request): Promise<DecodedIdToken> {
    const decodedToken = await verifyIdToken(request);

    if (decodedToken.admin !== true) {
        throw new Error("Admin privileges required.");
    }

    return decodedToken;
}

export { getAdminApp };
