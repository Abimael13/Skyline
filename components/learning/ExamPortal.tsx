"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck, AlertTriangle, CheckCircle, Video, ArrowRight, Save, MonitorX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { COURSES } from "@/lib/courses";
import { useAuth } from "@/lib/AuthContext";
import { doc, setDoc, updateDoc, serverTimestamp, onSnapshot, increment, deleteDoc, addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant, VideoTrack, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";

// Simulation steps for the proctor connection
type ConnectionState = "idle" | "checking-system" | "connecting" | "secure" | "room-scan" | "waiting-approval" | "active";

export function ExamPortal() {
    const { user } = useAuth();
    const router = useRouter();
    const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
    const [started, setStarted] = useState(false);

    // LiveKit State
    const [token, setToken] = useState("");
    const [isLiveKitConnected, setIsLiveKitConnected] = useState(false);

    // Exam State
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [isVoided, setIsVoided] = useState(false);
    const sessionIdRef = useRef<string | null>(null);

    // Initial Setup: Session ID
    useEffect(() => {
        if (!user) return;
        sessionIdRef.current = `${user.uid}_f89-flsd`;
    }, [user]);

    // Firestore Listener
    useEffect(() => {
        if (!user) return;
        const sessionId = `${user.uid}_f89-flsd`;

        // Heartbeat & Status Listener
        const unsub = onSnapshot(doc(db, "exam_sessions", sessionId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.status === "voided") {
                    setIsVoided(true);
                } else if (data.status === "submitted" && !submitted) {
                    setSubmitted(true);
                } else if (data.status === "active" && connectionState === "waiting-approval") {
                    setConnectionState("active");
                } else if (data.status === "flagged") {
                    // Optional: Warning toast?
                }
            }
        });

        const heartbeatInterval = setInterval(() => {
            if (sessionIdRef.current) {
                updateDoc(doc(db, "exam_sessions", sessionIdRef.current), {
                    lastActive: serverTimestamp()
                }).catch(console.error);
            }
        }, 15000); // 15s heartbeat (faster for security)

        const handleVisibilityChange = () => {
            if (document.hidden && sessionIdRef.current && connectionState === "active") {
                logAlert("Tab Switch / Hidden");
                alert("WARNING: You must stay on this tab during the exam!");
            }
        };

        const handleBlur = () => {
            if (sessionIdRef.current && connectionState === "active") {
                logAlert("Window Focus Lost");
            }
        };

        // --- ANTI-CHEATING LISTENERS ---
        const preventDefault = (e: Event) => e.preventDefault();

        const enforceFullscreen = () => {
            if (!document.fullscreenElement && connectionState === "active" && !submitted) {
                logAlert("Exited Fullscreen");
                alert("You must remain in Fullscreen mode!");
                // Attempt to re-enter or show blocking UI
            }
        };

        if (connectionState === "active") {
            document.addEventListener("contextmenu", preventDefault);
            document.addEventListener("copy", preventDefault);
            document.addEventListener("paste", preventDefault);
            document.addEventListener("cut", preventDefault);
            document.addEventListener("selectstart", preventDefault);
            document.addEventListener("fullscreenchange", enforceFullscreen);
            window.addEventListener("beforeunload", preventDefault);
        }

        const logAlert = async (reason: string) => {
            if (!sessionIdRef.current) return;
            try {
                // 1. Increment Counter
                await updateDoc(doc(db, "exam_sessions", sessionIdRef.current), {
                    alerts: increment(1)
                });

                // 2. Log Detailed Alert
                await addDoc(collection(db, "exam_sessions", sessionIdRef.current, "alerts"), {
                    message: reason,
                    timestamp: serverTimestamp()
                });

                console.log("Alert logged:", reason);
            } catch (e) {
                console.error(e);
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleBlur);

        return () => {
            unsub();
            clearInterval(heartbeatInterval);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);

            // Remove Anti-Cheating
            document.removeEventListener("contextmenu", preventDefault);
            document.removeEventListener("copy", preventDefault);
            document.removeEventListener("paste", preventDefault);
            document.removeEventListener("cut", preventDefault);
            document.removeEventListener("selectstart", preventDefault);
            document.removeEventListener("fullscreenchange", enforceFullscreen);
            window.removeEventListener("beforeunload", preventDefault);
        };
    }, [user, connectionState, router, submitted]);

    // --- DESKTOP CHECK ---
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        if (window.innerWidth < 1024) {
            setIsMobile(true);
        }
    }, []);

    if (isMobile) {
        return (
            <div className="min-h-screen bg-navy-950 flex items-center justify-center p-8 text-center text-white">
                <div className="max-w-md bg-navy-900 border border-red-500/30 p-8 rounded-3xl">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                        <MonitorX size={40} />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Desktop Device Required</h2>
                    <p className="text-slate-400 mb-6">
                        Pass the Graduation Exam securely. This exam requires a Laptop or Desktop computer with a webcam.
                        Mobile devices and tablets are not supported to ensure exam integrity.
                    </p>
                    <Button onClick={() => router.push("/portal/dashboard")} variant="outline">
                        Return to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    // Load Exam Data (Hardcoded to f89-flsd final exam for now)
    const examModule = COURSES.find(c => c.id === "f89-flsd")?.modules.find(m => m.type === "exam");
    const questions = examModule?.content?.questions || [];

    const startProctoring = async () => {
        // Initialize DB Session
        if (user && sessionIdRef.current) {
            try {
                await setDoc(doc(db, "exam_sessions", sessionIdRef.current), {
                    userId: user.uid,
                    userName: user.displayName || "Unknown Student",
                    courseId: "f89-flsd",
                    courseName: "F-89 Graduation Exam",
                    status: "initializing",
                    startTime: serverTimestamp(),
                    lastActive: serverTimestamp(),
                    alerts: 0
                }, { merge: true });

                // Fetch LiveKit Token
                const roomName = `exam-${user.uid}`;
                const resp = await fetch(`/api/livekit/token?room=${roomName}&username=${encodeURIComponent(user.displayName || user.email || "Student")}`);
                const data = await resp.json();
                if (data.token) {
                    setToken(data.token);
                } else {
                    console.error("Failed to get token", data);
                    alert("Proctoring service unavailable. Please contact support.");
                    return;
                }

            } catch (e) {
                console.error("Error creating exam session", e);
            }
        }

        setConnectionState("checking-system");

        // Simulation of steps, but now backed by LiveKit connection
        setTimeout(() => setConnectionState("connecting"), 1000);
    };

    const handleRoomScanComplete = async () => {
        setConnectionState("waiting-approval");
        if (sessionIdRef.current) {
            await updateDoc(doc(db, "exam_sessions", sessionIdRef.current), {
                status: "waiting-approval"
            });
        }
    };

    const handleAnswer = (optionIndex: number) => {
        setAnswers(prev => ({
            ...prev,
            [currentQuestion]: optionIndex
        }));
    };

    const submitExam = async () => {
        if (!user || !sessionIdRef.current) return;
        setSubmitting(true);

        try {
            // Calculate Score
            let correctCount = 0;
            questions.forEach((q, idx) => {
                if (answers[idx] === q.correctIndex) {
                    correctCount++;
                }
            });

            const score = Math.round((correctCount / questions.length) * 100);
            const passed = score >= 70;

            const submissionData = {
                courseId: "f89-flsd",
                submittedAt: new Date().toISOString(),
                answers,
                totalQuestions: questions.length,
                status: "submitted",
                score,
                passed
            };

            // 1. Save detailed submission
            await setDoc(doc(db, "users", user.uid, "examSubmissions", "f89-flsd"), submissionData);

            // 2. Update Student Profile with Grade
            await setDoc(doc(db, "users", user.uid), {
                examResults: {
                    "f89-flsd": {
                        status: passed ? "passed" : "failed",
                        score: score,
                        gradedAt: new Date().toISOString(),
                        diplomaUrl: passed ? "/certificates/f89-placeholder.pdf" : null
                    }
                }
            }, { merge: true });

            // 3. Update Session Status
            await updateDoc(doc(db, "exam_sessions", sessionIdRef.current), {
                status: "completed",
                endTime: serverTimestamp()
            });

            setSubmitted(true);
        } catch (error) {
            console.error("Error submitting exam:", error);
            alert("Failed to submit exam. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (isVoided) {
        return (
            <div className="min-h-screen bg-navy-950 flex items-center justify-center p-8 text-center text-white">
                <div className="max-w-md bg-navy-900 border border-red-500/30 p-8 rounded-3xl shadow-2xl shadow-red-900/20">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                        <AlertTriangle size={40} />
                    </div>
                    <h2 className="text-3xl font-bold mb-4 text-red-500">Exam Terminated</h2>
                    <p className="text-slate-400 mb-8">
                        Your session has been voided by the proctor due to a policy violation or technical issue.
                    </p>
                    <Button onClick={() => router.push("/portal/dashboard")} className="w-full bg-red-600 hover:bg-red-700">
                        Return to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-navy-950 flex items-center justify-center p-8 text-center text-white">
                <div className="max-w-md bg-navy-900 border border-white/10 p-8 rounded-3xl">
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Exam Submitted</h2>
                    <p className="text-slate-400 mb-8">
                        Your exam has been securely transmitted to our grading team. You will be notified via email once your results are validated.
                    </p>
                    <Button onClick={() => router.push("/portal/dashboard")} className="w-full">
                        Return to Dashboard
                    </Button>
                    <Button
                        variant="outline"
                        onClick={async () => {
                            if (!sessionIdRef.current) return;
                            await deleteDoc(doc(db, "exam_sessions", sessionIdRef.current));
                            setSubmitted(false);
                            setConnectionState("idle");
                            router.refresh();
                        }}
                        className="w-full mt-4 border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                        [DEV] Reset Exam
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <LiveKitRoom
            video={true}
            audio={true}
            token={token}
            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
            connect={!!token}
            onConnected={() => {
                console.log("EXAM: Connected to LiveKit Room");
                setIsLiveKitConnected(true);
                if (connectionState === "connecting") setConnectionState("secure");
                setTimeout(() => {
                    if (connectionState !== "active") {
                        setConnectionState("room-scan");
                        if (sessionIdRef.current) {
                            updateDoc(doc(db, "exam_sessions", sessionIdRef.current), { status: "room-scan" });
                        }
                    }
                }, 2000);
            }}
            onDisconnected={() => setIsLiveKitConnected(false)}
            data-lk-theme="default"
            style={{ height: "100vh" }}
        >
            <div className="min-h-screen bg-navy-950 text-white flex flex-col">
                {/* Examination Header */}
                <header className="h-16 border-b border-white/10 bg-navy-900 flex items-center justify-between px-8 sticky top-0 z-50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
                            <ShieldCheck size={18} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold tracking-wide uppercase">Official Graduation Exam</h1>
                            <p className="text-xs text-slate-400">FDNY Accredited • Secure Browser Mode</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {connectionState === "active" && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-full">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-xs font-semibold text-red-400 uppercase">Live Proctor Connected</span>
                            </div>
                        )}
                        <div className="text-sm font-mono text-slate-400">
                            ID: <span className="text-white">89092-F89</span>
                        </div>
                    </div>
                </header>

                {/* Main Interface */}
                <main className="flex-1 flex bg-navy-950 relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

                    {connectionState !== "active" ? (
                        // Pre-Check / Connection Screen
                        <div className="w-full max-w-md mx-auto my-auto relative z-10">
                            <div className="bg-navy-900 border border-white/10 p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
                                <div className="text-center mb-8">
                                    <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                                        <Video size={32} className="text-white" />
                                    </div>
                                    <h2 className="text-2xl font-bold mb-2">Proctor Connection</h2>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        This exam requires a live video connection with a certified proctor. Please ensure your camera and microphone are ready.
                                    </p>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <StatusRow label="System Check" status={connectionState === "idle" ? "waiting" : "success"} />
                                    <StatusRow label="Secure Tunnel" status={["idle", "checking-system", "connecting"].includes(connectionState) ? "waiting" : "success"} />
                                    <StatusRow label="Room Scan" status={["room-scan", "waiting-approval", "active"].includes(connectionState) ? "success" : "waiting"} />
                                    <StatusRow label="Proctor Authorization" status="waiting" />
                                </div>

                                {connectionState === "idle" && (
                                    <Button onClick={startProctoring} className="w-full h-12 text-base bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20">
                                        Initiate Connection
                                    </Button>
                                )}

                                {(connectionState === "checking-system" || connectionState === "connecting" || connectionState === "secure") && (
                                    <div className="h-12 flex items-center justify-center gap-3 text-sm font-medium text-slate-300 bg-navy-950 rounded-xl border border-white/5">
                                        <Loader2 className="animate-spin text-blue-500" size={18} />
                                        {connectionState === "checking-system" && "Verifying Hardware..."}
                                        {connectionState === "connecting" && "Establishing Secure Link..."}
                                        {connectionState === "secure" && "Preparing Room Scan..."}
                                    </div>
                                )}

                                {connectionState === "room-scan" && (
                                    <div className="text-center space-y-4">
                                        <div className="bg-navy-950 p-4 rounded-xl border border-white/10 text-sm text-yellow-400 mb-4">
                                            Please rotate your camera slowly to show your entire workspace (360° view).
                                        </div>
                                        <div className="w-full h-48 bg-black rounded-lg mb-4 flex items-center justify-center border border-slate-700 overflow-hidden relative">
                                            <LocalVideoPreview />
                                        </div>
                                        <Button onClick={handleRoomScanComplete} className="w-full h-12 bg-emerald-600 hover:bg-emerald-500">
                                            Scan Complete - Request Approval
                                        </Button>
                                    </div>
                                )}

                                {connectionState === "waiting-approval" && (
                                    <div className="h-20 flex flex-col items-center justify-center gap-2 text-sm font-medium text-slate-300 bg-navy-950 rounded-xl border border-white/5 animate-pulse">
                                        <div className="flex items-center gap-2 text-blue-400">
                                            <Loader2 className="animate-spin" size={18} />
                                            <span>Waiting for Proctor Authorization...</span>
                                        </div>
                                        <span className="text-xs text-slate-500">Do not refresh the page.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : !started ? (
                        // Active Exam Ready View
                        <div className="w-full h-full flex flex-col items-center justify-center p-8 z-10">
                            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-2xl">
                                <h2 className="text-3xl font-bold mb-6">Exam Ready</h2>
                                <p className="text-slate-400 mb-8">
                                    Your proctor has authorized the session. The exam has {questions.length} questions.
                                </p>
                                <Button onClick={() => {
                                    setStarted(true);
                                    try {
                                        document.documentElement.requestFullscreen();
                                    } catch (e) { console.error("Fullscreen blocked", e); }
                                }} className="h-14 px-8 text-lg bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-600/20">
                                    Start Examination
                                </Button>
                            </motion.div>
                            {/* PIP Proctor View */}
                            <div className="absolute bottom-6 right-6 w-64 h-48 bg-black rounded-lg border-2 border-red-500/50 overflow-hidden shadow-2xl">
                                <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-black/60 backdrop-blur rounded text-[10px] font-bold text-red-500 uppercase">LIVE</div>
                                <LocalVideoPreview />
                            </div>
                        </div>
                    ) : (
                        // Actual Questions View
                        <div className="w-full h-full flex flex-col items-center justify-center p-8 z-10 max-w-4xl mx-auto">
                            <div className="w-full bg-navy-900 border border-white/10 rounded-3xl p-8 backdrop-blur-xl relative">
                                <div className="flex justify-between items-center mb-8">
                                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Question {currentQuestion + 1} of {questions.length}</span>
                                    <div className="w-32 h-2 bg-navy-950 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }} />
                                    </div>
                                </div>

                                <h3 className="text-2xl font-bold text-white mb-8 leading-snug">
                                    {questions[currentQuestion]?.text}
                                </h3>

                                <div className="space-y-4 mb-8">
                                    {questions[currentQuestion]?.options.map((option, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswer(idx)}
                                            className={`w-full text-left p-6 rounded-xl border-2 transition-all flex items-center justify-between group ${answers[currentQuestion] === idx
                                                ? "border-blue-500 bg-blue-500/10 text-white"
                                                : "border-white/5 bg-navy-950 text-slate-400 hover:border-white/20 hover:text-white"
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm ${answers[currentQuestion] === idx ? "border-blue-500 text-blue-400" : "border-slate-700 text-slate-600"
                                                    }`}>
                                                    {String.fromCharCode(65 + idx)}
                                                </div>
                                                <span className="text-lg font-medium">{option}</span>
                                            </div>
                                            {answers[currentQuestion] === idx && <CheckCircle className="text-blue-500" size={24} />}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex justify-between items-center pt-8 border-t border-white/5">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setCurrentQuestion(p => Math.max(0, p - 1))}
                                        disabled={currentQuestion === 0}
                                    >
                                        Previous
                                    </Button>

                                    {currentQuestion < questions.length - 1 ? (
                                        <Button onClick={() => setCurrentQuestion(p => p + 1)}>
                                            Next Question <ArrowRight className="ml-2" size={18} />
                                        </Button>
                                    ) : (
                                        <Button onClick={submitExam} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-500">
                                            {submitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />}
                                            Submit Exam
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Mini Proctor View stays during exam */}
                            <div className="fixed bottom-6 right-6 w-48 h-36 bg-black rounded-lg border border-red-500/30 overflow-hidden shadow-2xl opacity-80 hover:opacity-100 transition-opacity z-50">
                                <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-black/60 backdrop-blur rounded text-[8px] font-bold text-red-500 uppercase">REC</div>
                                <LocalVideoPreview />
                            </div>

                            {/* INCOMING PROCTOR INTERCOM */}
                            <ProctorIncomingView />
                        </div>
                    )}
                </main>
                <RoomAudioRenderer />
            </div>
        </LiveKitRoom>
    );
}

function StatusRow({ label, status }: { label: string, status: "waiting" | "success" }) {
    return (
        <div className="flex items-center justify-between p-3 rounded-lg bg-navy-950/50 border border-white/5">
            <span className="text-sm text-slate-300">{label}</span>
            {status === "success" ? (
                <CheckCircle size={18} className="text-emerald-500" />
            ) : (
                <div className="w-4 h-4 rounded-full border-2 border-slate-700" />
            )}
        </div>
    );
}

function ProctorIncomingView() {
    // Listen for remote tracks (Admin)
    const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone], { onlySubscribed: true })
        .filter(ref => !ref.participant.isLocal);

    if (tracks.length === 0) return null;

    return (
        <div className="fixed top-24 right-8 z-[60]">
            <div className="bg-navy-900 border-2 border-red-500 rounded-xl shadow-2xl overflow-hidden w-64 shadow-red-500/20 animation-in fade-in slide-in-from-top-4 duration-300">
                <div className="bg-red-600 text-white text-xs font-bold px-3 py-1 flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    PROCTOR SPEAKING
                </div>
                {tracks.map(track => {
                    if (track.source === Track.Source.Camera) {
                        return (
                            <div key={track.publication.trackSid} className="aspect-video bg-black">
                                <VideoTrack trackRef={track} className="w-full h-full object-cover" />
                            </div>
                        );
                    }
                    return null;
                })}
            </div>
        </div>
    );
}

function LocalVideoPreview() {
    const { localParticipant } = useLocalParticipant();

    // Safety check for participant
    if (!localParticipant) {
        return <div className="w-full h-full flex items-center justify-center text-slate-500"><Loader2 className="animate-spin" /></div>;
    }

    const videoTrack = localParticipant.getTrackPublication(Track.Source.Camera);

    if (!videoTrack) {
        return <div className="w-full h-full flex items-center justify-center text-slate-500"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <VideoTrack
            trackRef={{
                participant: localParticipant,
                source: Track.Source.Camera,
                publication: videoTrack
            }}
            className="w-full h-full object-cover transform scale-x-[-1]"
        />
    );
}
