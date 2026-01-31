"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Shield, Building2, Users, CreditCard, CheckCircle, Loader2 } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

export default function CorporateEnrollmentPage() {
    const router = useRouter();
    const [step, setStep] = useState<"select" | "details" | "payment" | "success">("select");
    const [seatCount, setSeatCount] = useState(5);
    const [companyName, setCompanyName] = useState("");
    const [managerName, setManagerName] = useState("");


    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [managerEmail, setManagerEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [generatedCode, setGeneratedCode] = useState("");

    const PRICE_PER_SEAT = 550; // Discounted from regular $600
    const totalPrice = seatCount * PRICE_PER_SEAT;

    const handlePurchase = async () => {
        if (!password || password !== confirmPassword) {
            alert("Please check your password.");
            return;
        }

        setLoading(true);

        try {
            // 1. Create Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, managerEmail, password);
            const user = userCredential.user;

            await updateProfile(user, { displayName: managerName });

            // 2. Create User Profile
            await setDoc(doc(db, "users", user.uid), {
                displayName: managerName,
                email: managerEmail,
                role: "manager", // Corporate Manager Role
                createdAt: serverTimestamp(),
            });

            // Mock Stripe Delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Generate Random Company Code: "NM" + Random 6 chars upper
            const code = "CORP-" + Math.random().toString(36).substring(2, 8).toUpperCase();

            // Create Company Document in Firestore
            await addDoc(collection(db, "companies"), {
                name: companyName,
                code: code,
                managerName: managerName,
                managerEmail: managerEmail,
                managerUid: user.uid, // Properly linked
                seatsTotal: Number(seatCount),
                seatsUsed: 0,
                createdAt: serverTimestamp(),
            });

            setGeneratedCode(code);
            setStep("success");
        } catch (error: any) {
            console.error("Error creating corporate account:", error);
            alert("Failed: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-navy-950 text-white font-sans selection:bg-blue-500/30">
            {/* Header */}
            <header className="border-b border-white/5 bg-navy-900/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden shadow-lg border border-white/10">
                            <Image src="/logo.png" alt="Skyline" fill className="object-cover" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">Skyline <span className="text-blue-500">Corporate</span></span>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12">
                {step !== "success" && (
                    <div className="mb-12 text-center space-y-4">
                        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-blue-400">
                            Enterprise Security Training
                        </h1>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                            Equip your security team with the F-89 Fire Life Safety Director certification.
                            Manage enrollment, track progress, and download diplomas centrally.
                        </p>
                    </div>
                )}

                {step === "select" && (
                    <div className="grid md:grid-cols-2 gap-12 items-start">
                        {/* Configuration */}
                        <div className="bg-navy-900 border border-white/10 rounded-2xl p-8 space-y-8 shadow-2xl">
                            <div>
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <Users className="text-blue-400" /> Select Batch Size
                                </h3>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-sm text-slate-400 mb-2 block">Number of Officers</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="range"
                                                min="5"
                                                max="100"
                                                step="5"
                                                value={seatCount}
                                                onChange={(e) => setSeatCount(Number(e.target.value))}
                                                className="flex-1 h-2 bg-navy-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                            />
                                            <span className="text-2xl font-bold font-mono w-16 text-center">{seatCount}</span>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-xl">
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="text-slate-400">Price per seat</span>
                                            <span className="text-xl font-bold text-white">${PRICE_PER_SEAT}</span>
                                        </div>
                                        <div className="flex justify-between items-end pt-2 border-t border-blue-500/20">
                                            <span className="text-blue-200">Total Investment</span>
                                            <span className="text-3xl font-bold text-blue-400">${totalPrice.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Button size="lg" onClick={() => setStep("details")} className="w-full">
                                Continue to Company Details
                            </Button>
                        </div>

                        {/* Benefits */}
                        <div className="space-y-8 py-4">
                            <div className="space-y-6">
                                {[
                                    { title: "Centralized Dashboard", desc: "Track attendance, exam scores, and diplomas in one place." },
                                    { title: "Bulk Discount Pricing", desc: "Save $50 per officer compared to individual enrollment." },
                                    { title: "Instant Activation", desc: "Get immediate access codes for your team." },
                                    { title: "Invoice & PO Support", desc: "Download compliant invoices for your finance department." }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 text-blue-400">
                                            <CheckCircle size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white">{item.title}</h4>
                                            <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {step === "details" && (
                    <div className="max-w-xl mx-auto bg-navy-900 border border-white/10 rounded-2xl p-8 space-y-6 shadow-2xl">
                        <div className="flex items-center gap-4 mb-2">
                            <button onClick={() => setStep("select")} className="text-slate-500 hover:text-white text-sm">← Back</button>
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Building2 className="text-blue-400" /> Company Details
                            </h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Company Name</label>
                                <input
                                    type="text"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className="w-full bg-navy-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                                    placeholder="e.g. Acme Security Group"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Manager Name</label>
                                <input
                                    type="text"
                                    value={managerName}
                                    onChange={(e) => setManagerName(e.target.value)}
                                    className="w-full bg-navy-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                                    placeholder="Your Name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Manager Email</label>
                                <input
                                    type="email"
                                    value={managerEmail}
                                    onChange={(e) => setManagerEmail(e.target.value)}
                                    className="w-full bg-navy-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                                    placeholder="manager@company.com"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-navy-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Confirm</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-navy-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            size="lg"
                            onClick={() => setStep("payment")}
                            className="w-full"
                            disabled={!companyName || !managerName || !managerEmail || !password || password !== confirmPassword}
                        >
                            Proceed to Payment
                        </Button>
                    </div>
                )}

                {step === "payment" && (
                    <div className="max-w-xl mx-auto bg-navy-900 border border-white/10 rounded-2xl p-8 space-y-8 shadow-2xl">
                        <div className="flex items-center gap-4 mb-2">
                            <button onClick={() => setStep("details")} className="text-slate-500 hover:text-white text-sm">← Back</button>
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <CreditCard className="text-blue-400" /> Secure Payment
                            </h3>
                        </div>

                        <div className="bg-white/5 rounded-xl p-6 space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">Package</span>
                                <span className="text-white font-medium">{seatCount} x F-89 Certification Seats</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">Company</span>
                                <span className="text-white font-medium">{companyName}</span>
                            </div>
                            <div className="h-px bg-white/10 my-4" />
                            <div className="flex justify-between items-center">
                                <span className="text-slate-300">Total Due</span>
                                <span className="text-2xl font-bold text-white">${totalPrice.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Mock Payment Form */}
                        <div className="space-y-4 opacity-50 pointer-events-none">
                            <div className="p-4 border border-white/10 rounded-lg flex gap-3 bg-navy-950">
                                <CreditCard className="text-slate-500" />
                                <span className="text-slate-500">•••• •••• •••• 4242</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 border border-white/10 rounded-lg bg-navy-950 text-slate-500">MM / YY</div>
                                <div className="p-4 border border-white/10 rounded-lg bg-navy-950 text-slate-500">CVC</div>
                            </div>
                        </div>

                        <Button
                            size="lg"
                            onClick={handlePurchase}
                            className="w-full bg-blue-600 hover:bg-blue-500"
                            isLoading={loading}
                        >
                            {loading ? "Processing..." : `Pay $${totalPrice.toLocaleString()}`}
                        </Button>

                        <p className="text-center text-xs text-slate-500">
                            This is a secure 256-bit SSL encrypted payment.
                            <br /> (Mock Mode: No actual charge will be made)
                        </p>
                    </div>
                )}

                {step === "success" && (
                    <div className="max-w-2xl mx-auto text-center space-y-8 py-12">
                        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-400 animate-in zoom-in duration-500">
                            <CheckCircle size={48} />
                        </div>

                        <div>
                            <h2 className="text-3xl font-bold text-white mb-4">Enrollment Successful!</h2>
                            <p className="text-slate-400">
                                You have successfully purchased <strong>{seatCount} seats</strong> for <strong>{companyName}</strong>.
                            </p>
                        </div>

                        <div className="bg-navy-900 border border-blue-500/30 rounded-2xl p-8 max-w-lg mx-auto relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />

                            <h3 className="text-slate-400 text-sm uppercase tracking-wider font-semibold mb-4">Your Company Access Code</h3>

                            <div className="bg-black/40 border border-white/10 rounded-xl p-6 mb-4 relative">
                                <code className="text-4xl font-mono font-bold text-white tracking-widest">{generatedCode}</code>
                            </div>

                            <p className="text-sm text-slate-400">
                                Share this code with your employees. They can use it during registration to bypass payment and link to your dashboard.
                            </p>
                        </div>

                        <div className="flex justify-center gap-4">
                            <Button href="/corporate/dashboard" variant="primary" size="lg">
                                Go to Corporate Dashboard
                            </Button>
                            <Button href="/" variant="ghost">
                                Return Home
                            </Button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
