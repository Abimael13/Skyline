"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckSquare, Square } from "lucide-react";

interface EligibilityCheckProps {
    requirements: string[];
    onVerified: (isVerified: boolean) => void;
}

export function EligibilityCheck({ requirements, onVerified }: EligibilityCheckProps) {
    const [isChecked, setIsChecked] = useState(false);

    const handleCheck = () => {
        const newState = !isChecked;
        setIsChecked(newState);
        onVerified(newState);
    };

    return (
        <div className="bg-navy-900 border border-blue-500/30 rounded-2xl p-6 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full pointer-events-none" />

            <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="text-blue-400 shrink-0 mt-1" size={20} />
                <div>
                    <h3 className="text-lg font-bold text-white">FDNY Eligibility Requirements</h3>
                    <p className="text-sm text-slate-400">Please confirm you meet the following criteria before enrolling:</p>
                </div>
            </div>

            <ul className="space-y-2 mb-6 ml-1">
                {requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        {req}
                    </li>
                ))}
            </ul>

            <button
                onClick={handleCheck}
                className="flex items-center gap-3 w-full p-3 rounded-xl bg-navy-950 border border-white/10 hover:border-blue-500/50 transition-colors group"
            >
                <div className={`shrink-0 transition-colors ${isChecked ? "text-blue-500" : "text-slate-600 group-hover:text-slate-400"}`}>
                    {isChecked ? <CheckSquare size={24} /> : <Square size={24} />}
                </div>
                <span className="text-sm font-medium text-left text-slate-300 group-hover:text-white transition-colors">
                    I verify that I meet the above experience and eligibility requirements.
                </span>
            </button>
        </div>
    );
}
