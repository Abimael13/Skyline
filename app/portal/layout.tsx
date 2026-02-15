"use client";

import { PortalSidebar } from "@/components/layout/PortalSidebar";
import { useAuth } from "@/lib/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";

function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const isExamPage = pathname === "/portal/exam";

    const [isMobile, setIsMobile] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login"); // Redirect to login if not authenticated
        }
        // Mobile Warning Check
        const ua = navigator.userAgent;
        const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        setIsMobile(mobile);
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-navy-950 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
        );
    }



    if (!user) return null; // Don't render anything while redirecting

    return (
        <div className="min-h-screen bg-navy-900">
            {/* Mobile Warning Banner */}
            {isMobile && !isExamPage && (
                <div className="bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-400 px-4 py-2 text-xs md:text-sm font-medium text-center flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                    Class access permitted. Note: Your Graduation Exam MUST be taken on a Laptop or Desktop computer per FDNY regulations.
                </div>
            )}

            {!isExamPage && <PortalSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />}

            <div className={`${isExamPage ? "w-full" : "lg:ml-64"} min-h-screen transition-all duration-300`}>
                {!isExamPage && (
                    <header className="h-16 border-b border-white/5 bg-navy-950/50 backdrop-blur-sm px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
                        <div className="flex items-center">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="lg:hidden mr-4 text-slate-400 hover:text-white transition-colors"
                            >
                                <Menu size={24} />
                            </button>
                            <h2 className="text-white font-medium">Dashboard</h2>
                        </div>
                        {/* Add User Profile dropdown here later */}
                        <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                            {user.email?.[0].toUpperCase()}
                        </div>
                    </header>
                )}
                <main className={isExamPage ? "" : "p-8"}>
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function PortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedLayout>{children}</ProtectedLayout>
    );
}
