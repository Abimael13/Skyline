import nodemailer from "nodemailer";
import { generateWelcomeEmailHtml, generateExamPassEmailHtml, generateExamFailEmailHtml, generateVerificationEmailHtml } from "./email-templates";

// Simple in-memory transporter (reusing the one from contact form if possible, or new one)
// For production, these should be env vars
const transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

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
        await transporter.sendMail({
            from: `"Skyline Admissions" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Welcome to ${courseTitle} - Start Your Training`,
            html: htmlContent,
            attachments: [
                // Mock attachments for the demo - in prod these would be real files/links
                // { filename: 'FDNY_flsd_manual.pdf', path: 'https://example.com/manual.pdf' } 
            ]
        });
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
                path: diplomaDownloadUrl // Nodemailer can fetch from URL
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
        await transporter.sendMail({
            from: `"Skyline Academics" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: subject,
            html: htmlContent,
            attachments: attachments
        });
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
        await transporter.sendMail({
            from: `"Skyline Security" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Verify your email address",
            html: htmlContent
        });
        console.log(`Verification code sent to ${email}`);
        return true;
    } catch (error) {
        console.error("Error sending verification email:", error);
        return false;
    }
}
