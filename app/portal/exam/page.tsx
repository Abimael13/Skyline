"use client";

import { useState } from "react";
import { ExamPortal } from "@/components/learning/ExamPortal";
import { DeviceCheck } from "@/components/portal/DeviceCheck";
import { ExamAttemptGate } from "@/components/learning/ExamAttemptGate";

// The graduation exam currently only exists for f89-flsd (same hardcoded
// assumption ExamPortal.tsx already makes for its question bank/session ID).
const COURSE_ID = "f89-flsd";

export default function ExamPage() {
    const [isDeviceVerified, setIsDeviceVerified] = useState(false);

    // Attempt-cap check FIRST, before the student is walked through the
    // device/camera/mic verification flow at all. This is a UX nicety on
    // top of the real, server-side enforcement in
    // app/api/exam/submit/route.ts - it just avoids sending an ineligible
    // student through the whole proctoring setup only to be rejected at the
    // final submit step.
    return (
        <ExamAttemptGate courseId={COURSE_ID}>
            {!isDeviceVerified ? (
                <DeviceCheck
                    checkType="exam"
                    onPassed={() => setIsDeviceVerified(true)}
                />
            ) : (
                <ExamPortal />
            )}
        </ExamAttemptGate>
    );
}
