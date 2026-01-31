import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { z } from "zod";

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

        const emailUser = process.env.EMAIL_USER;
        const emailPass = process.env.EMAIL_PASS;

        if (!emailUser || !emailPass) {
            console.error("Missing email configuration (EMAIL_USER or EMAIL_PASS)");
            return NextResponse.json(
                { error: "Server configuration error provided. Please contact support." },
                { status: 500 }
            );
        }

        // Configure Nodemailer transporter for Outlook
        const transporter = nodemailer.createTransport({
            host: "smtp.office365.com",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: emailUser,
                pass: emailPass,
            },
            tls: {
                ciphers: "SSLv3",
                rejectUnauthorized: false
            }
        });

        // Email content
        const mailOptions = {
            from: `"${name} (via Website)" <${emailUser}>`,
            to: emailUser,
            replyTo: email,
            subject: `[Contact Form] ${subject}`,
            text: `
Name: ${name}
Email: ${email}
Phone: ${phone || "Not provided"}

Message:
${message}
      `,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Contact Form Submission</h2>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
            <p><strong>Subject:</strong> ${subject}</p>
          </div>
          <div style="margin-top: 20px;">
            <h3 style="color: #333;">Message:</h3>
            <p style="white-space: pre-wrap; color: #555; line-height: 1.6;">${message}</p>
          </div>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999;">This email was sent from the Skyline Safety Service contact form.</p>
        </div>
      `,
        };

        // Send email
        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true, message: "Email sent successfully" });
    } catch (error: any) {
        console.error("Error sending email:", error);
        return NextResponse.json(
            { error: "Failed to send email. Please try again later." },
            { status: 500 }
        );
    }
}
