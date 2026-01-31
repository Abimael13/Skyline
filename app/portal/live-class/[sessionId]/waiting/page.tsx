"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck } from "lucide-react";

// Placeholder for Waiting Room Page
export default function WaitingRoomPage(props: { params: Promise<{ sessionId: string }> }) {
    const params = use(props.params);
    const router = useRouter();
    const [status, setStatus] = useState("waiting"); // 'waiting' | 'admitted'

    useEffect(() => {
        // Simulate real-time listener for admission
        const interval = setInterval(() => {
            // In real app, this would check Firestore
            // For demo, we just auto-admit after 3 seconds
            setStatus("admitted");
            setTimeout(() => {
                router.push(`/portal/live-class/${params.sessionId}/room`);
            }, 1000); // Small delay to show success state
        }, 5000);

        return () => clearInterval(interval);
    }, [router, params.sessionId]);

    return (
        <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-6 text-white text-center">
            <div className="max-w-md w-full space-y-8">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative w-24 h-24 mx-auto"
                >
                    {status === "waiting" ? (
                        <div className="w-full h-full bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400">
                            <Loader2 size={48} className="animate-spin" />
                        </div>
                    ) : (
                        <div className="w-full h-full bg-green-500/10 rounded-full flex items-center justify-center text-green-400">
                            <ShieldCheck size={48} />
                        </div>
                    )}
                </motion.div>

                <div>
                    <h1 className="text-3xl font-bold mb-2">
                        {status === "waiting" ? "Waiting for Instructor" : "You're In!"}
                    </h1>
                    <p className="text-slate-400">
                        {status === "waiting"
                            ? "Your ID is being reviewed. Please sit tight, you will be automatically admitted shortly."
                            : "Redirecting you to the live class..."}
                    </p>
                </div>
            </div>
        </div>
    );
}
