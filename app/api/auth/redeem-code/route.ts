import { NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAdminApp, verifyIdToken } from "@/lib/firebaseAdmin";

// ---------------------------------------------------------------------------
// Redeem a corporate registration code (or legacy shared company code) on
// signup, and enroll the caller in that company.
//
// Why this lives on the server instead of the client SDK:
// Previously, app/signup/page.tsx did this as TWO separate, unrelated
// Firestore writes from the browser:
//   1. updateDoc(companyRef, { seatsUsed: increment(1) })
//   2. updateDoc(codeRef, { status: 'used', usedBy, usedAt })
// Nothing tied those two writes together, so:
//   - A user could redeem a code without the seat count ever going up
//     (skip write #1), bypassing the seat cap entirely.
//   - The seat cap check itself only ever ran client-side before the writes,
//     so a modified client could ignore it completely.
//   - If the process failed between the two writes, the data could end up
//     inconsistent (seat used but code still "active", or vice versa).
//
// This route does the whole thing as one atomic Admin SDK transaction, with
// the seat cap re-checked server-side at the moment of redemption - the
// only privileged writes to `registration_codes.status` and
// `companies.seatsUsed` now happen here. firestore.rules has been locked
// down to admin-SDK-only for both of those specific transitions to match.
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
    let decodedToken;
    try {
        decodedToken = await verifyIdToken(req);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { code } = body;

        if (!code || typeof code !== "string") {
            return NextResponse.json({ error: "A registration code is required." }, { status: 400 });
        }

        const uid = decodedToken.uid;
        const adminDb = getFirestore(getAdminApp());
        const codeInput = code.trim();

        const result = await adminDb.runTransaction(async (transaction) => {
            // 1. Try a unique, one-time registration code first.
            const codeRef = adminDb.collection("registration_codes").doc(codeInput);
            const codeSnap = await transaction.get(codeRef);

            if (codeSnap.exists) {
                const codeData = codeSnap.data()!;

                if (codeData.status === "used") {
                    throw new Error("This registration code has already been used.");
                }
                if (codeData.status !== "active") {
                    throw new Error("This registration code is not valid.");
                }

                const companyId = codeData.companyId;
                const companyRef = adminDb.collection("companies").doc(companyId);
                const companySnap = await transaction.get(companyRef);

                if (!companySnap.exists) {
                    throw new Error("The associated company account could not be found.");
                }

                const companyData = companySnap.data()!;
                const seatsTotal = companyData.seatsTotal || 0;
                const seatsUsed = companyData.seatsUsed || 0;

                if (seatsUsed >= seatsTotal) {
                    throw new Error("This company account has reached its maximum seat capacity.");
                }

                // Atomically: mark the code used, bump the seat count by
                // exactly 1, and link the user to the company - all three
                // happen together or not at all.
                transaction.update(codeRef, {
                    status: "used",
                    usedBy: uid,
                    usedAt: FieldValue.serverTimestamp(),
                });
                transaction.update(companyRef, {
                    seatsUsed: FieldValue.increment(1),
                });

                return { linkedCompanyId: companyId as string };
            }

            // 2. Fallback: legacy shared company code (a `code` field on the
            // company doc itself, not a one-time-use doc).
            const companyQuery = await adminDb
                .collection("companies")
                .where("code", "==", codeInput)
                .limit(1)
                .get();

            if (companyQuery.empty) {
                throw new Error("Invalid Access Code. Please check and try again.");
            }

            const companyDoc = companyQuery.docs[0];
            const companyRef = companyDoc.ref;
            // Re-read inside the transaction for a consistent snapshot.
            const companySnap = await transaction.get(companyRef);
            const companyData = companySnap.data()!;
            const seatsTotal = companyData.seatsTotal || 0;
            const seatsUsed = companyData.seatsUsed || 0;

            if (seatsUsed >= seatsTotal) {
                throw new Error("This company account has reached its maximum seat capacity.");
            }

            transaction.update(companyRef, {
                seatsUsed: FieldValue.increment(1),
            });

            return { linkedCompanyId: companyDoc.id as string };
        });

        // Link the user's own profile to the company. This write is NOT
        // part of the transaction above (it touches a document outside the
        // seat/code invariant we need atomicity for), but it uses the Admin
        // SDK so it always succeeds regardless of client-side Firestore
        // rules, and only runs after the seat/code transaction above has
        // already committed successfully.
        // TODO: hardcoded single-course assumption. Neither registration_codes
        // nor companies documents currently store any course/package
        // identifier (checked app/api/corporate/generate-codes/route.ts and
        // app/admin/companies/page.tsx - company docs only have name, code,
        // managerName, managerEmail, seatsTotal, seatsUsed, managerUid).
        // Today Skyline only sells the one F-89 course, so every corporate
        // redemption really is for "f89-flsd" - but the moment a second
        // course/package is sold, this needs a real courseId (or package ->
        // course-list) field added to companies/registration_codes at
        // creation time and read here instead of this hardcoded string, or
        // every corporate redemption will silently enroll people in the
        // wrong (or an incomplete set of) course(s).
        await adminDb.collection("users").doc(uid).set(
            {
                linkedCompanyId: result.linkedCompanyId,
                enrolledCourses: FieldValue.arrayUnion("f89-flsd"),
            },
            { merge: true }
        );

        return NextResponse.json({ success: true, linkedCompanyId: result.linkedCompanyId });
    } catch (error: any) {
        console.error("Code redemption failed:", error);
        return NextResponse.json(
            { error: error.message || "Failed to redeem code." },
            { status: 400 }
        );
    }
}
