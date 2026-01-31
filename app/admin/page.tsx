"use client";

import { motion } from "framer-motion";
import { Users, DollarSign, Calendar, TrendingUp } from "lucide-react";

export default function AdminDashboard() {
    const stats = [
        { label: "Total Revenue", value: "$12,450", change: "+12%", icon: DollarSign, color: "text-green-400", bg: "bg-green-500/10" },
        { label: "Active Students", value: "142", change: "+8%", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
        { label: "Upcoming Classes", value: "8", change: "Next: Feb 10", icon: Calendar, color: "text-purple-400", bg: "bg-purple-500/10" },
        { label: "Conversion Rate", value: "3.2%", change: "+0.4%", icon: TrendingUp, color: "text-orange-400", bg: "bg-orange-500/10" },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
                <p className="text-slate-400">Welcome back, Administrator.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
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
                            <span className="text-xs font-medium text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                                {stat.change}
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                        <div className="text-sm text-slate-500">{stat.label}</div>
                    </motion.div>
                ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Recent Activity */}
                <div className="bg-navy-900 border border-white/5 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6">Recent Activity</h3>
                    <div className="space-y-6">
                        {[1, 2, 3].map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-xs">
                                    JS
                                </div>
                                <div>
                                    <div className="text-white font-medium">John Smith enrolled in F-89</div>
                                    <div className="text-slate-500 text-sm">2 hours ago • $450.00</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
