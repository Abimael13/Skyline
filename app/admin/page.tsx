"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, DollarSign, Calendar, TrendingUp, Loader2, AlertCircle } from "lucide-react";
import { auth } from "@/lib/firebase";

interface RecentActivityItem {
    name: string;
    courseTitle: string;
    amount: number;
    currency: string;
    createdAt: string;
}

interface DashboardStats {
    totalStudents: number;
    totalEnrollments: number;
    totalRevenue: number;
    upcomingClassesCount: number;
    nextClass: { startDate: string; courseTitle: string } | null;
    recentActivity: RecentActivityItem[];
}

function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount);
}

function timeAgo(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                if (!auth.currentUser) {
                    throw new Error("You must be signed in as an admin to view dashboard stats.");
                }
                const idToken = await auth.currentUser.getIdToken();

                const response = await fetch("/api/admin/dashboard-stats", {
                    headers: { Authorization: `Bearer ${idToken}` },
                });

                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || "Failed to load dashboard stats.");
                }

                const data = await response.json();
                setStats(data);
            } catch (err: any) {
                console.error(err);
                setError(err.message || "Something went wrong loading the dashboard.");
            } finally {
                setLoading(false);
            }
        };

        // Wait for Firebase Auth to resolve the current user before fetching.
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) fetchStats();
            else {
                setLoading(false);
                setError("You must be signed in as an admin to view dashboard stats.");
            }
        });

        return () => unsubscribe();
    }, []);

    const statCards = stats
        ? [
            {
                label: "Total Revenue",
                value: formatCurrency(stats.totalRevenue, "usd"),
                sub: "All-time, from Stripe",
                icon: DollarSign,
                color: "text-green-400",
                bg: "bg-green-500/10",
            },
            {
                label: "Total Students",
                value: stats.totalStudents.toString(),
                sub: `${stats.totalEnrollments} course enrollment${stats.totalEnrollments === 1 ? "" : "s"}`,
                icon: Users,
                color: "text-blue-400",
                bg: "bg-blue-500/10",
            },
            {
                label: "Upcoming Classes",
                value: stats.upcomingClassesCount.toString(),
                sub: stats.nextClass
                    ? `Next: ${new Date(stats.nextClass.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${stats.nextClass.courseTitle}`
                    : "None scheduled",
                icon: Calendar,
                color: "text-purple-400",
                bg: "bg-purple-500/10",
            },
            {
                label: "Conversion Rate",
                value: "—",
                sub: "Not tracked yet (needs site traffic data)",
                icon: TrendingUp,
                color: "text-orange-400",
                bg: "bg-orange-500/10",
            },
        ]
        : [];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
                <p className="text-slate-400">Welcome back, Administrator.</p>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                </div>
            ) : error ? (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            ) : (
                <>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {statCards.map((stat, index) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-navy-900 border border-white/5 rounded-2xl p-6 hover:border-blue-500/30 transition-all"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                                        <stat.icon size={20} />
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                                <div className="text-sm text-slate-500">{stat.label}</div>
                                <div className="text-xs text-slate-600 mt-1" title={stat.sub}>{stat.sub}</div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Recent Activity */}
                        <div className="bg-navy-900 border border-white/5 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-white mb-6">Recent Activity</h3>
                            {stats && stats.recentActivity.length > 0 ? (
                                <div className="space-y-6">
                                    {stats.recentActivity.map((item, i) => (
                                        <div key={i} className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-xs">
                                                {item.name
                                                    .split(" ")
                                                    .map((n) => n[0])
                                                    .slice(0, 2)
                                                    .join("")
                                                    .toUpperCase() || "?"}
                                            </div>
                                            <div>
                                                <div className="text-white font-medium">
                                                    {item.name} enrolled in {item.courseTitle}
                                                </div>
                                                <div className="text-slate-500 text-sm">
                                                    {timeAgo(item.createdAt)} • {formatCurrency(item.amount, item.currency)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-500 text-sm">No paid enrollments yet.</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
