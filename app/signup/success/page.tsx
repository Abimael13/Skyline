"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";

function PaymentSuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter(); // Use router if needed, but not used in this snippet currently
    const sessionId = searchParams.get("session_id");

    return (
        <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-navy-900 border border-white/10 rounded-2xl p-8 text-center shadow-2xl shadow-blue-900/20"
            >
                <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={40} />
                </div>

                <h1 className="text-3xl font-bold text-white mb-4">Enrollment Confirmed!</h1>
                <p className="text-slate-400 mb-8 leading-relaxed">
                    Thank you for your purchase. You are now enrolled in the course. A confirmation email has been sent to your inbox.
                </p>

                <div className="space-y-4">
                    <Link href="/portal/dashboard?refresh=true">
                        <Button className="w-full" size="lg">
                            Go to Dashboard <ArrowRight size={18} className="ml-2" />
                        </Button>
                    </Link>

                    <div className="text-xs text-slate-500">
                        Transaction ID: <span className="font-mono text-slate-400">{sessionId ? sessionId.slice(-8) : "N/A"}</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-navy-950 flex items-center justify-center text-white">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        }>
            <PaymentSuccessContent />
        </Suspense>
    );
}
