"use client";

import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ArrowLeft, Calendar, Mail } from "lucide-react";

export default function ScheduleRetakePage() {
    const { user } = useAuth();
    const userName = user?.displayName || user?.email?.split("@")[0] || "Candidate";

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <Link href="/portal/dashboard">
                <Button variant="ghost" className="mb-4 pl-0 text-slate-400 hover:text-white hover:bg-transparent">
                    <ArrowLeft size={16} className="mr-2" />
                    Back to Dashboard
                </Button>
            </Link>

            <div className="bg-navy-900 border border-white/5 rounded-2xl p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
                    <Calendar size={32} />
                </div>

                <h1 className="text-3xl font-bold text-white">Schedule Exam Retake</h1>

                <p className="text-slate-300 max-w-lg mx-auto">
                    We understand that the exam can be challenging. You are eligible to schedule a retake within 30 days of your initial attempt.
                </p>

                <div className="bg-white/5 border border-white/5 rounded-xl p-6 max-w-lg mx-auto text-left space-y-4">
                    <h3 className="font-semibold text-white">Retake Policy</h3>
                    <ul className="text-sm text-slate-400 space-y-2 list-disc pl-5">
                        <li>Retakes must be scheduled at least 24 hours in advance.</li>
                        <li>A retake fee may apply depending on your course package.</li>
                        <li>You must bring valid ID to the retake session.</li>
                    </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <Link href="/contact?subject=Exam Retake Request">
                        <Button className="w-full sm:w-auto flex items-center gap-2">
                            <Mail size={16} />
                            Contact to Schedule
                        </Button>
                    </Link>
                    <Link href="/portal/calendar">
                        <Button variant="outline" className="w-full sm:w-auto">
                            View Available Dates
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
