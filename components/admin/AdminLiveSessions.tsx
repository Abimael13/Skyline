"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, Timestamp, addDoc, getDocs, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { Loader2, CheckCircle, XCircle, User, Clock, Monitor, Play, Square, AlertCircle } from "lucide-react";
import Image from "next/image";

const AVAILABLE_CLASSES = [
    { id: "class-1", name: "Class 1: Fire Emergencies" },
    { id: "class-2", name: "Class 2: Fire Protection Systems I" },
    { id: "class-3", name: "Class 3: Fire Protection Systems II" },
    { id: "class-4", name: "Class 4: Emergency Procedures" },
    { id: "class-5", name: "Class 5: Fire Codes & Law" },
    { id: "class-6", name: "Class 6: Fire Suppression Systems" },
    { id: "class-7", name: "Class 7: Advanced Fire Safety" },
    { id: "class-8", name: "Class 8: Review & Final Prep" },
];

interface AttendanceRequest {
    id: string; // The doc ID (userId_sessionId)
    userId: string;
    userName: string;
    userEmail: string;
    photoUrl: string;
    status: 'pending' | 'approved' | 'rejected';
    timestamp: Timestamp;
    courseId: string;
}

export default function AdminLiveSessions() {
    const [requests, setRequests] = useState<AttendanceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSessions, setActiveSessions] = useState<Record<string, boolean>>({});
    const [processingSession, setProcessingSession] = useState<string | null>(null);

    // Listen for Active Sessions to update UI state
    useEffect(() => {
        const q = query(collection(db, "sessions"));
        const unsub = onSnapshot(q, (snap) => {
            const active: Record<string, boolean> = {};
            snap.forEach(doc => {
                const data = doc.data();
                // Check if it's currently live (simple check: end date in future)
                if (new Date(data.endDate) > new Date()) {
                    active[data.courseId] = true;
                }
            });
            setActiveSessions(active);
        });
        return () => unsub();
    }, []);

    const toggleSession = async (classId: string, className: string) => {
        if (processingSession) return;
        setProcessingSession(classId);

        try {
            const isActive = activeSessions[classId];
            const sessionsRef = collection(db, "sessions");

            // 1. Find existing sessions for this course
            const q = query(sessionsRef, where("courseId", "==", classId));
            const snap = await getDocs(q);

            if (isActive) {
                // STOP SESSION: Delete all active sessions for this course
                const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
                await Promise.all(deletePromises);
            } else {
                // START SESSION: Create new session
                // Cleanup old ones first just in case
                const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
                await Promise.all(deletePromises);

                // Create new
                const now = new Date();
                const end = new Date(now);
                end.setHours(now.getHours() + 4); // Default 4 hours duration

                await addDoc(sessionsRef, {
                    courseId: classId,
                    topic: `${className} (Live)`,
                    instructor: "Admin Instructor",
                    zoomLink: "https://zoom.us/j/test-live-now", // In real app, this might be dynamic
                    startDate: now.toISOString(),
                    endDate: end.toISOString()
                });
            }
        } catch (error) {
            console.error("Error toggling session:", error);
            alert("Failed to toggle session.");
        } finally {
            setProcessingSession(null);
        }
    };

    useEffect(() => {
        // Query only 'pending' requests for now, or all if we want history
        // Let's get "pending" ones to show in a queue
        const q = query(
            collection(db, "session_attendance"),
            where("status", "==", "pending")
            // orderBy("timestamp", "asc") // Index might be needed
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reqs: AttendanceRequest[] = [];
            snapshot.forEach((doc) => {
                reqs.push({ id: doc.id, ...doc.data() } as AttendanceRequest);
            });
            // Sort client side to avoid index requirement for now
            reqs.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds);
            setRequests(reqs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleAction = async (requestId: string, action: 'approved' | 'rejected') => {
        try {
            await updateDoc(doc(db, "session_attendance", requestId), {
                status: action
            });
            // No need to manual update state, snapshot handles it
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status.");
        }
    };

    return (
        <div className="space-y-8 p-6 min-h-screen bg-navy-950 text-white">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Monitor className="text-blue-500" />
                        Live Session Manager
                    </h1>
                    <p className="text-slate-400 mt-2">
                        Control active classes and verify student identities.
                    </p>
                </div>

                <div className="w-full">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full border border-white/10">
                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-sm font-semibold whitespace-nowrap">Queue: {requests.length}</span>
                        </div>
                    </div>

                    {/* Session Controls Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-3 w-full">
                        {AVAILABLE_CLASSES.map((cls) => (
                            <button
                                key={cls.id}
                                onClick={() => toggleSession(cls.id, cls.name)}
                                disabled={processingSession === cls.id}
                                className={`
                                    relative flex items-center justify-between p-3 rounded-xl border transition-all duration-200 group text-left
                                    ${activeSessions[cls.id]
                                        ? "bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/50"
                                        : "bg-navy-900 border-white/5 hover:border-white/20 hover:bg-navy-800"
                                    }
                                `}
                            >
                                <div className="flex flex-col">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${activeSessions[cls.id] ? "text-blue-200" : "text-slate-400"}`}>
                                        {cls.id.replace("-", " ").toUpperCase()}
                                    </span>
                                    <span className={`text-sm font-bold truncate max-w-[120px] ${activeSessions[cls.id] ? "text-white" : "text-slate-200"}`}>
                                        {activeSessions[cls.id] ? "LIVE NOW" : "Offline"}
                                    </span>
                                </div>

                                <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center transition-colors
                                    ${activeSessions[cls.id]
                                        ? "bg-white text-blue-600"
                                        : "bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white"
                                    }
                                `}>
                                    {processingSession === cls.id ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : activeSessions[cls.id] ? (
                                        <Square size={12} fill="currentColor" />
                                    ) : (
                                        <Play size={12} fill="currentColor" className="ml-0.5" />
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-blue-500" size={40} />
                </div>
            ) : requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-navy-900 border border-white/5 rounded-2xl border-dashed opacity-50">
                    <div className="bg-slate-800 p-4 rounded-full mb-4">
                        <User size={32} className="text-slate-500" />
                    </div>
                    <h3 className="text-xl font-medium text-white">No Pending Requests</h3>
                    <p className="text-slate-400">Waiting for students to join...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {requests.map((req) => (
                        <div key={req.id} className="bg-navy-900 border border-white/10 rounded-2xl overflow-hidden shadow-xl flex flex-col">
                            {/* Photo Area */}
                            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                                {req.photoUrl ? (
                                    <div className="w-full h-full relative group">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={req.photoUrl}
                                            alt="ID Capture"
                                            className="object-cover w-full h-full"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                                    </div>
                                ) : (
                                    <div className="text-slate-600 flex flex-col items-center">
                                        <User size={48} />
                                        <span className="text-xs mt-2">No Image</span>
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase tracking-wide">
                                    Pending
                                </div>
                            </div>

                            {/* Info Area */}
                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="text-lg font-bold text-white mb-1 truncate" title={req.userName}>
                                    {req.userName}
                                </h3>
                                <p className="text-sm text-slate-400 mb-3 truncate" title={req.userEmail}>
                                    {req.userEmail}
                                </p>

                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-4 bg-navy-950 p-2 rounded border border-white/5">
                                    <Clock size={12} />
                                    <span>
                                        {req.timestamp?.toDate ? req.timestamp.toDate().toLocaleTimeString() : 'Just now'}
                                    </span>
                                </div>

                                <div className="mt-auto grid grid-cols-2 gap-3">
                                    <Button
                                        onClick={() => handleAction(req.id, 'rejected')}
                                        variant="outline"
                                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-10"
                                    >
                                        <XCircle size={16} className="mr-2" />
                                        Reject
                                    </Button>
                                    <Button
                                        onClick={() => handleAction(req.id, 'approved')}
                                        className="bg-green-600 hover:bg-green-700 text-white h-10 border-0"
                                    >
                                        <CheckCircle size={16} className="mr-2" />
                                        Approve
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
