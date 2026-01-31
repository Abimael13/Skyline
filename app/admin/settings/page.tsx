"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Lock, Save, Shield, Mail, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminSettingsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // Profile State
    const [profileData, setProfileData] = useState({
        displayName: "",
    });

    // Password State
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    // Load initial data
    useEffect(() => {
        if (user) {
            setProfileData(prev => ({
                ...prev,
                displayName: user.displayName || "",
            }));
        }
    }, [user]);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            if (user.displayName !== profileData.displayName) {
                await updateProfile(user, {
                    displayName: profileData.displayName,
                });
            }
            setSuccessMessage("Admin profile updated successfully.");
        } catch (err: any) {
            setErrorMessage(err.message || "Failed to update profile.");
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !user.email) return;

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setErrorMessage("New passwords do not match.");
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setErrorMessage("Password should be at least 6 characters.");
            return;
        }

        setLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, passwordData.newPassword);

            setSuccessMessage("Password updated successfully.");
            setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/wrong-password') {
                setErrorMessage("Incorrect current password.");
            } else {
                setErrorMessage("Failed to update password. Please check your current password.");
            }
        } finally {
            setLoading(false);
        }
    };

    // Auto-hide messages
    useEffect(() => {
        if (successMessage || errorMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage("");
                setErrorMessage("");
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, errorMessage]);

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Admin Settings</h1>
                <p className="text-slate-400">Manage your administrative account.</p>
            </div>

            {/* Status Messages */}
            {successMessage && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl flex items-center gap-3"
                >
                    <ShieldCheck size={20} />
                    {successMessage}
                </motion.div>
            )}
            {errorMessage && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3"
                >
                    <AlertCircle size={20} />
                    {errorMessage}
                </motion.div>
            )}

            <div className="grid grid-cols-1 gap-8">
                {/* Profile */}
                <section className="bg-navy-900 border border-white/5 rounded-2xl p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500">
                            <User size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Admin Profile</h2>
                            <p className="text-sm text-slate-400">Update your display name.</p>
                        </div>
                    </div>

                    <form onSubmit={handleProfileUpdate} className="space-y-6 max-w-lg">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Display Name</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={profileData.displayName}
                                    onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                                    className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 pl-10 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="Admin Name"
                                />
                                <User size={18} className="absolute left-3 top-3.5 text-slate-500" />
                            </div>
                        </div>
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                Save Changes
                            </button>
                        </div>
                    </form>
                </section>

                {/* Security */}
                <section className="bg-navy-900 border border-white/5 rounded-2xl p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-500">
                            <Lock size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Security</h2>
                            <p className="text-sm text-slate-400">Change your password.</p>
                        </div>
                    </div>

                    <form onSubmit={handlePasswordUpdate} className="space-y-6 max-w-lg">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Email Address</label>
                            <div className="relative opacity-60">
                                <input
                                    type="email"
                                    value={user?.email || ""}
                                    disabled
                                    className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 pl-10 text-slate-400 cursor-not-allowed"
                                />
                                <Mail size={18} className="absolute left-3 top-3.5 text-slate-500" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Current Password</label>
                                <input
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                                    placeholder="Enter current password"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">New Password</label>
                                    <input
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                                        placeholder="Min. 6 characters"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Confirm Password</label>
                                    <input
                                        type="password"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                                        placeholder="Confirm new password"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading || !passwordData.currentPassword || !passwordData.newPassword}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                Update Password
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
}
