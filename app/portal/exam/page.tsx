"use client";

import { useState } from "react";
import { ExamPortal } from "@/components/learning/ExamPortal";
import { DeviceCheck } from "@/components/portal/DeviceCheck";

export default function ExamPage() {
    const [isDeviceVerified, setIsDeviceVerified] = useState(false);

    if (!isDeviceVerified) {
        return (
            <DeviceCheck
                checkType="exam"
                onPassed={() => setIsDeviceVerified(true)}
            />
        );
    }

    return <ExamPortal />;
}
