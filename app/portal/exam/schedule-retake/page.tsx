"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// This page used to let a student self-schedule an exam retake after a
// failed attempt - contact support / pick a date, no admin involvement.
// That directly contradicts the current exam policy: a maximum of two
// attempts, ever, and a failed first attempt can ONLY be followed by a
// second attempt if an admin explicitly reviews and approves it (see
// app/api/admin/approve-retake/route.ts and lib/examEligibility.ts for the
// full state machine). There is no legitimate self-service retake flow
// anymore, so this route no longer does anything on its own - it just
// forwards the student to the dashboard, which already shows the correct,
// state-appropriate message (awaiting review / cleared to retake / no
// attempts remaining) as a single source of truth instead of duplicating
// that logic here.
export default function ScheduleRetakeRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/portal/dashboard");
    }, [router]);

    return (
        <div className="min-h-screen bg-navy-950 flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
    );
}
