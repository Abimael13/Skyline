"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Lock, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    courseTitle: string;
    courseId: string; // Added courseId
    price: number;
}

export function PaymentModal({ isOpen, onClose, onConfirm, courseTitle, courseId, price }: PaymentModalProps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handlePayment = async () => {
        setLoading(true);

        try {
            // Get user info from session or storage (simplified for this context)
            // In a real app we'd get this from the AuthContext or passed props
            const userString = localStorage.getItem("user");
            const user = userString ? JSON.parse(userString) : null;

            // For now, if no user, we might want to prompt login or allow guest (handled by backend??)
            // The backend requires userId. If we are in "Enroll Now" flow from public site, we might be creating a user?
            // The prompt "You'll create an account in the next step" suggests this is pre-signup.
            // However, Stripe webhooks need to map to a user. 
            // Strategy: Pass a temporary ID or require sign up first?
            // "You'll create an account in the next step" suggests we are NOT signed up.
            // If we pay first, how do we link?
            // Standard flow: Signup -> Pay OR Pay -> Email with link to set password.
            // Let's use the latter. We pass email to Stripe.

            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    courseId: courseId,
                    seats: 1,
                    userId: user?.uid || "guest_" + Date.now(),
                    userEmail: user?.email || "",
                    sessionId: sessionStorage.getItem("selectedSessionId")
                })
            });

            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                console.error("Checkout Failed:", data.error || "No URL returned");
                setLoading(false);
                alert(`Checkout failed: ${data.error || "Please check your configuration."}`);
            }

        } catch (error) {
            console.error("Payment initiation failed:", error);
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-navy-900 border border-white/10 rounded-2xl shadow-2xl p-6 relative overflow-hidden"
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white"
                >
                    <X size={20} />
                </button>

                <AnimatePresence mode="wait">
                    {!success ? (
                        <motion.div
                            key="payment-form"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-blue-600/20 rounded-xl text-blue-400">
                                    <CreditCard size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Enroll in Course</h2>
                                    <p className="text-slate-400 text-sm">{courseTitle}</p>
                                </div>
                            </div>

                            <div className="mb-6 p-4 bg-navy-950 rounded-xl border border-white/5 space-y-3">
                                <div className="flex justify-between items-center text-slate-300">
                                    <span>Total</span>
                                    <span className="text-xl font-bold text-white">${price.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Lock size={12} />
                                    Secure SSL Encryption (Mock)
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Mock Card Form */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Card Information</label>
                                    <div className="p-3 bg-navy-800 border border-white/10 rounded-lg text-slate-400 font-mono text-sm flex items-center justify-between">
                                        <span>•••• •••• •••• 4242</span>
                                        <CreditCard size={16} />
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={handlePayment}
                                className="w-full mt-6"
                                size="lg"
                                isLoading={loading}
                            >
                                Pay ${price.toFixed(2)}
                            </Button>

                            <p className="mt-4 text-center text-xs text-slate-500">
                                This is a demo payment flow. No real money will be charged.
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="success-message"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center py-8 text-center"
                        >
                            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-green-500/30">
                                <CheckCircle size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Enrollment Complete!</h2>
                            <p className="text-slate-400">
                                You have successfully joined <strong>{courseTitle}</strong>.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
