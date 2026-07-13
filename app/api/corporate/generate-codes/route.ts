import { NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { customAlphabet } from 'nanoid';
import { getAdminApp, verifyIdToken } from "@/lib/firebaseAdmin";

// Use a readable alphabet for codes (no look-alike characters)
const generateCode = customAlphabet('2346789ABCDEFGHJKLMNPQRTUVWXYZ', 8);

export async function POST(req: Request) {
    let decodedToken;
    try {
        decodedToken = await verifyIdToken(req);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { companyId, quantity = 5 } = body;

        if (!companyId || quantity <= 0 || quantity > 50) {
            return NextResponse.json(
                { error: "Invalid request parameters" },
                { status: 400 }
            );
        }

        // Authorization: this button is a self-service action for a
        // company's own manager (app/corporate/dashboard/page.tsx), who is
        // identified only by companies/{companyId}.managerUid == their uid -
        // they do NOT have the Firebase Auth `admin` custom claim. Staff can
        // also generate codes on a manager's behalf.
        //
        // So we accept EITHER:
        //   - decodedToken.admin === true (staff), OR
        //   - the verified caller's uid matches the managerUid stored on the
        //     specific companyId being requested (their own company only -
        //     we look this up ourselves from Firestore rather than trusting
        //     anything the client claims about which company they manage,
        //     so a manager cannot pass a different company's companyId to
        //     generate codes for a company they don't run).
        //
        // All Firestore access below goes through the Admin SDK, which
        // bypasses firestore.rules entirely by design - that's correct since
        // the real authorization check happens here in the route itself. Do
        // NOT switch this back to the client SDK (lib/firebase.ts).
        const adminDb = getFirestore(getAdminApp());
        const companyRef = adminDb.collection("companies").doc(companyId);

        if (decodedToken.admin !== true) {
            const companySnap = await companyRef.get();
            if (!companySnap.exists) {
                return NextResponse.json({ error: "Company not found" }, { status: 404 });
            }
            const companyData = companySnap.data()!;
            if (companyData.managerUid !== decodedToken.uid) {
                return NextResponse.json(
                    { error: "You do not have permission to generate codes for this company." },
                    { status: 403 }
                );
            }
        }

        // Transaction to ensure we don't exceed seat capacity if we enforced strict limits here,
        // but for now we just verify existence and generate codes.
        // In a stricter model, we might want to check (seatsUsed + newCodes) <= seatsTotal,
        // but currently 'seatsUsed' counts actual enrolled users.
        // We will treat codes as "pre-allocated" or checks at redemption time.
        // Let's enforce that Total Codes Generated <= Seats Total to be safe, or just check generic capacity.

        const newCodes = await adminDb.runTransaction(async (transaction) => {
            const companyDoc = await transaction.get(companyRef);
            if (!companyDoc.exists) {
                throw new Error("Company not found");
            }

            const companyData = companyDoc.data()!;
            const seatsTotal = companyData.seatsTotal || 0;
            const seatsUsed = companyData.seatsUsed || 0;

            // Optional: enforce capacity check here?
            // If we allow over-generation, it might be fine, but redemption will fail.
            // Let's allow generation for now to be flexible.

            const generated = [];

            for (let i = 0; i < quantity; i++) {
                const code = `${companyData.code}-${generateCode()}`; // e.g. CORP-ACME-X7Z9A2

                // Use the code string itself as the document ID for
                // uniqueness and easy lookup (also lets firestore.rules'
                // `allow get: if true` do a fast single-doc validity check
                // during signup without a query).
                const uniqueDocRef = adminDb.collection("registration_codes").doc(code);

                transaction.set(uniqueDocRef, {
                    code: code,
                    companyId: companyId,
                    status: 'active',
                    companyName: companyData.name,
                    // Denormalized copy of companies/{companyId}.managerUid at
                    // creation time. This lets firestore.rules allow a
                    // corporate manager to list/read their OWN company's
                    // codes with a cheap direct field check
                    // (companyManagerUid == request.auth.uid) instead of a
                    // cross-document get() on companies/{companyId} for every
                    // doc in the query result set - cheaper and simpler than
                    // a rule-side get(), and this field is never trusted for
                    // anything else (writes to registration_codes stay
                    // Admin-SDK-only either way).
                    companyManagerUid: companyData.managerUid || null,
                    createdAt: FieldValue.serverTimestamp(),
                    createdBy: 'system' // or user ID if passed
                });

                generated.push({
                    code,
                    status: 'active'
                });
            }

            return generated;
        });

        return NextResponse.json({ success: true, codes: newCodes });

    } catch (error: any) {
        console.error("Code generation failed:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate codes" },
            { status: 500 }
        );
    }
}
