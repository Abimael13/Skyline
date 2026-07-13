"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

// NOTE ON SECURITY: The check below (redirecting non-admins away) is a
// client-side UX convenience only - it stops a logged-in student from
// briefly seeing the admin UI flash on screen. It is NOT a security
// boundary: anyone can disable JavaScript, call the admin API routes
// directly, or edit their own `role` field in this same browser session,
// since this check runs entirely in the browser. The real access control
// lives server-side: `requireAdmin()` in lib/firebaseAdmin.ts (checked in
// admin API routes) and the `isAdmin()` checks in firestore.rules (checked
// by Firestore itself, using the `admin` custom claim on the user's auth
// token, not this `role` value). Do not add more logic here expecting it to
// keep anyone out - it can't.
export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const { user, role, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/login");
            } else if (role !== "admin") {
                router.push("/portal/dashboard");
            }
        }
    }, [user, role, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-navy-950 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-navy-950 flex">
            <AdminSidebar />
            <main className="flex-1 ml-64 p-8 lg:p-12 overflow-y-auto">
                <div className="max-w-6xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
