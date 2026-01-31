"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Calendar,
    Users,
    DollarSign,
    Settings,
    LogOut,
    ShieldAlert,
    BookOpen,
    MonitorPlay,
    Building2,
    MessageCircle
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { clsx } from "clsx";

const menuItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/admin" },
    { icon: MonitorPlay, label: "Live Exams", href: "/admin/live-exams" },
    { icon: MonitorPlay, label: "Live Sessions", href: "/admin/live-sessions" },
    { icon: BookOpen, label: "Courses", href: "/admin/courses" },
    { icon: Calendar, label: "Schedule Manager", href: "/admin/schedule" },
    { icon: Users, label: "Students", href: "/admin/students" },
    { icon: MessageCircle, label: "Messages", href: "/admin/messages" },
    { icon: Building2, label: "Corporate Clients", href: "/admin/companies" },
    { icon: BookOpen, label: "Services Editor", href: "/admin/services" },
    { icon: DollarSign, label: "Financials", href: "/admin/finance" },
    { icon: Settings, label: "Settings", href: "/admin/settings" },
];

export function AdminSidebar() {
    const pathname = usePathname();
    const { signOut } = useAuth();

    return (
        <aside className="w-64 bg-navy-900 border-r border-white/5 flex flex-col fixed top-0 left-0 h-full z-40">
            {/* Branding */}
            <div className="p-6 border-b border-white/5">
                <Link href="/" className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/10">
                        <Image src="/logo.png" alt="Admin" fill className="object-cover" />
                    </div>
                    <div>
                        <span className="font-bold text-lg text-white block leading-none">Skyline</span>
                        <span className="text-xs text-blue-400 font-medium uppercase tracking-wider">Admin Portal</span>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                isActive
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Icon size={20} className={clsx(isActive ? "text-white" : "text-slate-500 group-hover:text-white")} />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer / User */}
            <div className="p-4 border-t border-white/5">
                <button
                    onClick={() => signOut()}
                    className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                >
                    <LogOut size={20} />
                    <span className="font-medium">Sign Out</span>
                </button>
            </div>
        </aside>
    );
}
