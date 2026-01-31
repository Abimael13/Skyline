"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Lock, Bell, Save, Loader2, ShieldCheck, Mail, Phone, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export default function SettingsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // Profile State
    const [profileData, setProfileData] = useState({
        displayName: "",
        phone: "",
    });

    // Password State
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    // Notification State
    const [notifications, setNotifications] = useState({
        emailAlerts: true,
    });

    // Load initial data
    useEffect(() => {
        if (user) {
            setProfileData(prev => ({
                ...prev,
                displayName: user.displayName || "",
            }));

            // Fetch extra fields from Firestore
            const fetchUserData = async () => {
                try {
                    const docRef = doc(db, "users", user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setProfileData(prev => ({
                            ...prev,
                            phone: data.phone || "",
                        }));
                        if (data.preferences) {
                            setNotifications(data.preferences);
                        }
                    }
                } catch (err) {
                    console.error("Error fetching user settings:", err);
                }
            };
            fetchUserData();
        }
    }, [user]);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            // Update Auth Profile
            if (user.displayName !== profileData.displayName) {
                await updateProfile(user, {
                    displayName: profileData.displayName,
                });
            }

            // Update Firestore Profile
            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, {
                phone: profileData.phone,
                updatedAt: new Date().toISOString(),
            }, { merge: true });

            setSuccessMessage("Profile updated successfully.");
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
            // Re-authenticate user first (required for password change)
            const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
            await reauthenticateWithCredential(user, credential);

            // Update Password
            await updatePassword(user, passwordData.newPassword);

            setSuccessMessage("Password updated successfully.");
            setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/wrong-password') {
                setErrorMessage("Incorrect current password.");
            } else if (err.code === 'auth/too-many-requests') {
                setErrorMessage("Too many attempts. Please try again later.");
            } else {
                setErrorMessage("Failed to update password. Please check your current password.");
            }
        } finally {
            setLoading(false);
        }
    };

    const toggleNotification = async (key: string) => {
        if (!user) return;
        const newState = { ...notifications, [key]: !notifications[key as keyof typeof notifications] };
        setNotifications(newState);

        try {
            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, {
                preferences: newState
            }, { merge: true });
        } catch (err) {
            console.error("Failed to save preference", err);
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
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Account Settings</h1>
                <p className="text-slate-400">Manage your profile details and security preferences.</p>
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Profile */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Public Profile */}
                    <section className="bg-navy-900/50 border border-white/5 rounded-2xl p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500">
                                <User size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Public Profile</h2>
                                <p className="text-sm text-slate-400">Update your personal information.</p>
                            </div>
                        </div>

                        <form onSubmit={handleProfileUpdate} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Full Name</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={profileData.displayName}
                                            onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                                            className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 pl-10 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="John Doe"
                                        />
                                        <User size={18} className="absolute left-3 top-3.5 text-slate-500" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Phone Number</label>
                                    <div className="relative">
                                        <input
                                            type="tel"
                                            value={profileData.phone}
                                            onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                            className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 pl-10 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="(555) 000-0000"
                                        />
                                        <Phone size={18} className="absolute left-3 top-3.5 text-slate-500" />
                                    </div>
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
                    <section className="bg-navy-900/50 border border-white/5 rounded-2xl p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-500">
                                <Lock size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Security</h2>
                                <p className="text-sm text-slate-400">Manage your password and account access.</p>
                            </div>
                        </div>

                        <form onSubmit={handlePasswordUpdate} className="space-y-6">
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
                                <p className="text-xs text-slate-500">Email address cannot be changed directly.</p>
                            </div>

                            <hr className="border-white/5 my-6" />

                            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Change Password</h3>

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

                {/* Right Column: Notifications & Other */}
                <div className="space-y-8">
                    <section className="bg-navy-900/50 border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-yellow-600/20 flex items-center justify-center text-yellow-500">
                                <Bell size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Notifications</h2>
                                <p className="text-xs text-slate-400">Manage your alert preferences.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                <div>
                                    <h4 className="text-sm font-medium text-white">Email Alerts</h4>
                                    <p className="text-xs text-slate-400">Course updates & reminders</p>
                                </div>
                                <button
                                    onClick={() => toggleNotification('emailAlerts')}
                                    className={`w-11 h-6 rounded-full transition-colors relative ${notifications.emailAlerts ? 'bg-green-500' : 'bg-slate-700'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${notifications.emailAlerts ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                    </section>

                    <section className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/5 rounded-2xl p-6">
                        <h3 className="font-semibold text-white mb-2">Need Help?</h3>
                        <p className="text-sm text-slate-400 mb-4">
                            If you're having trouble with your account, please contact our support team.
                        </p>
                        <a
                            href="/contact"
                            className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                        >
                            Contact Support &rarr;
                        </a>
                    </section>
                </div>
            </div>
        </div>
    );
}
