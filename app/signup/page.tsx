"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs, increment, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Shield, AlertCircle, Loader2, CheckCircle, Mail } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export default function SignupPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // 2FA State
    const [showVerification, setShowVerification] = useState(false);
    const [verificationCode, setVerificationCode] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationSent, setVerificationSent] = useState(false);

    // Corporate Registration State
    const [isCorporate, setIsCorporate] = useState(false);
    const [companyCode, setCompanyCode] = useState("");

    // Temp storage for validated data before creation
    const [validatedData, setValidatedData] = useState<{ linkedCompanyId: string | null, uniqueCodeRef: any | null } | null>(null);

    const router = useRouter();

    const handleInitialSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            let linkedCompanyId = null;
            let uniqueCodeRef = null;

            // 1. Validate Company Code if Corporate
            if (isCorporate) {
                if (!companyCode) {
                    setError("Please enter your Company Access Code.");
                    setLoading(false);
                    return;
                }

                const codeInput = companyCode.trim();

                // A. Check for Unique Registration Code FIRST
                const codeDocRef = doc(db, "registration_codes", codeInput);
                const codeDocSnap = await getDoc(codeDocRef);

                if (codeDocSnap.exists()) {
                    const codeData = codeDocSnap.data();
                    if (codeData.status === 'used') {
                        setError("This registration code has already been used.");
                        setLoading(false);
                        return;
                    }
                    if (codeData.status !== 'active') {
                        setError("This registration code is not valid.");
                        setLoading(false);
                        return;
                    }

                    linkedCompanyId = codeData.companyId;
                    uniqueCodeRef = codeDocRef;

                } else {
                    // B. Fallback: Check Legacy Company Code
                    const q = query(collection(db, "companies"), where("code", "==", codeInput));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        const companyDoc = querySnapshot.docs[0];
                        const companyData = companyDoc.data();

                        if (companyData.seatsUsed >= companyData.seatsTotal) {
                            setError("This company account has reached its maximum seat capacity.");
                            setLoading(false);
                            return;
                        }
                        linkedCompanyId = companyDoc.id;
                    } else {
                        setError("Invalid Access Code. Please check and try again.");
                        setLoading(false);
                        return;
                    }
                }
            }

            // Store validated data
            setValidatedData({ linkedCompanyId, uniqueCodeRef });

            // 2. Send Verification Email (2FA)
            await sendVerificationCode();
            setShowVerification(true);

        } catch (err: any) {
            console.error(err);
            setError("Failed to validate information. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const sendVerificationCode = async () => {
        try {
            const res = await fetch("/api/auth/2fa/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });
            if (!res.ok) throw new Error("Failed to send verification code");
            setVerificationSent(true);
        } catch (error) {
            console.error("2FA Send Error:", error);
            setError("Failed to send verification email. Please try again.");
        }
    };

    const verifyAndCreateAccount = async () => {
        setIsVerifying(true);
        setError("");

        try {
            // 1. Verify Code API
            const res = await fetch("/api/auth/2fa/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code: verificationCode })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Invalid verification code");
            }

            // 2. Create Create Account (Proceed with original logic)
            await completeRegistration();

        } catch (error: any) {
            setError(error.message);
            setIsVerifying(false); // Only stop loading if error, otherwise we redirect
        }
    };

    const completeRegistration = async () => {
        try {
            const { linkedCompanyId, uniqueCodeRef } = validatedData || {};

            // Create Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await updateProfile(user, {
                displayName: name
            });

            // Create User Profile
            const userDocRef = doc(db, "users", user.uid);
            const userData: any = {
                displayName: name,
                email: user.email,
                role: "student",
                isVerified: true, // Mark as verified via 2FA
                createdAt: new Date(),
                enrolledCourses: []
            };

            if (linkedCompanyId) {
                userData.linkedCompanyId = linkedCompanyId;
                userData.enrolledCourses = ["f89-flsd"];

                // Increment seats used
                const companyRef = doc(db, "companies", linkedCompanyId);
                await updateDoc(companyRef, {
                    seatsUsed: increment(1)
                });

                // If Unique Code was used, mark it as used
                if (uniqueCodeRef) {
                    await updateDoc(uniqueCodeRef, {
                        status: 'used',
                        usedBy: user.uid,
                        usedAt: new Date()
                    });
                }
            }

            await setDoc(userDocRef, userData, { merge: true });

            // Handle Legacy Pending Enrollment
            const pendingEnrollment = sessionStorage.getItem("pendingEnrollment");
            if (pendingEnrollment && !linkedCompanyId) {
                try {
                    const { courseId, sessionId, paid } = JSON.parse(pendingEnrollment);
                    if (paid && courseId && sessionId) {
                        await updateDoc(userDocRef, {
                            enrolledCourses: arrayUnion(courseId),
                            enrolledSessions: arrayUnion(sessionId)
                        });
                        sessionStorage.removeItem("pendingEnrollment");
                    }
                } catch (e) {
                    console.error("Error processing pending enrollment:", e);
                }
            }

            router.push("/portal/dashboard");
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError("Email already in use. Please sign in.");
            } else {
                setError("Failed to create account.");
            }
            setIsVerifying(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-navy-950">
            {/* Left: Branding */}
            <div className="hidden lg:flex flex-col justify-between p-12 bg-navy-900 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-blue-900/10" />
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/30 blur-[120px] rounded-full pointer-events-none" />

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
                        Start Your <br />
                        Certification
                    </h1>
                    <p className="text-xl text-slate-400 max-w-md">
                        Join thousands of successful candidates. Get access to study materials and track your progress.
                    </p>
                </div>

                <div className="relative z-10 text-slate-500 text-sm">
                    © {new Date().getFullYear()} Skyline Safety Service.
                </div>
            </div>

            {/* Right: Signup Form */}
            <div className="flex items-center justify-center p-6 lg:p-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md space-y-8"
                >
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-white">Create Account</h2>
                        <p className="mt-2 text-slate-400">
                            Already have an account? <Link href="/login" className="text-blue-500 hover:text-blue-400 font-medium">Sign in</Link>
                        </p>
                    </div>

                    <form onSubmit={handleInitialSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 rounded-lg bg-red-900/20 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium text-slate-300">Full Name</label>
                            <input
                                id="name"
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-navy-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all placeholder:text-slate-600"
                                placeholder="John Doe"
                                disabled={showVerification}
                            />
                        </div>

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
                                disabled={showVerification}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
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
                                    disabled={showVerification}
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-300">Confirm</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-navy-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all placeholder:text-slate-600"
                                    placeholder="••••••••"
                                    disabled={showVerification}
                                />
                            </div>
                        </div>

                        {/* Corporate Toggle */}
                        <div className="bg-navy-900 border border-white/5 rounded-lg p-4">
                            <label className="flex items-center gap-3 cursor-pointer mb-3">
                                <input
                                    type="checkbox"
                                    checked={isCorporate}
                                    onChange={(e) => setIsCorporate(e.target.checked)}
                                    className="w-5 h-5 rounded border-slate-600 bg-navy-950 text-blue-600 focus:ring-blue-500/50"
                                    disabled={showVerification}
                                />
                                <span className="font-medium text-white">I have a Company Access Code</span>
                            </label>

                            {isCorporate && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="space-y-2"
                                >
                                    <input
                                        type="text"
                                        value={companyCode}
                                        onChange={(e) => setCompanyCode(e.target.value)}
                                        placeholder="Enter code (e.g. CORP-ACME01)"
                                        className="w-full px-4 py-3 bg-navy-900 border border-slate-700 rounded-lg text-white font-mono placeholder:text-slate-600 focus:border-blue-500 uppercase"
                                        disabled={showVerification}
                                    />
                                    <p className="text-xs text-slate-400">
                                        This will automatically enroll you in your company's training program.
                                    </p>
                                </motion.div>
                            )}
                        </div>

                        <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={loading} disabled={showVerification}>
                            {showVerification ? "Verifying..." : "Create Account"}
                        </Button>

                        <p className="text-center text-xs text-slate-500">
                            By joining, you agree to our Terms of Service and Privacy Policy.
                        </p>
                    </form>
                </motion.div>
            </div>

            {/* 2FA Verification Modal */}
            <AnimatePresence>
                {showVerification && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full max-w-md bg-navy-900 border border-white/10 rounded-2xl shadow-2xl p-8"
                        >
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Mail size={32} />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Verify Your Email</h2>
                                <p className="text-slate-400">
                                    We sent a 6-digit code to <span className="text-white font-medium">{email}</span>.
                                    Please enter it below to confirm your account.
                                </p>
                            </div>

                            <div className="space-y-6">
                                <input
                                    type="text"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                    className="w-full text-center text-3xl font-mono tracking-widest py-4 bg-navy-950 border border-white/10 rounded-xl focus:border-blue-500 outline-none text-white placeholder:text-slate-700"
                                    placeholder="000000"
                                    autoFocus
                                />

                                {error && (
                                    <p className="text-center text-red-400 text-sm animate-pulse">{error}</p>
                                )}

                                <div className="grid gap-3">
                                    <Button
                                        onClick={verifyAndCreateAccount}
                                        size="lg"
                                        className="w-full"
                                        isLoading={isVerifying}
                                        disabled={verificationCode.length !== 6}
                                    >
                                        Verify & Create Account
                                    </Button>
                                    <button
                                        onClick={() => setShowVerification(false)}
                                        className="text-sm text-slate-500 hover:text-white transition-colors"
                                    >
                                        Cancel & Edit Email
                                    </button>
                                </div>

                                <p className="text-center text-xs text-slate-600">
                                    Didn't receive code? <button onClick={sendVerificationCode} className="text-blue-500 hover:underline">Resend</button>
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
