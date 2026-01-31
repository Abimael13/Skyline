import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";

export async function POST(req: Request) {
    try {
        const { email, code } = await req.json();

        if (!email || !code) {
            return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
        }

        // Verified logic: Find latest active code for this email
        const q = query(
            collection(db, "verification_codes"),
            where("email", "==", email),
            where("code", "==", code),
            where("type", "==", "email_signup"),
            orderBy("createdAt", "desc"), // Needs compound index? If so, we can filter in memory if volume low, or just query by email & code which is usually specific enough
            limit(1)
        );

        // Note: orderBy might require index. 
        // Simpler query: matches email + code. Then check expiry in code.
        const simpleQ = query(
            collection(db, "verification_codes"),
            where("email", "==", email),
            where("code", "==", code)
        );

        const querySnapshot = await getDocs(simpleQ);

        if (querySnapshot.empty) {
            return NextResponse.json({ success: false, error: "Invalid code" }, { status: 400 });
        }

        const doc = querySnapshot.docs[0];
        const data = doc.data();

        // Check expiry
        const now = new Date();
        // Timestamp to Date
        const expiresAt = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt); // Handle Firestore Timestamp or Date

        if (now > expiresAt) {
            return NextResponse.json({ success: false, error: "Code expired" }, { status: 400 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("2FA Verify Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
