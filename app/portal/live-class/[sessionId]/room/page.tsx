"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// This route used to be a fake "Zoom classroom" with no real video at all
// (a simulated/animated placeholder), duplicating the real embedded video
// call now built into LiveClassPlayer (components/learning/LiveClassPlayer.tsx),
// which is reached via /portal/courses -> /portal/learning/[classId] or
// /portal/learn/[courseId]/[moduleId].
//
// This page is kept only as a redirect so that any old link, bookmark, or
// direct/typed URL still lands somewhere real instead of rendering the fake
// flow, regardless of how the student navigated here.
export default function ZoomClassroomPage(props: { params: Promise<{ sessionId: string }> }) {
    use(props.params);
    const router = useRouter();

    useEffect(() => {
        router.replace("/portal/courses");
    }, [router]);

    return (
        <div className="min-h-screen bg-navy-950 flex items-center justify-center text-blue-500">
            <Loader2 className="animate-spin" size={32} />
        </div>
    );
}
