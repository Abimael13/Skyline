"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Building2, ArrowUpRight, Download, Loader2, AlertCircle } from "lucide-react";
import { auth } from "@/lib/firebase";

interface Transaction {
    id: string;
    studentName: string;
    studentEmail: string | null;
    courseTitle: string;
    date: string;
    amount: number;
    currency: string;
    status: string;
}

function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount);
}

function statusBadge(status: string) {
    if (status === "paid") {
        return (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                Paid
            </span>
        );
    }
    return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20 capitalize">
            {status.replace(/_/g, " ")}
        </span>
    );
}

export default function FinancePage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                if (!auth.currentUser) {
                    throw new Error("You must be signed in as an admin to view transactions.");
                }
                const idToken = await auth.currentUser.getIdToken();

                const response = await fetch("/api/admin/transactions", {
                    headers: { Authorization: `Bearer ${idToken}` },
                });

                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || "Failed to load transactions.");
                }

                const data = await response.json();
                setTransactions(data.transactions || []);
            } catch (err: any) {
                console.error(err);
                setError(err.message || "Something went wrong loading transactions.");
            } finally {
                setLoading(false);
            }
        };

        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) fetchTransactions();
            else {
                setLoading(false);
                setError("You must be signed in as an admin to view transactions.");
            }
        });

        return () => unsubscribe();
    }, []);

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
                                Payouts are managed by Stripe using the bank account already connected to this
                                Stripe account. Manage or update it directly in the Stripe Dashboard.
                            </p>
                        </div>
                    </div>
                    <Button
                        href="https://dashboard.stripe.com/settings/payouts"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white text-navy-950 hover:bg-slate-200 border-none shadow-lg shadow-white/10 whitespace-nowrap"
                    >
                        Manage Payouts in Stripe <ArrowUpRight size={18} className="ml-2" />
                    </Button>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-navy-900 border border-white/5 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5">
                    <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="animate-spin text-blue-500" size={32} />
                    </div>
                ) : error ? (
                    <div className="p-6">
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                            <AlertCircle size={16} /> {error}
                        </div>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">No transactions yet.</div>
                ) : (
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
                                {transactions.map((tx) => (
                                    <tr key={tx.id} className="text-sm text-slate-300 hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">
                                            {tx.studentName}
                                            {tx.studentEmail && (
                                                <div className="text-slate-500 text-xs font-normal">{tx.studentEmail}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">{tx.courseTitle}</td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {new Date(tx.date).toLocaleDateString(undefined, {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono">
                                            {formatCurrency(tx.amount, tx.currency)}
                                        </td>
                                        <td className="px-6 py-4 text-center">{statusBadge(tx.status)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
