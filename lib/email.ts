import { Resend } from "resend";
import { generateWelcomeEmailHtml, generateExamPassEmailHtml, generateExamFailEmailHtml, generateRetakeApprovedEmailHtml, generateVerificationEmailHtml, generateContactEmailHtml, generateReviewCallBookedEmailHtml, generateReviewCallCancelledEmailHtml } from "./email-templates";

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
}


export async function sendExamResultEmail({ email, name, courseTitle, passed, score, diplomaDownloadUrl }: ExamResultEmailProps) {
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
        htmlContent = generateExamFailEmailHtml({ name, courseTitle, score });
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

interface RetakeApprovedEmailProps {
    email: string;
    name: string;
    courseTitle: string;
}

// Sent by app/api/admin/approve-retake/route.ts the moment an admin approves
// a student's second and final attempt at the graduation exam. This is the
// real notification path required by the two-attempt policy: a student who
// fails their first attempt has no self-service way to start a retake, so
// this email (and only this email) is what tells them they're cleared to
// go back in.
export async function sendRetakeApprovedEmail({ email, name, courseTitle }: RetakeApprovedEmailProps) {
    const htmlContent = generateRetakeApprovedEmailHtml({ name, courseTitle });

    try {
        const { error } = await resend.emails.send({
            from: `Skyline Academics <${process.env.EMAIL_FROM}>`,
            to: email,
            subject: `You're Cleared to Retake Your Exam - ${courseTitle}`,
            html: htmlContent
        });

        if (error) {
            console.error("Error sending retake approved email:", error);
            return false;
        }

        console.log(`Retake approved email sent to ${email}`);
        return true;
    } catch (error) {
        console.error("Error sending retake approved email:", error);
        return false;
    }
}

interface ReviewCallBookedEmailProps {
    email: string;
    name: string;
    courseTitle: string;
    startTime: string; // ISO
    durationMinutes: number;
    joinLink: string;
}

// Sent by app/api/review-calls/book/route.ts the moment a student books a
// 1:1 review call slot with an admin. This is the real confirmation record
// of the exact time the student committed to - there is no separate
// calendar sync or reminder built yet (see report to owner).
export async function sendReviewCallBookedEmail({ email, name, courseTitle, startTime, durationMinutes, joinLink }: ReviewCallBookedEmailProps) {
    const htmlContent = generateReviewCallBookedEmailHtml({ name, courseTitle, startTime, durationMinutes, joinLink });

    try {
        const { error } = await resend.emails.send({
            from: `Skyline Academics <${process.env.EMAIL_FROM}>`,
            to: email,
            subject: `Your Review Call is Confirmed - ${courseTitle}`,
            html: htmlContent
        });

        if (error) {
            console.error("Error sending review call booked email:", error);
            return false;
        }

        console.log(`Review call confirmation email sent to ${email}`);
        return true;
    } catch (error) {
        console.error("Error sending review call booked email:", error);
        return false;
    }
}

interface ReviewCallCancelledEmailProps {
    email: string;
    name: string;
    courseTitle: string;
    startTime: string; // ISO
}

// Sent by app/api/admin/review-calls/cancel/route.ts when an admin cancels
// a student's confirmed review call.
export async function sendReviewCallCancelledEmail({ email, name, courseTitle, startTime }: ReviewCallCancelledEmailProps) {
    const htmlContent = generateReviewCallCancelledEmailHtml({ name, courseTitle, startTime });

    try {
        const { error } = await resend.emails.send({
            from: `Skyline Academics <${process.env.EMAIL_FROM}>`,
            to: email,
            subject: `Your Review Call Was Cancelled - ${courseTitle}`,
            html: htmlContent
        });

        if (error) {
            console.error("Error sending review call cancelled email:", error);
            return false;
        }

        console.log(`Review call cancellation email sent to ${email}`);
        return true;
    } catch (error) {
        console.error("Error sending review call cancelled email:", error);
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
