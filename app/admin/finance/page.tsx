"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { DollarSign, Building2, ArrowUpRight, Download } from "lucide-react";

export default function FinancePage() {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Financials</h1>
                    <p className="text-slate-400">Manage payouts and view transaction history.</p>
                </div>
                <Button variant="outline">
                    <Download size={18} className="mr-2" /> Export Report
                </Button>
            </div>

            {/* Banking Integration Card */}
            <div className="bg-gradient-to-br from-navy-900 to-navy-950 border border-white/10 rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 blur-[80px] rounded-full pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-navy-800 rounded-2xl flex items-center justify-center border border-white/5 shadow-xl">
                            <Building2 size={32} className="text-slate-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">Payout Method</h2>
                            <p className="text-slate-400 text-sm max-w-md">
                                Link your bank account to receive automatic daily payouts via Stripe.
                            </p>
                        </div>
                    </div>
                    <Button className="bg-white text-navy-950 hover:bg-slate-200 border-none shadow-lg shadow-white/10 whitespace-nowrap">
                        Link Bank Account <ArrowUpRight size={18} className="ml-2" />
                    </Button>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-navy-900 border border-white/5 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5">
                    <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-navy-950 text-slate-400 text-sm font-medium uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Student</th>
                                <th className="px-6 py-4">Course</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {[1, 2, 3, 4, 5].map((_, i) => (
                                <tr key={i} className="text-sm text-slate-300 hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white">John Doe</td>
                                    <td className="px-6 py-4">F-89: Fire Life Safety Director</td>
                                    <td className="px-6 py-4 text-slate-500">Jan 18, 2026</td>
                                    <td className="px-6 py-4 text-right font-mono">$450.00</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                                            Paid
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
