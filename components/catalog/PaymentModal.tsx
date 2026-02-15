"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Lock, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
    EmbeddedCheckoutProvider,
    EmbeddedCheckout,
} from "@stripe/react-stripe-js";

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseTitle: string;
    courseId: string;
    price: number;
}

export function PaymentModal({ isOpen, onClose, courseTitle, courseId, price }: PaymentModalProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [clientSecret, setClientSecret] = useState<string | null>(null);

    const handlePayment = async () => {
        if (!user) {
            // Redirect to login with return URL
            const returnUrl = encodeURIComponent(`/courses/${courseId}`);
            router.push(`/login?redirect=${returnUrl}`);
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    courseId: courseId,
                    userId: user.uid,
                    userEmail: user.email || "",
                    userName: user.displayName || "",
                    sessionId: sessionStorage.getItem("selectedSessionId")
                })
            });

            const data = await res.json();
            if (data.clientSecret) {
                setClientSecret(data.clientSecret);
            } else {
                console.error("Checkout Failed:", data.error || "No clientSecret returned");
                alert(`Checkout failed: ${data.error || "Please check your configuration."}`);
            }

        } catch (error) {
            console.error("Payment initiation failed:", error);
        } finally {
            setLoading(false);
        }
    };

    // Reset state when modal is closed
    useEffect(() => {
        if (!isOpen) {
            setClientSecret(null);
            setLoading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-2xl bg-navy-900 border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="flex justify-between items-center p-4 border-b border-white/5 bg-navy-950/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <CreditCard className="text-blue-400" size={24} />
                        Enroll: {courseTitle}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {clientSecret ? (
                        <EmbeddedCheckoutProvider
                            stripe={stripePromise}
                            options={{ clientSecret }}
                        >
                            <EmbeddedCheckout className="w-full" />
                        </EmbeddedCheckoutProvider>
                    ) : (
                        <div className="space-y-6">
                            <div className="p-4 bg-navy-950 rounded-xl border border-white/5 space-y-3">
                                <div className="flex justify-between items-center text-slate-300">
                                    <span>Total</span>
                                    <span className="text-xl font-bold text-white">${price.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Lock size={12} />
                                    Secure SSL Encryption
                                </div>
                            </div>

                            <Button
                                onClick={handlePayment}
                                className="w-full"
                                size="lg"
                                isLoading={loading}
                            >
                                {user ? `Proceed to Payment` : "Log in to Purchase"}
                            </Button>

                            <p className="text-center text-xs text-slate-500">
                                You will be able to complete your purchase securely with Stripe.
                            </p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
