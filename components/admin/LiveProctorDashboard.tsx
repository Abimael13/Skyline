"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { MonitorX, User, AlertTriangle, CheckCircle, Video, Play, Pause, XCircle, Search, Loader2 } from "lucide-react";
import { collection, query, onSnapshot, doc, updateDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LiveKitRoom, VideoTrack, useTracks, RoomAudioRenderer, ParticipantLoop, ParticipantTile, useParticipants } from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";

interface StudentSession {
    id: string;
    userId: string;
    userName: string;
    courseName: string;
    status: "initializing" | "room-scan" | "waiting-approval" | "active" | "flagged" | "paused" | "completed" | "submitted" | "voided";
    alerts: number;
    lastActive: any; // Timestamp
    feedUrl?: string;
}

export default function LiveProctorDashboard() {
    const [sessions, setSessions] = useState<StudentSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<StudentSession | null>(null);
    const [adminToken, setAdminToken] = useState<string>("");
    const [isMicOn, setIsMicOn] = useState(false);
    const [isCamOn, setIsCamOn] = useState(false);
    const [notifications, setNotifications] = useState<{ id: string, message: string, type: 'info' | 'alert' | 'success' }[]>([]);

    // Sync with Firestore
    useEffect(() => {
        const q = query(collection(db, "exam_sessions"), orderBy("lastActive", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            const list: StudentSession[] = [];

            snap.forEach(d => {
                list.push({ id: d.id, ...d.data() } as StudentSession);
            });

            // Check for new submissions
            snap.docChanges().forEach(change => {
                console.log("Dashboard Snapshot Change:", change.type, change.doc.data());

                if (change.type === "modified") {
                    const newData = change.doc.data() as StudentSession;
                    console.log("Modified Doc Status:", newData.status);

                    // We can't easily access previous data here without extra state, 
                    // but we can check if the status is now 'submitted'.
                    // To avoid spamming on every update of a submitted doc, strictly we'd need prev state.
                    // For now, let's assume if it's modified and status is submitted, it's worth noting, 
                    // or better, checking if it was NOT submitted in our current local state.

                    if (newData.status === "submitted") {
                        console.log("Triggering Notification for:", newData.userName);
                        setNotifications(prev => {
                            // Avoid duplicates if already notified recently (optional, but good UX)
                            if (prev.some(n => n.message.includes(newData.userName))) return prev;

                            const newNote = {
                                id: Date.now().toString(),
                                message: `${newData.userName} has submitted their exam.`,
                                type: 'success' as const
                            };
                            return [...prev, newNote];
                        });

                        // Auto-dismiss removed per user request
                    }
                }
            });

            setSessions(list);
        });
        return () => unsub();
    }, []);

    // Filter sessions for the grid
    const activeSessions = sessions.filter(s => !['submitted', 'completed', 'voided'].includes(s.status));

    // Get Token when session selected
    useEffect(() => {
        if (!selectedSession) {
            setAdminToken("");
            setIsMicOn(false);
            setIsCamOn(false);
            return;
        }

        const fetchToken = async () => {
            try {
                // Room name logic must match ExamPortal: `exam-${userId}`
                const roomName = `exam-${selectedSession.userId}`;
                const resp = await fetch(`/api/livekit/token?room=${roomName}&username=AdminProctor&admin=true`);
                const data = await resp.json();
                if (data.token) {
                    setAdminToken(data.token);
                }
            } catch (error) {
                console.error("Failed to fetch admin token", error);
            }
        };

        fetchToken();
    }, [selectedSession]);

    const handleVoidExam = async (id: string) => {
        if (confirm("Are you sure you want to VOID this exam session? This action cannot be undone.")) {
            try {
                await updateDoc(doc(db, "exam_sessions", id), {
                    status: "voided"
                });
                setSelectedSession(null);
            } catch (e) {
                console.error("Error voiding exam", e);
                alert("Failed to void exam.");
            }
        }
    };

    const handleAuthorize = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await updateDoc(doc(db, "exam_sessions", id), {
                status: "active"
            });
            alert("Session Authorized.");
        } catch (error) {
            console.error(error);
        }
    };

    const handleSuspend = async (id: string) => {
        if (confirm("Suspend this exam session? The student will be paused.")) {
            try {
                await updateDoc(doc(db, "exam_sessions", id), {
                    status: "flagged"
                });
            } catch (e) { console.error(e); }
        }
    };

    const handleForceSubmit = async (id: string) => {
        if (confirm("Force submit this session?")) {
            try {
                await updateDoc(doc(db, "exam_sessions", id), {
                    status: "submitted"
                });
                alert(`Exam submitted.`);
            } catch (e) {
                console.error("Error submitting", e);
            }
        }
    };

    return (
        <div className="p-6 bg-navy-950 min-h-screen text-white">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <MonitorX className="text-blue-500" size={32} />
                        Live Proctoring Dashboard
                    </h1>
                    <p className="text-slate-400">Monitoring {activeSessions.length} active sessions</p>
                </div>
            </div>
            <div className="flex gap-4 items-center">
                <Button size="sm" variant="ghost" onClick={() => setNotifications(prev => [...prev, { id: Date.now().toString(), message: "Test Notification", type: "info" }])}>
                    Test Notification
                </Button>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                        type="text"
                        placeholder="Find student..."
                        className="bg-navy-900 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                </div>
                <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                    Suspend All
                </Button>
            </div>

            {/* Notifications Container */}
            <div className="fixed top-24 right-6 z-50 flex flex-col gap-2 w-80">
                {notifications.map(note => (
                    <div key={note.id} className={`p-4 rounded shadow-lg border-l-4 text-white animate-in slide-in-from-right fade-in duration-300 ${note.type === 'success' ? 'bg-green-900/90 border-green-500' :
                        note.type === 'alert' ? 'bg-red-900/90 border-red-500' : 'bg-slate-800 border-blue-500'
                        }`}>
                        <div className="flex justify-between items-start">
                            <span>{note.message}</span>
                            <button onClick={() => setNotifications(prev => prev.filter(n => n.id !== note.id))} className="text-white/50 hover:text-white"><XCircle size={14} /></button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {activeSessions.map(session => (
                    <SessionGridCard
                        key={session.id}
                        session={session}
                        isSelected={selectedSession?.id === session.id}
                        onClick={() => setSelectedSession(session)}
                        onAuthorize={(e) => handleAuthorize(session.id, e)}
                        onSuspend={(id) => handleSuspend(id)}
                        onVoid={(id) => handleVoidExam(id)}
                    />
                ))}
            </div>

            {/* Selected Session Detail Sidebar (Modal) */}
            {
                selectedSession && (
                    <div className="fixed inset-y-0 right-0 w-[500px] bg-navy-900 border-l border-white/10 p-6 shadow-2xl overflow-y-auto transform transition-transform z-50">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Session Details</h2>
                            <button onClick={() => setSelectedSession(null)}><XCircle className="text-slate-500 hover:text-white" /></button>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-black rounded-lg border border-slate-700 overflow-hidden relative">
                                <div className="aspect-video flex items-center justify-center bg-black">
                                    {adminToken ? (
                                        <LiveKitRoom
                                            video={isCamOn}
                                            audio={isMicOn}
                                            token={adminToken}
                                            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                                            connect={true}
                                            onConnected={() => console.log("ADMIN: Connected to LiveKit Room")}
                                            onDisconnected={() => {
                                                console.log("ADMIN: Disconnected");
                                                setIsMicOn(false);
                                                setIsCamOn(false);
                                            }}
                                            data-lk-theme="default"
                                            style={{ width: "100%", height: "100%" }}
                                        >
                                            <SessionView />
                                            <RoomAudioRenderer />
                                        </LiveKitRoom>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-slate-500">
                                            <Loader2 className="animate-spin" />
                                            <span className="text-xs">Connecting to student feed...</span>
                                        </div>
                                    )}
                                </div>

                                {/* Intercom Controls Bar */}
                                <div className="bg-navy-800 p-3 flex items-center justify-between border-t border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isMicOn || isCamOn ? "text-red-500 animate-pulse" : "text-slate-500"}`}>
                                            <div className={`w-2 h-2 rounded-full ${isMicOn || isCamOn ? "bg-red-500" : "bg-slate-600"}`} />
                                            {isMicOn || isCamOn ? "Broadcasting Live" : "Intercom Off"}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => setIsMicOn(!isMicOn)}
                                            className={`h-8 text-xs gap-2 ${isMicOn ? "bg-red-600 hover:bg-red-500 text-white" : ""}`}
                                        >
                                            {isMicOn ? <Video size={14} className="animate-pulse" /> : <Video size={14} />}
                                            {isMicOn ? "Mic ON" : "Mic Off"}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => setIsCamOn(!isCamOn)}
                                            className={`h-8 text-xs gap-2 ${isCamOn ? "bg-red-600 hover:bg-red-500 text-white" : ""}`}
                                        >
                                            {isCamOn ? <Video size={14} className="animate-pulse" /> : <Video size={14} />}
                                            {isCamOn ? "Cam ON" : "Cam Off"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-white">{selectedSession.userName}</h3>
                            <p className="text-sm text-slate-400">{selectedSession.courseName}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                                <div className="text-xs text-slate-400">Status</div>
                                <div className={`font-bold ${selectedSession.status === 'flagged' ? 'text-red-400' : 'text-green-400'
                                    }`}>
                                    {selectedSession.status?.toUpperCase()}
                                </div>
                            </div>
                            <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                                <div className="text-xs text-slate-400">Total Alerts</div>
                                <div className="font-bold text-white">{selectedSession.alerts}</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-semibold text-white">Latest Logs</h4>
                            <div className="text-xs space-y-2 text-slate-400">
                                {selectedSession.status === "flagged" && (
                                    <p className="text-red-400">[ALERT] Suspicious activity detected.</p>
                                )}
                                <p>[INFO] Last Active: {selectedSession.lastActive?.toDate ? selectedSession.lastActive.toDate().toLocaleTimeString() : "Just now"}</p>
                                <p>[INFO] Session ID: {selectedSession.id}</p>
                            </div>

                            {/* Detailed Alerts Log */}
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                    <AlertTriangle size={14} className="text-yellow-500" />
                                    Alert History
                                </h4>
                                <SessionAlerts sessionId={selectedSession.id} />
                            </div>
                        </div>

                        <div className="pt-6 space-y-3">
                            {selectedSession.status === "waiting-approval" ? (
                                <Button className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg font-bold" onClick={(e) => handleAuthorize(selectedSession.id, e)}>
                                    AUTHORIZE EXAM START
                                </Button>
                            ) : (
                                <>
                                    <Button className="w-full bg-red-600 hover:bg-red-700" onClick={() => handleVoidExam(selectedSession.id)}>
                                        Terminate Session (Void)
                                    </Button>
                                    <Button className="w-full border-slate-600" variant="outline" onClick={() => handleForceSubmit(selectedSession.id)}>
                                        Force Submit & End
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                )
            }
        </div>
    );
}

function SessionGridCard({
    session,
    isSelected,
    onClick,
    onAuthorize,
    onSuspend,
    onVoid
}: {
    session: StudentSession,
    isSelected: boolean,
    onClick: () => void,
    onAuthorize: (e: React.MouseEvent) => void,
    onSuspend: (id: string) => void,
    onVoid: (id: string) => void
}) {
    const [token, setToken] = useState("");

    // Fetch token for this specific session
    useEffect(() => {
        const fetchToken = async () => {
            try {
                const roomName = `exam-${session.userId}`;
                const resp = await fetch(`/api/livekit/token?room=${roomName}&username=AdminProctor&admin=true`);
                const data = await resp.json();
                if (data.token) {
                    setToken(data.token);
                }
            } catch (error) {
                console.error("Failed to fetch token for card", error);
            }
        };
        fetchToken();
    }, [session.userId]);

    return (
        <div
            className={`relative bg-black rounded-lg overflow-hidden aspect-video border-2 group cursor-pointer transition-all ${session.status === "flagged" ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]" :
                session.status === "paused" ? "border-yellow-500" :
                    isSelected ? "border-blue-500 scale-105 z-10" : "border-slate-800 hover:border-slate-600"
                }`}
            onClick={onClick}
        >
            <div className="w-full h-full bg-navy-800 flex items-center justify-center relative">
                {token ? (
                    <LiveKitRoom
                        video={false}
                        audio={false}
                        token={token}
                        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                        connect={true}
                        data-lk-theme="default"
                        style={{ width: "100%", height: "100%" }}
                    >
                        <GridVideoView />
                    </LiveKitRoom>
                ) : (
                    <span className="opacity-20"><User size={48} /></span>
                )}

                {/* Overlay Info - Keeping it above the video */}
                <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-xs backdrop-blur-sm z-10">
                    {session.userName}
                </div>

                {session.status === "flagged" && (
                    <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold animate-pulse flex items-center gap-1 z-10">
                        <AlertTriangle size={12} /> ALERT
                    </div>
                )}
                {session.status === "room-scan" && (
                    <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold animate-pulse z-10">
                        SCANNING ROOM
                    </div>
                )}
                {session.status === "waiting-approval" && (
                    <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold animate-pulse z-10">
                        AWAITING APPROVAL
                    </div>
                )}
                {session.alerts > 0 && session.status !== "flagged" && (
                    <div className="absolute bottom-2 right-2 bg-yellow-600 text-white px-2 py-0.5 rounded text-[10px] font-bold z-10">
                        {session.alerts} ALERTS
                    </div>
                )}
            </div>

            {/* Hover Controls */}
            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4 z-20">
                {session.status === "waiting-approval" ? (
                    <Button size="sm" className="w-full bg-green-600 hover:bg-green-500" onClick={onAuthorize}>
                        AUTHORIZE START
                    </Button>
                ) : (
                    <>
                        <Button size="sm" variant="outline" className="w-full border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10" onClick={(e) => { e.stopPropagation(); onSuspend(session.id); }}>Suspend</Button>
                        <Button size="sm" variant="outline" className="w-full text-red-400 border-red-500/50" onClick={(e) => { e.stopPropagation(); onVoid(session.id); }}>Void Exam</Button>
                    </>
                )}
            </div>
        </div>
    );
}

function GridVideoView() {
    const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false })
        .filter(ref => !ref.participant.isLocal);

    if (tracks.length === 0) {
        return <div className="w-full h-full flex items-center justify-center text-slate-700"><User size={24} opacity={0.5} /></div>;
    }

    return (
        <ParticipantTile
            trackRef={tracks[0]}
            className="w-full h-full object-cover"
            disableSpeakingIndicator={true}
        />
    );
}

function SessionView() {
    // Get camera tracks from all participants, filtered by remote
    const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false })
        .filter(ref => !ref.participant.isLocal);

    console.log("SessionView Tracks:", tracks);

    if (tracks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                <Loader2 className="animate-spin" />
                <span className="text-xs">Waiting for video stream...</span>
            </div>
        );
    }

    // Render a grid of tiles
    return (
        <div className="w-full h-full grid grid-cols-1 gap-4">
            {tracks.map((track) => (
                <ParticipantTile
                    key={track.participant.identity}
                    trackRef={track}
                    className="w-full h-full border border-slate-700 rounded-lg overflow-hidden"
                />
            ))}
        </div>
    );
}

function SessionAlerts({ sessionId }: { sessionId: string }) {
    const [alerts, setAlerts] = useState<{ id: string, message: string, timestamp: any }[]>([]);

    useEffect(() => {
        const q = query(
            collection(db, "exam_sessions", sessionId, "alerts"),
            orderBy("timestamp", "desc")
        );

        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as { id: string, message: string, timestamp: any }));
            setAlerts(list);
        });

        return () => unsub();
    }, [sessionId]);

    if (alerts.length === 0) {
        return <div className="text-xs text-slate-500 italic py-2">No alerts recorded yet.</div>;
    }

    return (
        <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {alerts.map(alert => (
                <div key={alert.id} className="bg-red-500/10 border border-red-500/20 p-2 rounded text-xs flex justify-between items-start">
                    <span className="text-red-200">{alert.message}</span>
                    <span className="text-slate-500 text-[10px] whitespace-nowrap ml-2">
                        {alert.timestamp?.toDate ? alert.timestamp.toDate().toLocaleTimeString() : "Just now"}
                    </span>
                </div>
            ))}
        </div>
    );
}
