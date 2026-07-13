"use client";

import { Loader2, ShieldAlert, Clock, Trophy, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/AuthContext";
import { getExamAttemptEligibility, EXAM_INELIGIBLE_MESSAGES, ExamResultRecord } from "@/lib/examEligibility";

// Real, working contact info shown whenever a student is stuck waiting on
// admin review or has run out of attempts - support@skylinesafetyservices.com
// is the same verified sending address used across lib/email.ts's
// EMAIL_FROM; the phone number matches the one shown on app/contact/page.tsx.
const SUPPORT_EMAIL = "support@skylinesafetyservices.com";
const SUPPORT_PHONE_DISPLAY = "(718) 323-8600";
const SUPPORT_PHONE_TEL = "+17183238600";

// Client-side gate that sits in front of the entire proctoring flow
// (device check, ID verification, LiveKit connection, etc. - see
// app/portal/exam/page.tsx). It reads the same examResults the dashboard
// already reads via AuthContext and runs it through the same eligibility
// function the server uses (lib/examEligibility.ts), so a student who isn't
// currently allowed to start an attempt never gets past this screen.
//
// IMPORTANT: this is a UX convenience only. A student cannot get a real
// score out of this - even if this gate were somehow bypassed (stale data,
// a modified client, etc.), app/api/exam/submit/route.ts independently
// re-checks eligibility server-side, inside a transaction, before grading
// or writing any result. This component exists purely so an ineligible
// student isn't walked through the whole camera/mic/ID setup only to be
// rejected at the very last step.
export function ExamAttemptGate({
    courseId,
    children,
}: {
    courseId: string;
    children: React.ReactNode;
}) {
    const { examResults, loading } = useAuth();
    const router = useRouter();

    if (loading) {
        return (
            <div className="min-h-screen bg-navy-950 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    const result = examResults?.[courseId] as ExamResultRecord | undefined;
    const eligibility = getExamAttemptEligibility(result);

    if (eligibility.eligible) {
        return <>{children}</>;
    }

    // Icon/title are presentational chrome only - the actual body copy
    // always comes from lib/examEligibility.ts's EXAM_INELIGIBLE_MESSAGES,
    // the single shared source of truth also used by
    // app/portal/dashboard/page.tsx, so the two surfaces never drift apart.
    const meta = {
        passed: {
            icon: <Trophy size={40} />,
            iconClass: "bg-green-500/10 text-green-500",
            title: "You've Already Passed This Exam",
            showContact: false,
        },
        "awaiting-review": {
            icon: <Clock size={40} />,
            iconClass: "bg-yellow-500/10 text-yellow-500",
            title: "Your Exam Is Under Review",
            showContact: true,
        },
        "attempts-exhausted": {
            icon: <ShieldAlert size={40} />,
            iconClass: "bg-red-500/10 text-red-500",
            title: "No Further Attempts Available",
            showContact: true,
        },
        "invalid-record": {
            icon: <AlertTriangle size={40} />,
            iconClass: "bg-yellow-500/10 text-yellow-500",
            title: "We Need to Look Into This",
            showContact: true,
        },
    }[eligibility.reason];

    return (
        <div className="min-h-screen bg-navy-950 flex items-center justify-center p-8 text-center text-white">
            <div className="max-w-md bg-navy-900 border border-white/10 p-8 rounded-3xl">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${meta.iconClass}`}>
                    {meta.icon}
                </div>
                <h2 className="text-2xl font-bold mb-4">{meta.title}</h2>
                <p className={`text-slate-400 ${meta.showContact ? "mb-6" : "mb-8"}`}>{EXAM_INELIGIBLE_MESSAGES[eligibility.reason]}</p>
                {meta.showContact && (
                    <p className="text-slate-400 mb-8 text-sm">
                        Email{" "}
                        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-400 hover:text-blue-300 font-medium">
                            {SUPPORT_EMAIL}
                        </a>{" "}
                        or call{" "}
                        <a href={`tel:${SUPPORT_PHONE_TEL}`} className="text-blue-400 hover:text-blue-300 font-medium">
                            {SUPPORT_PHONE_DISPLAY}
                        </a>
                        .
                    </p>
                )}
                <Button onClick={() => router.push("/portal/dashboard")} className="w-full">
                    Return to Dashboard
                </Button>
            </div>
        </div>
    );
}
