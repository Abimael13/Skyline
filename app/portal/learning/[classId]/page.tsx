"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { Module } from "@/lib/courses";
import { getCourseById } from "@/lib/db";
import { ClassPlayer } from "@/components/learning/ClassPlayer";

export default function ClassPage({ params }: { params: Promise<{ classId: string }> }) {
    // Unwrap params using React.use() or async await pattern for Next.js 15
    const resolvedParams = use(params);
    const [session, setSession] = useState<Module | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSession = async () => {
            // Find the F-89 course first (async from DB)
            const f89Course = await getCourseById("f89-flsd");

            if (f89Course) {
                // Find the specific class session within the course modules
                const foundSession = f89Course.modules.find(m => m.id === resolvedParams.classId);
                if (foundSession) {
                    setSession(foundSession);
                }
            }
            setLoading(false);
        };

        fetchSession();
    }, [resolvedParams.classId]);

    // Simple loading or not found state
    if (loading) {
        return <div className="min-h-screen bg-navy-950 flex items-center justify-center text-slate-500">Loading Class Content...</div>;
    }

    if (!session) {
        // In a real app we might want to show a skeleton or redirect
        // For now, if we loaded and didn't find it:
        return <div className="min-h-screen bg-navy-950 flex items-center justify-center text-slate-500">Class Session Not Found</div>;
    }

    return <ClassPlayer session={session} courseId="f89-flsd" />;
}
