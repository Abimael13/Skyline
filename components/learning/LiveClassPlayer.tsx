"use client";

import { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/Button";
import { Camera, Upload, CheckCircle, Loader2, ShieldCheck, Video, Mic, Share, MessageSquare, Users, PhoneOff, Clock } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, query, collection, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface LiveClassPlayerProps {
    sessionId: string;
    onComplete?: () => void;
    meetLink?: string;
    courseId?: string;
    title?: string;
    description?: string;
}

type Step = "intro" | "verify" | "waiting" | "room";

const getEmbedUrl = (url: string) => {
    // Attempt to extract Meeting ID and PWD from standard Zoom Join URLs
    // Format: https://zoom.us/j/123456789?pwd=abc
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes("zoom.us")) {
            const match = urlObj.pathname.match(/\/j\/(\d+)/);
            if (match && match[1]) {
                const meetingId = match[1];
                const pwd = urlObj.searchParams.get("pwd");
                // Construct Web Client URL: https://zoom.us/wc/123456789/join
                let webClientUrl = `https://zoom.us/wc/${meetingId}/join`;
                if (pwd) {
                    webClientUrl += `?pwd=${pwd}`;
                }
                return webClientUrl;
            }
        }
    } catch (e) {
        console.warn("Invalid Zoom URL", e);
    }
    // Return original if parsing fails or not a standard Zoom link
    return url;
};

export function LiveClassPlayer({ sessionId, onComplete, meetLink, courseId, title, description }: LiveClassPlayerProps) {
    const [step, setStep] = useState<Step>("intro");
    const { enrolledSessions } = useAuth();
    const [isLive, setIsLive] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(true);

    useEffect(() => {
        const checkStatus = async () => {
            if (!courseId) {
                // If no courseId, assume open for demo or check passed sessionId
                console.log("[DEBUG] No courseId, strictly demo mode");
                setIsLive(true);
                setCheckingStatus(false);
                return;
            }

            console.log(`[DEBUG] Checking Status for Course: ${courseId}`);
            console.log(`[DEBUG] Enrolled Sessions:`, enrolledSessions);

            let foundSession = null;

            // 1. Try strict enrollment match first
            if (enrolledSessions && enrolledSessions.length > 0) {
                for (const sId of enrolledSessions) {
                    try {
                        const snap = await getDoc(doc(db, "sessions", sId));
                        if (snap.exists() && snap.data().courseId === courseId) {
                            foundSession = snap.data();
                            console.log("[DEBUG] Found session via strict enrollment:", foundSession);
                            break;
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }
            }

            // 2. FALLBACK: If no enrolled session found, check for ANY public active session for this course
            // (This enables the "Live Now" test to work without re-enrolling)
            if (!foundSession) {
                try {
                    const q = query(collection(db, "sessions"), where("courseId", "==", courseId));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        // Just take the first one found for this course
                        foundSession = querySnapshot.docs[0].data();
                        console.log("[DEBUG] Found session via FALLBACK query:", foundSession);
                    } else {
                        console.log("[DEBUG] No fallback session found for courseId:", courseId);
                    }
                } catch (e) {
                    console.error("Error finding fallback session", e);
                }
            }

            if (!foundSession) {
                console.log("[DEBUG] No session found at all.");
                setIsLive(false);
                setCheckingStatus(false);
                return;
            }

            // Time Check Logic (Same as Dashboard)
            const now = new Date();
            const start = new Date(foundSession.startDate);
            const end = new Date(foundSession.endDate);

            console.log(`[DEBUG] Time Check: Now=${now.toISOString()}, Start=${start.toISOString()}, End=${end.toISOString()}`);

            // Check date range
            const isWithinDates = now >= start && now <= end;

            // Check time of day
            const currentHour = now.getHours();
            const currentMin = now.getMinutes();
            const startHour = start.getHours();
            const startMin = start.getMinutes();
            const endHour = end.getHours();
            const endMin = end.getMinutes();

            const nowMins = currentHour * 60 + currentMin;
            const startMins = startHour * 60 + startMin;
            const endMins = endHour * 60 + endMin;

            const isWithinTime = nowMins >= startMins && nowMins <= endMins;

            console.log(`[DEBUG] isWithinDates: ${isWithinDates}, isWithinTime: ${isWithinTime}`);

            if (isWithinDates && isWithinTime) {
                setIsLive(true);
            } else {
                setIsLive(false);
            }
            setCheckingStatus(false);
        };

        checkStatus();
    }, [courseId, enrolledSessions]);

    // --- Verify State & Logic ---
    const [image, setImage] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const webcamRef = useRef<Webcam>(null);
    const { user } = useAuth(); // Need actual user object
    const [attendanceId, setAttendanceId] = useState<string | null>(null);

    // Initial check for existing attendance status
    useEffect(() => {
        if (!user || step !== "verify" && step !== "waiting") return;

        // Construct a unique ID for this attendance record
        // Format: userId_courseId (assuming one session per course active at a time for simplicity, OR userId_sessionId)
        // Since sessionId is passed, let's use that.
        const attId = `${user.uid}_${sessionId}`;
        setAttendanceId(attId);

        const unsub = onSnapshot(doc(db, "session_attendance", attId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.status === "approved") {
                    setStep("room");
                } else if (data.status === "rejected") {
                    setStep("verify");
                    setWaitingStatus("rejected"); // New status for feedback
                    // Optional: alert or toast here
                } else if (data.status === "pending") {
                    setStep("waiting");
                }
            }
        });

        return () => unsub();
    }, [user, sessionId, step]);

    const capture = () => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            setImage(imageSrc);
        }
    };

    const handleVerifySubmit = async () => {
        if (!image || !user || !sessionId) return;
        setVerifying(true);

        try {
            const attId = `${user.uid}_${sessionId}`;
            await setDoc(doc(db, "session_attendance", attId), {
                userId: user.uid,
                userEmail: user.email,
                userName: user.displayName || "Unknown Student",
                sessionId: sessionId,
                courseId: courseId || "unknown", // Pass this prop if valid
                photoUrl: image, // Base64
                status: "pending",
                timestamp: serverTimestamp()
            }, { merge: true });

            setStep("waiting");
            setWaitingStatus("waiting");
        } catch (error) {
            console.error("Error submitting ID:", error);
            alert("Failed to submit ID verification. Please try again.");
        } finally {
            setVerifying(false);
        }
    };

    // --- Waiting State ---
    const [waitingStatus, setWaitingStatus] = useState<"waiting" | "admitted" | "rejected">("waiting");

    // The polling/timeout logic was removed in favor of the real-time listener above.
    // However, if we want a fallback "admitted" for demo purposes if admin never comes...
    // Let's REMOVE the auto-admit so we can verify the admin panel works properly.
    // Or keep a long timeout? Let's keep it strict for now as requested.

    // --- Room State ---
    const [joined, setJoined] = useState(false);

    // --- Renders ---

    // --- Renders ---

    if (step === "intro") {
        return (
            <div className="flex flex-col items-center justify-center p-6 text-white h-full min-h-[500px]">
                <div className="max-w-md w-full text-center space-y-8">
                    <div>
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20">
                            <Video size={32} className="text-white" />
                        </div>

                        <h1 className="text-3xl font-bold mb-2">{title || "Live Class Session"}</h1>
                        <p className="text-slate-400 mb-8 max-w-sm mx-auto">
                            {description || "Instructor-led training session."}
                        </p>
                    </div>

                    <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                        {checkingStatus ? (
                            <div className="flex items-center justify-center gap-2 text-slate-400">
                                <Loader2 size={16} className="animate-spin" />
                                <span>Checking class status...</span>
                            </div>
                        ) : isLive ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-green-400 bg-green-400/10 px-4 py-3 rounded-xl border border-green-400/20">
                                    <div className="relative">
                                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                        <Video size={20} />
                                    </div>
                                    <span className="font-semibold">Session is Live Now</span>
                                </div>
                                <Button
                                    size="lg"
                                    className="w-full h-12 text-lg font-semibold shadow-lg shadow-blue-600/20"
                                    onClick={() => setStep("verify")}
                                >
                                    Enter Live Session
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-slate-400 bg-white/5 px-4 py-3 rounded-xl border border-white/5">
                                    <Clock size={20} />
                                    <span className="font-medium">Class is not currently in session</span>
                                </div>
                                <Button size="lg" disabled className="w-full h-12 opacity-50 cursor-not-allowed">
                                    Waiting for Start Time...
                                </Button>
                                <p className="text-xs text-slate-500">
                                    Please return at the scheduled class time.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (step === "verify") {
        return (
            <div className="flex flex-col items-center justify-center p-6 text-white h-full min-h-[500px]">
                <div className="max-w-md w-full text-center space-y-8">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">Verify Your Identity</h1>
                        <p className="text-slate-400">
                            {waitingStatus === "rejected"
                                ? <span className="text-red-400">Your previous ID was rejected. Please ensure your face is clearly visible.</span>
                                : "Please present your government-issued ID to the camera."}
                        </p>
                    </div>

                    <div className="bg-navy-900 border-2 border-dashed border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center gap-4 transition-colors relative overflow-hidden min-h-[300px]">
                        {!image ? (
                            !cameraEnabled ? (
                                <div className="text-center py-10">
                                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 mx-auto mb-4">
                                        <Camera size={32} />
                                    </div>
                                    <Button onClick={() => setCameraEnabled(true)} variant="outline">
                                        Enable Camera
                                    </Button>
                                    <p className="text-xs text-slate-500 mt-4 max-w-xs mx-auto">
                                        We need camera access to verify your identity before joining the class.
                                    </p>
                                </div>
                            ) : (
                                <div className="relative w-full h-full rounded-lg overflow-hidden bg-black">
                                    <Webcam
                                        audio={false}
                                        ref={webcamRef}
                                        screenshotFormat="image/jpeg"
                                        className="w-full h-full object-cover"
                                        videoConstraints={{ facingMode: "user" }}
                                    />
                                    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                                        <Button onClick={capture} size="sm" className="bg-white text-black hover:bg-slate-200">
                                            <Camera size={16} className="mr-2" /> Capture ID
                                        </Button>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="relative w-full rounded-lg overflow-hidden">
                                <img src={image} alt="ID Capture" className="w-full h-auto rounded-lg" />
                                <div className="absolute top-2 right-2">
                                    <button
                                        onClick={() => setImage(null)}
                                        className="bg-black/50 text-white p-2 text-xs rounded-full hover:bg-black/70 transition-colors"
                                    >
                                        Retake
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        disabled={!image || verifying}
                        onClick={handleVerifySubmit}
                        isLoading={verifying}
                    >
                        Submit & Join Class
                    </Button>
                </div>
            </div>
        );
    }

    if (step === "waiting") {
        return (
            <div className="flex flex-col items-center justify-center p-6 text-white text-center h-full min-h-[500px]">
                <div className="max-w-md w-full space-y-8">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="relative w-24 h-24 mx-auto"
                    >
                        {waitingStatus === "waiting" ? (
                            <div className="w-full h-full bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400">
                                <Loader2 size={48} className="animate-spin" />
                            </div>
                        ) : (
                            <div className="w-full h-full bg-green-500/10 rounded-full flex items-center justify-center text-green-400">
                                <ShieldCheck size={48} />
                            </div>
                        )}
                    </motion.div>

                    <div>
                        <h1 className="text-2xl font-bold mb-2">
                            {waitingStatus === "waiting" ? "Waiting for Instructor" : "You're In!"}
                        </h1>
                        <p className="text-slate-400">
                            {waitingStatus === "waiting"
                                ? "Your ID is being reviewed by the instructor. Please sit tight..."
                                : "Connecting to live feed..."}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (step === "room") {
        return (
            <div className="flex flex-col h-full bg-black rounded-xl overflow-hidden min-h-[600px] border border-white/10">
                {/* Header NOT needed here if we rely on the main page header, but let's keep a mini bar */}
                <div className="h-12 border-b border-white/10 flex items-center justify-between px-4 bg-navy-900/50 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        <span className="text-sm font-medium text-white">LIVE</span>
                    </div>
                </div>

                <div className="flex-grow flex items-center justify-center bg-gray-900 relative">
                    {!joined ? (
                        <div className="text-center">
                            <p className="mb-4 text-slate-400">Click to connect to audio/video</p>
                            <Button onClick={() => setJoined(true)}>
                                Join Audio
                            </Button>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 space-y-6">
                            {meetLink ? (
                                <div className="w-full h-full relative bg-black flex-1 min-h-[700px]">
                                    <iframe
                                        src={getEmbedUrl(meetLink)}
                                        className="w-full h-full absolute inset-0 border-0"
                                        allow="camera; microphone; fullscreen; display-capture; autoplay"
                                        sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                                    />
                                    {/* Fallback / Open in App Button */}
                                    <div className="absolute top-4 right-4 z-10">
                                        <Button
                                            href={meetLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            size="sm"
                                            className="bg-black/50 hover:bg-black/70 border border-white/10 backdrop-blur-md text-xs h-8"
                                        >
                                            Open in Zoom App
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="w-24 h-24 bg-blue-600 rounded-2xl flex items-center justify-center animate-pulse">
                                        <Video size={40} className="text-white" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xl font-bold text-white mb-2">Streaming Live...</p>
                                        <p className="text-sm">Instructor: Captain J. Smith</p>
                                    </div>

                                    {/* Sim Controls */}
                                    <div className="flex gap-4 mt-8">
                                        <div className="p-3 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer text-white"><Mic size={20} /></div>
                                        <div className="p-3 rounded-full bg-red-500/80 hover:bg-red-600 cursor-pointer text-white"><Video size={20} /></div>
                                        <div className="p-3 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer text-white"><MessageSquare size={20} /></div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return null;
}
