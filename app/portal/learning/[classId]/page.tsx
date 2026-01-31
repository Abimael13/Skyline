"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { COURSES, Module } from "@/lib/courses";
import { ClassPlayer } from "@/components/learning/ClassPlayer";

export default function ClassPage({ params }: { params: Promise<{ classId: string }> }) {
    // Unwrap params using React.use() or async await pattern for Next.js 15
    const resolvedParams = use(params);
    const [session, setSession] = useState<Module | null>(null);

    useEffect(() => {
        // Find the F-89 course first
        const f89Course = COURSES.find(c => c.id === "f89-flsd");
        if (f89Course) {
            // Find the specific class session within the course modules
            const foundSession = f89Course.modules.find(m => m.id === resolvedParams.classId);
            if (foundSession) {
                setSession(foundSession);
            }
        }
    }, [resolvedParams.classId]);

    // Simple loading or not found state
    if (!session) {
        // In a real app we might want to show a skeleton or redirect
        const f89Course = COURSES.find(c => c.id === "f89-flsd");
        const exists = f89Course?.modules.some(m => m.id === resolvedParams.classId);

        if (exists === false && session === null) {
            // Let standard notFound handling take over if confirmed missing
            // return notFound(); 
            // Only returning null for now to prevent hydration mismatch during initial render
            return <div className="min-h-screen bg-navy-950 flex items-center justify-center text-slate-500">Loading Class Content...</div>;
        }
        return <div className="min-h-screen bg-navy-950 flex items-center justify-center text-slate-500">Loading...</div>;
    }

    return <ClassPlayer session={session} courseId="f89-flsd" />;
}
