"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, arrayUnion } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Shield, AlertCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Check for pending enrollment (from Upfront Payment)
            const pendingEnrollment = sessionStorage.getItem("pendingEnrollment");
            if (pendingEnrollment) {
                // Non-blocking background update
                (async () => {
                    try {
                        const { courseId, paid } = JSON.parse(pendingEnrollment);
                        if (paid && courseId) {
                            const userDocRef = doc(db, "users", user.uid);
                            // Attempt to update profile
                            await setDoc(userDocRef, {
                                email: user.email,
                                enrolledCourses: arrayUnion(courseId)
                            }, { merge: true });
                            sessionStorage.removeItem("pendingEnrollment");
                        }
                    } catch (e) {
                        console.warn("Background enrollment sync issue:", e);
                    }
                })();
            }

            router.push("/portal/dashboard");
        } catch (err: any) {
            console.error(err);
            if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
                setError("Incorrect email or password.");
            } else if (err.code === "auth/too-many-requests") {
                setError("Too many attempts. Please restart your device.");
            } else {
                setError("Failed to sign in. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-navy-950">
            {/* Left: Branding */}
            <div className="hidden lg:flex flex-col justify-between p-12 bg-navy-900 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-blue-900/10" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/30 blur-[120px] rounded-full pointer-events-none" />

                <div className="relative z-10">
                    <Link href="/" className="flex items-center gap-3 mb-12">
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-2xl shadow-blue-500/20 border border-white/10">
                            <Image src="/logo.png" alt="Skyline Safety Services" fill className="object-cover" />
                        </div>
                        <span className="font-bold text-2xl text-white tracking-tight">
                            Skyline <span className="text-blue-500">Safety Services</span>
                        </span>
                    </Link>

                    <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
                        Welcome to the <br />
                        Candidate Portal
                    </h1>
                    <p className="text-xl text-slate-400 max-w-md">
                        Track your course progress, access study materials, and manage your certification journey.
                    </p>
                </div>

                <div className="relative z-10 text-slate-500 text-sm">
                    © {new Date().getFullYear()} Skyline Safety Service.
                </div>
            </div>

            {/* Right: Login Form */}
            <div className="flex items-center justify-center p-6 lg:p-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md space-y-8"
                >
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-white">Sign In</h2>
                        <p className="mt-2 text-slate-400">
                            New user? <Link href="/signup" className="text-blue-500 hover:text-blue-400 font-medium">Create an account</Link>
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="p-4 rounded-lg bg-red-900/20 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium text-slate-300">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-navy-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all placeholder:text-slate-600"
                                placeholder="name@example.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium text-slate-300">Password</label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-navy-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all placeholder:text-slate-600"
                                placeholder="••••••••"
                            />
                        </div>

                        <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={loading}>
                            Sign In
                        </Button>

                        <p className="text-center text-sm text-slate-500">
                            <Link href="#" className="hover:text-slate-400 transition-colors">Forgot your password?</Link>
                        </p>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}
