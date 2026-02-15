"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Shield, LayoutDashboard, BookOpen, FileText, Settings, LogOut, ShoppingBag } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { clsx } from "clsx";

const menuItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/portal/dashboard" },
    { icon: ShoppingBag, label: "Course Catalog", href: "/portal/catalog" },
    { icon: BookOpen, label: "My Courses", href: "/portal/courses" },
    { icon: FileText, label: "Documents", href: "/portal/documents" },
    { icon: Settings, label: "Settings", href: "/portal/settings" },
    { icon: Shield, label: "Admin Portal", href: "/admin" },
];

interface PortalSidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export function PortalSidebar({ isOpen = false, onClose }: PortalSidebarProps) {
    const pathname = usePathname();
    const { signOut, role } = useAuth();

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={clsx(
                    "fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity",
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar */}
            <aside
                className={clsx(
                    "fixed top-0 left-0 h-screen w-64 bg-navy-950 border-r border-white/5 flex flex-col z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="p-6">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/10">
                            <Image src="/logo.png" alt="Skyline Safety" fill className="object-cover" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-lg text-white leading-none tracking-tight">
                                Skyline
                            </span>
                            <span className="font-bold text-lg text-blue-500 leading-none tracking-tight">
                                Safety Services
                            </span>
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                    <div className="px-2 mb-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Menu
                    </div>
                    {menuItems.map((item) => {
                        // Hide Admin Portal if not admin
                        if (item.href === "/admin" && role !== "admin") return null;

                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose} // Close sidebar on mobile when link clicked
                                className={clsx(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <item.icon size={18} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={() => signOut()}
                        className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-900/10 transition-colors text-sm font-medium"
                    >
                        <LogOut size={18} />
                        Sign Out
                    </button>
                </div>
            </aside>
        </>
    );
}
