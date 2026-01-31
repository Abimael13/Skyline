"use client";

import { useEffect, useState, use } from "react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

// Placeholder for Zoom Classroom
export default function ZoomClassroomPage(props: { params: Promise<{ sessionId: string }> }) {
    const params = use(props.params);
    const [joined, setJoined] = useState(false);

    useEffect(() => {
        // Log attendance join time here
        console.log("User joined class session:", params.sessionId);
    }, [params.sessionId]);

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Header */}
            <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-navy-900">
                <h1 className="font-bold">Live Class: F-89 Fire Life Safety</h1>
                <Link href="/portal/dashboard">
                    <Button variant="outline" size="sm" className="text-xs">
                        Leave Class
                    </Button>
                </Link>
            </header>

            {/* Main Content (Zoom Iframe Placeholder) */}
            <div className="flex-grow flex items-center justify-center bg-gray-900 relative">
                {!joined ? (
                    <div className="text-center">
                        <p className="mb-4 text-slate-400">Click to connect to audio/video</p>
                        <Button onClick={() => setJoined(true)}>
                            Join Zoom Meeting
                        </Button>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                        {/* 
                           In a real implementation, you would use:
                           <ZoomMtg /> component or iframe here
                           For now, we simulate the embedded experience.
                        */}
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 bg-blue-600 rounded-xl mx-auto flex items-center justify-center animate-pulse">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                            </div>
                            <p className="text-xl font-medium text-white">Zoom Meeting in Progress...</p>
                            <p className="text-sm">Attendance is being recorded.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
