import { NextResponse } from "next/server";
import { z } from "zod";
import { sendContactEmail } from "@/lib/email";

const contactSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    subject: z.string().min(3, "Subject must be at least 3 characters"),
    message: z.string().min(10, "Message must be at least 10 characters"),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Validate with Zod
        const result = contactSchema.safeParse(body);

        if (!result.success) {
            const errorMessages = result.error.issues.map((issue) => issue.message).join(", ");
            return NextResponse.json(
                { error: errorMessages },
                { status: 400 }
            );
        }

        const { name, email, phone, subject, message } = result.data;

        const success = await sendContactEmail({
            name,
            email,
            phone: phone || "",
            subject,
            message,
        });

        if (success) {
            return NextResponse.json({ success: true, message: "Email sent successfully" });
        } else {
            return NextResponse.json(
                { error: "Failed to send email. Please try again later." },
                { status: 500 }
            );
        }
    } catch (error: any) {
        console.error("Error in contact API:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
