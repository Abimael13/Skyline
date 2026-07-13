// Escapes the five standard HTML-unsafe characters so user-supplied text
// can never be interpreted as markup (tags, attributes, etc.) when
// interpolated into these email templates.
function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

interface WelcomeEmailProps {
    name: string;
    courseTitle: string;
    startDate: string;
    portalLink: string;
}

export function generateWelcomeEmailHtml({ name, courseTitle, startDate, portalLink }: WelcomeEmailProps) {
    // `name` traces back to user-supplied data (public registration form body,
    // or Stripe checkout metadata/customer name) and is not validated for
    // HTML safety upstream, so it must be escaped before interpolation.
    const safeName = escapeHtml(name);
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px; }
            .header { background: #0f172a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .header img { height: 50px; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
            .h1 { color: #f8fafc; font-size: 24px; font-weight: bold; margin: 0; }
            .h2 { color: #0f172a; font-size: 20px; margin-top: 25px; }
            .btn { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .alert { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; color: #991b1b; }
            .info { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; color: #1e40af; }
            .footer { text-align: center; font-size: 12px; color: #64748b; margin-top: 20px; }
            .list-item { margin-bottom: 10px; padding-left: 20px; position: relative; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                 <h1 class="h1">Skyline Safety Services</h1>
            </div>
            <div class="content">
                <p>Hello <strong>${safeName}</strong>,</p>
                <p>Thank you for registering for <strong>${courseTitle}</strong>. Your seat is confirmed for the session beginning on <strong>${startDate}</strong>.</p>
                
                <div class="info">
                    <strong>🎓 Start Studying Now!</strong><br/>
                    Don't wait for the live session! Your Candidate Portal is now open. Start with Module 1 to get ahead. Students who complete the prep-modules early have a <strong>30% higher pass rate</strong>.
                </div>

                <center>
                    <a href="${portalLink}" class="btn">Access Candidate Portal</a>
                </center>

                <h2 class="h2">Your Next Steps</h2>
                <div class="list-item">1. Log in to the portal using the link above.</div>
                <div class="list-item">2. Download the attached <strong>FDNY Manual</strong> and <strong>CBT Success Guide</strong>.</div>
                <div class="list-item">3. Watch the "Welcome Video" on your dashboard.</div>

                <div class="alert">
                    <strong>⚠️ Technical Requirements</strong><br/>
                    To successfully complete this course, you must have a <strong>Laptop or Desktop computer</strong> (Windows or Mac) with a functional camera and microphone.
                    <br/><br/>
                    While cell phones and tablets may be used to view live Zoom lectures, they are <strong>strictly prohibited</strong> for the final graduation exams.
                </div>

                <h2 class="h2">Refund Policy</h2>
                <p style="font-size: 14px; color: #64748b;">
                    Cancellations must be made at least <strong>72 hours prior</strong> to the scheduled start date for a full refund. No refunds will be issued for cancellations made within 72 hours of the class start time.
                </p>
            </div>
            <div class="footer">
                © ${new Date().getFullYear()} Skyline Safety Services. All rights reserved.<br/>
                FDNY Accredited Training School
            </div>
        </div>
    </body>
    </html>
    `;
}

// Formats an ISO timestamp in Eastern time (this business operates out of
// NYC - see my-business context) so a review call time reads correctly for
// students regardless of what timezone the server the email was generated
// on happens to be running in.
function formatEasternDateTime(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleString('en-US', {
        timeZone: 'America/New_York',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
    });
}

interface BaseEmailProps {
    name: string;
    courseTitle: string;
}

export interface ExamPassEmailProps extends BaseEmailProps {
    score: number;
    certificateLink?: string; // If we use a link instead of attachment
}

export interface ExamFailEmailProps extends BaseEmailProps {
    score: number;
}

export const generateExamPassEmailHtml = ({ name, courseTitle, score }: ExamPassEmailProps) => {
    // `name` ultimately comes from the student's stored displayName (set by
    // the user at signup), so it is treated as user-controllable and escaped.
    const safeName = escapeHtml(name);
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
        .header { background-color: #1e3a8a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
        .score-box { background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .score-val { font-size: 24px; font-weight: bold; color: #166534; }
        .footer { font-size: 12px; color: #666; text-align: center; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Congratulations, Graduate!</h1>
        </div>
        <div class="content">
            <p>Dear ${safeName},</p>

            <p>We are thrilled to inform you that you have <strong>PASSED</strong> the Graduation Exam for <strong>${courseTitle}</strong>.</p>
            
            <div class="score-box">
                <p style="margin:0; font-size:14px; color:#166534;">Your Score</p>
                <div class="score-val">${score}%</div>
            </div>

            <p>Your official <strong>School Diploma</strong> is attached to this email as a PDF. Please save it for your records.</p>
            
            <h3>Next Steps: FDNY Computer Based Testing (CBT)</h3>
            <p>To obtain your Certificate of Fitness, you must now schedule your CBT with the FDNY.</p>
            <ol>
                <li>Create an account or log in to the <a href="https://fires.fdny.gov/citizen/access/s/" target="_blank">FDNY F.I.R.E.S. Portal</a>.</li>
                <li>Navigate to "Examinations" and search for the CoF type related to your course.</li>
                <li>Upload the attached School Diploma as proof of course completion.</li>
                <li>Pay the FDNY application fee and schedule your exam date.</li>
            </ol>
            
            <p>If you have any questions about this process, our support team is here to help.</p>
            
            <p>Best regards,<br/>Skyline Safety Services</p>
        </div>
        <div class="footer">
            &copy; ${new Date().getFullYear()} Skyline Safety Services. All rights reserved.
        </div>
    </div>
</body>
</html>
`;
};

export const generateExamFailEmailHtml = ({ name, courseTitle, score }: ExamFailEmailProps) => {
    // `name` ultimately comes from the student's stored displayName (set by
    // the user at signup), so it is treated as user-controllable and escaped.
    const safeName = escapeHtml(name);
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
        .header { background-color: #991b1b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #991b1b; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
        .score-box { background-color: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .score-val { font-size: 24px; font-weight: bold; color: #991b1b; }
        .footer { font-size: 12px; color: #666; text-align: center; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Exam Result Notification</h1>
        </div>
        <div class="content">
            <p>Dear ${safeName},</p>

            <p>This email is to notify you of the result of your recent Graduation Exam for <strong>${courseTitle}</strong>.</p>
            
            <div class="score-box">
                <p style="margin:0; font-size:14px; color:#991b1b;">Your Score</p>
                <div class="score-val">${score}%</div>
            </div>

            <p>Unfortunately, you did not meet the passing requirements on this attempt.</p>

            <h3>What Happens Next</h3>
            <p>Every candidate is allowed a maximum of two attempts at the graduation exam. Your result is now under review by our academics team - there is nothing you need to schedule or request yourself. If you're cleared for your second and final attempt, we'll send you a separate email with instructions to get started.</p>

            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/portal/dashboard" class="button">View My Dashboard</a>

            <p>Best regards,<br/>Skyline Safety Services</p>
        </div>
        <div class="footer">
            &copy; ${new Date().getFullYear()} Skyline Safety Services. All rights reserved.
        </div>
    </div>
</body>
</html>
`;
};

// Sent when an admin approves a student's second and final attempt at the
// graduation exam, after reviewing a failed first attempt
// (app/api/admin/approve-retake/route.ts). This is the only notification a
// student receives that they are cleared to retake - there is no
// self-service scheduling flow, so this email is what actually unblocks
// them.
export const generateRetakeApprovedEmailHtml = ({ name, courseTitle }: BaseEmailProps) => {
    // `name` ultimately comes from the student's stored displayName (set by
    // the user at signup), so it is treated as user-controllable and escaped.
    const safeName = escapeHtml(name);
    const portalLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/portal/exam`;
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
        .header { background-color: #1e3a8a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
        .alert { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; color: #92400e; }
        .footer { font-size: 12px; color: #666; text-align: center; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>You're Cleared to Retake Your Exam</h1>
        </div>
        <div class="content">
            <p>Dear ${safeName},</p>

            <p>We've reviewed your recent Graduation Exam attempt for <strong>${courseTitle}</strong>, and you've been approved for a retake.</p>

            <div class="alert">
                <strong>This is your final attempt.</strong> Every candidate is allowed a maximum of two attempts at the graduation exam, so please review your course materials carefully before you begin.
            </div>

            <p>When you're ready, log in to your student portal to start your proctored retake. You'll need the same setup as your first attempt: a Laptop or Desktop computer with a working camera and microphone.</p>

            <center>
                <a href="${portalLink}" class="button">Start Your Retake</a>
            </center>

            <p>Best regards,<br/>Skyline Safety Services</p>
        </div>
        <div class="footer">
            &copy; ${new Date().getFullYear()} Skyline Safety Services. All rights reserved.
        </div>
    </div>
</body>
</html>
`;
};

interface ReviewCallBookedEmailProps {
    name: string;
    courseTitle: string;
    startTime: string; // ISO
    durationMinutes: number;
    joinLink: string;
}

// Sent by app/api/review-calls/book/route.ts the moment a student books a
// 1:1 review call with an admin to talk through what they missed on a
// failed first attempt (see lib/reviewCalls.ts for the full data model).
// This is framed as a teaching conversation, not a right/wrong answer key
// handout, and it is explicitly separate from - and happens before - any
// retake decision (app/api/admin/approve-retake/route.ts).
export const generateReviewCallBookedEmailHtml = ({ name, courseTitle, startTime, durationMinutes, joinLink }: ReviewCallBookedEmailProps) => {
    // `name` ultimately comes from the student's stored displayName (set at
    // signup), so it is treated as user-controllable and escaped.
    const safeName = escapeHtml(name);
    const safeCourseTitle = escapeHtml(courseTitle);
    const whenText = formatEasternDateTime(startTime);
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
        .header { background-color: #1e3a8a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
        .time-box { background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .time-val { font-size: 20px; font-weight: bold; color: #1e3a8a; }
        .footer { font-size: 12px; color: #666; text-align: center; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Your Review Call is Confirmed</h1>
        </div>
        <div class="content">
            <p>Dear ${safeName},</p>

            <p>Your review call with our academics team is confirmed for <strong>${safeCourseTitle}</strong>. This is a chance to talk through what you missed on your first attempt, one on one, before any decision is made about a retake.</p>

            <div class="time-box">
                <p style="margin:0; font-size:14px; color:#1e3a8a;">Scheduled For</p>
                <div class="time-val">${whenText}</div>
                <p style="margin:8px 0 0; font-size:13px; color:#1e3a8a;">${durationMinutes} minutes</p>
            </div>

            <p>You can join a few minutes early using the link below. You'll need a working camera and microphone.</p>

            <center>
                <a href="${joinLink}" class="button">Join My Review Call</a>
            </center>

            <p>Need to reschedule? Reach out to our team and we'll help you find a new time.</p>

            <p>Best regards,<br/>Skyline Safety Services</p>
        </div>
        <div class="footer">
            &copy; ${new Date().getFullYear()} Skyline Safety Services. All rights reserved.
        </div>
    </div>
</body>
</html>
`;
};

interface ReviewCallCancelledEmailProps {
    name: string;
    courseTitle: string;
    startTime: string; // ISO
}

// Sent by app/api/admin/review-calls/cancel/route.ts when an admin cancels
// a student's confirmed review call slot.
export const generateReviewCallCancelledEmailHtml = ({ name, courseTitle, startTime }: ReviewCallCancelledEmailProps) => {
    const safeName = escapeHtml(name);
    const safeCourseTitle = escapeHtml(courseTitle);
    const whenText = formatEasternDateTime(startTime);
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
        .header { background-color: #475569; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
        .footer { font-size: 12px; color: #666; text-align: center; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Your Review Call Was Cancelled</h1>
        </div>
        <div class="content">
            <p>Dear ${safeName},</p>

            <p>Your review call for <strong>${safeCourseTitle}</strong>, originally scheduled for <strong>${whenText}</strong>, has been cancelled by our team.</p>

            <p>This does not change anything about your exam result - it's a separate, optional conversation. Log in to your student portal to book a new time if one is open, or reach out to our team directly.</p>

            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/portal/dashboard" class="button">View My Dashboard</a>

            <p>Best regards,<br/>Skyline Safety Services</p>
        </div>
        <div class="footer">
            &copy; ${new Date().getFullYear()} Skyline Safety Services. All rights reserved.
        </div>
    </div>
</body>
</html>
`;
};

export const generateVerificationEmailHtml = (code: string) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #f8fafc; padding: 40px 0; }
        .container { max-width: 480px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); text-align: center; }
        .logo { margin-bottom: 24px; font-weight: bold; font-size: 20px; color: #0f172a; }
        .code { font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #3b82f6; margin: 32px 0; font-family: monospace; background: #eff6ff; padding: 16px; border-radius: 8px; display: inline-block; }
        .text { color: #64748b; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
        .footer { margin-top: 32px; font-size: 12px; color: #94a3b8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">Skyline Safety Services</div>
        <h2>Verify Your Email</h2>
        <p class="text">Please enter the following verification code to complete your registration. This code will expire in 15 minutes.</p>
        
        <div class="code">${code}</div>
        
        <p class="text">If you didn't request this code, you can safely ignore this email.</p>
        
        <div class="footer">
            &copy; ${new Date().getFullYear()} Skyline Safety Services
        </div>
    </div>
</body>
</html>
`;

export interface ContactEmailProps {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
}

export const generateContactEmailHtml = ({ name, email, phone, subject, message }: ContactEmailProps) => {
    // All five fields come straight from an anonymous public contact form
    // submission (see app/api/contact/route.ts) with no HTML sanitization -
    // only length/format validation via Zod. Escape everything before it is
    // interpolated into this HTML email so a visitor can't inject markup
    // (e.g. a fake clickable link) into the notification your team reads.
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone);
    const safeSubject = escapeHtml(subject);
    // Escape the raw text first, then convert newlines to <br> so the two
    // operations compose correctly (the inserted <br> tags are not escaped).
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #f8fafc; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px; }
        .h2 { color: #0f172a; margin: 0; font-size: 24px; }
        .meta { margin-bottom: 20px; color: #64748b; font-size: 14px; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #334155; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; display: block; }
        .value { color: #0f172a; font-size: 16px; line-height: 1.5; }
        .message-box { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 10px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 class="h2">New Contact Form Submission</h2>
        </div>
        
        <div class="field">
            <span class="label">From</span>
            <div class="value">${safeName} &lt;${safeEmail}&gt;</div>
        </div>

        <div class="field">
            <span class="label">Phone</span>
            <div class="value">${safePhone || 'Not provided'}</div>
        </div>

        <div class="field">
            <span class="label">Subject</span>
            <div class="value">${safeSubject}</div>
        </div>

        <div class="field">
            <span class="label">Message</span>
            <div class="message-box value">${safeMessage}</div>
        </div>

        <div class="footer">
            Sent from Skyline Safety Services Website
        </div>
    </div>
</body>
</html>
`;
};
