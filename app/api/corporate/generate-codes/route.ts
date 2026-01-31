import { NextResponse } from "next/server";
import { db, auth } from "@/lib/firebase";
import { collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { customAlphabet } from 'nanoid';

// Use a readable alphabet for codes (no look-alike characters)
const generateCode = customAlphabet('2346789ABCDEFGHJKLMNPQRTUVWXYZ', 8);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { companyId, quantity = 5 } = body;

        if (!companyId || quantity <= 0 || quantity > 50) {
            return NextResponse.json(
                { error: "Invalid request parameters" },
                { status: 400 }
            );
        }

        const companyRef = doc(db, "companies", companyId);
        const codesToCreate = [];

        // Transaction to ensure we don't exceed seat capacity if we enforced strict limits here,
        // but for now we just verify existence and generate codes.
        // In a stricter model, we might want to check (seatsUsed + newCodes) <= seatsTotal,
        // but currently 'seatsUsed' counts actual enrolled users.
        // We will treat codes as "pre-allocated" or checks at redemption time.
        // Let's enforce that Total Codes Generated <= Seats Total to be safe, or just check generic capacity.

        const newCodes = await runTransaction(db, async (transaction) => {
            const companyDoc = await transaction.get(companyRef);
            if (!companyDoc.exists()) {
                throw new Error("Company not found");
            }

            const companyData = companyDoc.data();
            const seatsTotal = companyData.seatsTotal || 0;
            const seatsUsed = companyData.seatsUsed || 0;

            // Optional: enforce capacity check here?
            // If we allow over-generation, it might be fine, but redemption will fail.
            // Let's allow generation for now to be flexible.

            const generated = [];

            for (let i = 0; i < quantity; i++) {
                const code = `${companyData.code}-${generateCode()}`; // e.g. CORP-ACME-X7Z9A2
                const codeRef = doc(collection(db, "registration_codes")); // Auto-ID for doc, but query by code field

                // Note: We use the code as the document ID for uniqueness and easy lookup? 
                // Or just a field? Using it as ID ensures uniqueness easily.
                // Let's use the code string as the document ID.
                const uniqueDocRef = doc(db, "registration_codes", code);

                transaction.set(uniqueDocRef, {
                    code: code,
                    companyId: companyId,
                    status: 'active',
                    companyName: companyData.name,
                    createdAt: serverTimestamp(),
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
