interface WelcomeEmailProps {
    name: string;
    courseTitle: string;
    startDate: string;
    portalLink: string;
}

export function generateWelcomeEmailHtml({ name, courseTitle, startDate, portalLink }: WelcomeEmailProps) {
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
                <p>Hello <strong>${name}</strong>,</p>
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
    retakeDateLimit: string; // 30 days from now
}

export const generateExamPassEmailHtml = ({ name, courseTitle, score }: ExamPassEmailProps) => `
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
            <p>Dear ${name},</p>
            
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

export const generateExamFailEmailHtml = ({ name, courseTitle, score, retakeDateLimit }: ExamFailEmailProps) => `
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
            <p>Dear ${name},</p>
            
            <p>This email is to notify you of the result of your recent Graduation Exam for <strong>${courseTitle}</strong>.</p>
            
            <div class="score-box">
                <p style="margin:0; font-size:14px; color:#991b1b;">Your Score</p>
                <div class="score-val">${score}%</div>
            </div>

            <p>Unfortunately, you did not meet the passing requirements on this attempt.</p>
            
            <h3>Retake Policy</h3>
            <p>You are eligible for a makeup exam. <strong>You must complete this retake by ${retakeDateLimit}</strong> (30 days from today).</p>
            
            <p>Please log in to your student portal to schedule your retake session as soon as possible to ensure you complete the course within the allowed timeframe.</p>
            
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/portal" class="button">Log In to Schedule Retake</a>
            
            <p>Best regards,<br/>Skyline Safety Services</p>
        </div>
        <div class="footer">
            &copy; ${new Date().getFullYear()} Skyline Safety Services. All rights reserved.
        </div>
    </div>
</body>
</html>
`;

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
