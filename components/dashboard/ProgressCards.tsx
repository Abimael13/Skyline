"use client";

import { motion } from "framer-motion";

interface ProgressCardProps {
    percentage: number;
    label: string;
    sublabel: string;
}

export function ProgressCard({ percentage, label, sublabel }: ProgressCardProps) {
    const circumference = 2 * Math.PI * 45; // radius = 45
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="bg-navy-900 border border-white/5 rounded-2xl p-6 flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[50px] rounded-full pointer-events-none" />

            <div className="relative z-10">
                <h3 className="text-lg font-semibold text-white mb-1">{label}</h3>
                <p className="text-slate-400 text-sm">{sublabel}</p>
                <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-blue-900/30 text-blue-300 text-xs font-medium border border-blue-500/20">
                    In Progress
                </div>
            </div>

            <div className="relative w-28 h-28 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    {/* Background Circle */}
                    <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#1e293b"
                        strokeWidth="8"
                    />
                    {/* Progress Circle */}
                    <motion.circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">{percentage}%</span>
                </div>
            </div>
        </div>
    );
}
