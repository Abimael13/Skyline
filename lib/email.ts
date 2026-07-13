import { Resend } from "resend";
import { generateWelcomeEmailHtml, generateExamPassEmailHtml, generateExamFailEmailHtml, generateVerificationEmailHtml, generateContactEmailHtml } from "./email-templates";

// Resend client - transactional email API, replaces the old Office365/nodemailer SMTP transport.
const resend = new Resend(process.env.RESEND_API_KEY);

interface WelcomeEmailProps {
    email: string;
    name: string;
    courseTitle: string;
    startDate: string;
    portalLink: string;
}

export async function sendWelcomeEmail({ email, name, courseTitle, startDate, portalLink }: WelcomeEmailProps) {
    const htmlContent = generateWelcomeEmailHtml({ name, courseTitle, startDate, portalLink });

    try {
        const { error } = await resend.emails.send({
            from: `Skyline Admissions <${process.env.EMAIL_FROM}>`,
            to: email,
            subject: `Welcome to ${courseTitle} - Start Your Training`,
            html: htmlContent,
            attachments: [
                // Mock attachments for the demo - in prod these would be real files/links
                // { filename: 'FDNY_flsd_manual.pdf', path: 'https://example.com/manual.pdf' }
            ]
        });

        if (error) {
            console.error("Error sending welcome email:", error);
            return false;
        }

        console.log(`Welcome email sent to ${email}`);
        return true;
    } catch (error) {
        console.error("Error sending welcome email:", error);
        return false;
    }
}

interface ExamResultEmailProps {
    email: string;
    name: string;
    courseTitle: string;
    passed: boolean;
    score: number;
    diplomaDownloadUrl?: string; // We'll attach this if passed
    retakeDateLimit?: string;
}


export async function sendExamResultEmail({ email, name, courseTitle, passed, score, diplomaDownloadUrl, retakeDateLimit }: ExamResultEmailProps) {
    // ... (existing code) ...
    let htmlContent: string;
    let subject: string;
    let attachments: any[] = [];

    if (passed) {
        // ... existing ...
        htmlContent = generateExamPassEmailHtml({ name, courseTitle, score });
        subject = `Congratulations! You Passed - ${courseTitle}`;
        if (diplomaDownloadUrl) {
            attachments.push({
                filename: `${name.replace(/\s+/g, '_')}_Diploma.pdf`,
                path: diplomaDownloadUrl // Resend can fetch from URL
            });
        }
    } else {
        htmlContent = generateExamFailEmailHtml({
            name,
            courseTitle,
            score,
            retakeDateLimit: retakeDateLimit || "30 days"
        });
        subject = `Exam Result Notification - ${courseTitle}`;
    }

    try {
        const { error } = await resend.emails.send({
            from: `Skyline Academics <${process.env.EMAIL_FROM}>`,
            to: email,
            subject: subject,
            html: htmlContent,
            attachments: attachments
        });

        if (error) {
            console.error("Error sending exam result email:", error);
            return false;
        }

        console.log(`Exam result email sent to ${email} (Passed: ${passed})`);
        return true;
    } catch (error) {
        console.error("Error sending exam result email:", error);
        return false;
    }
}

export async function sendVerificationEmail(email: string, code: string) {
    const htmlContent = generateVerificationEmailHtml(code);

    try {
        const { error } = await resend.emails.send({
            from: `Skyline Security <${process.env.EMAIL_FROM}>`,
            to: email,
            subject: "Verify your email address",
            html: htmlContent
        });

        if (error) {
            console.error("Error sending verification email:", error);
            return false;
        }

        console.log(`Verification code sent to ${email}`);
        return true;
    } catch (error) {
        console.error("Error sending verification email:", error);
        return false;
    }
}

interface ContactEmailProps {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
}

export async function sendContactEmail({ name, email, phone, subject, message }: ContactEmailProps) {
    const htmlContent = generateContactEmailHtml({ name, email, phone, subject, message });

    try {
        const { error } = await resend.emails.send({
            from: `Skyline Website Contact <${process.env.EMAIL_FROM}>`,
            to: process.env.EMAIL_FROM as string,
            replyTo: email,
            subject: `New Contact Form Submission: ${subject}`,
            html: htmlContent,
        });

        if (error) {
            console.error("Error sending contact email:", error);
            return false;
        }

        console.log(`Contact form email sent from ${email}`);
        return true;
    } catch (error) {
        console.error("Error sending contact email:", error);
        return false;
    }
}
