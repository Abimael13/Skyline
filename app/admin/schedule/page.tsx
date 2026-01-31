"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Course } from "@/lib/courses";
import { ClassSession } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Calendar, Plus, Trash2, Clock, Users, ArrowRight, Pencil, X } from "lucide-react";

export default function ScheduleManager() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [sessions, setSessions] = useState<ClassSession[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [selectedCourseId, setSelectedCourseId] = useState<string>("");
    const [startDate, setStartDate] = useState("");
    const [startTime, setStartTime] = useState("09:00");
    const [endDate, setEndDate] = useState("");
    const [endTime, setEndTime] = useState("17:00");
    const [daySchedule, setDaySchedule] = useState("Mon-Fri, 9am-5pm");
    const [capacity, setCapacity] = useState(25);
    const [submitting, setSubmitting] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Courses
            const coursesSnap = await getDocs(collection(db, "courses"));
            const fetchedCourses: Course[] = [];
            coursesSnap.forEach(doc => fetchedCourses.push(doc.data() as Course));
            setCourses(fetchedCourses);

            if (fetchedCourses.length > 0 && !selectedCourseId) {
                setSelectedCourseId(fetchedCourses[0].id);
            }

            // 2. Fetch Sessions
            // Ideally filtering by course if list is huge, but fetching all for now is fine for admin
            const sessionsSnap = await getDocs(collection(db, "sessions"));
            const fetchedSessions: ClassSession[] = [];
            sessionsSnap.forEach(doc => {
                const data = doc.data();
                // Add ID from doc
                fetchedSessions.push({ ...data, id: doc.id } as ClassSession);
            });

            // Sort by start date
            fetchedSessions.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

            setSessions(fetchedSessions);

        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSession = async () => {
        if (!selectedCourseId || !startDate || !endDate) return;
        setSubmitting(true);

        try {
            // Construct ISO Dates
            const startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
            const endDateTime = new Date(`${endDate}T${endTime}`).toISOString();

            const newSession: Omit<ClassSession, 'id'> = {
                courseId: selectedCourseId,
                startDate: startDateTime,
                endDate: endDateTime,
                daySchedule: daySchedule,
                enrolledCount: 0,
                globalCapacity: capacity,
                status: 'open',
                isLiveSessionLocked: true, // Default to locked
                productIds: []
            };

            const result = await addDoc(collection(db, "sessions"), newSession);

            // Update local state
            setSessions(prev => [...prev, { ...newSession, id: result.id }].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));

            // Reset relevant form fields (keep course selected)
            // setStartDate(""); setEndDate("");
            alert("Session created successfully!");

        } catch (error) {
            console.error("Error creating session:", error);
            alert("Failed to create session.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteSession = async (sessionId: string) => {
        if (!confirm("Are you sure you want to delete this session? This will affect enrolled students.")) return;
        try {
            await deleteDoc(doc(db, "sessions", sessionId));
            setSessions(prev => prev.filter(s => s.id !== sessionId));
        } catch (error) {
            console.error("Error deleting session:", error);
            alert("Failed to delete session.");
        }
    };

    const handleEditClick = (session: ClassSession) => {
        setEditingSessionId(session.id || null);
        setSelectedCourseId(session.courseId || "");

        // Parse ISO dates back to form values
        const start = new Date(session.startDate);
        const end = new Date(session.endDate);

        // Helper to format date as YYYY-MM-DD
        const formatDate = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // Helper to format time as HH:MM
        const formatTime = (d: Date) => {
            return d.toTimeString().slice(0, 5);
        };

        setStartDate(formatDate(start));
        setStartTime(formatTime(start));
        setEndDate(formatDate(end));
        setEndTime(formatTime(end));

        setDaySchedule(session.daySchedule);
        setCapacity(session.globalCapacity);
    };

    const handleCancelEdit = () => {
        setEditingSessionId(null);
        setStartDate("");
        setStartTime("09:00");
        setEndDate("");
        setEndTime("17:00");
        setDaySchedule("Mon-Fri, 9am-5pm");
        setCapacity(25);
    };

    const handleUpdateSession = async () => {
        if (!selectedCourseId || !startDate || !endDate || !editingSessionId) return;
        setSubmitting(true);

        try {
            const startDateTime = new Date(`${startDate}T${startTime}`).toISOString();
            const endDateTime = new Date(`${endDate}T${endTime}`).toISOString();

            const updatedData = {
                courseId: selectedCourseId,
                startDate: startDateTime,
                endDate: endDateTime,
                daySchedule: daySchedule,
                globalCapacity: capacity,
            };

            await updateDoc(doc(db, "sessions", editingSessionId), updatedData);

            // Update local state
            setSessions(prev => prev.map(s =>
                s.id === editingSessionId ? { ...s, ...updatedData } : s
            ).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));

            alert("Session updated successfully!");
            handleCancelEdit();

        } catch (error) {
            console.error("Error updating session:", error);
            alert("Failed to update session.");
        } finally {
            setSubmitting(false);
        }
    };

    const selectedCourse = courses.find(c => c.id === selectedCourseId);
    const filteredSessions = sessions.filter(s => s.courseId === selectedCourseId);

    if (loading) return <div className="p-12 text-center text-slate-500">Loading schedule manager...</div>;

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Schedule Manager</h1>
                    <p className="text-slate-400">Create and manage class sessions for student enrollment.</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left: Create Session Form */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-navy-900 border border-white/5 rounded-2xl p-6 shadow-xl sticky top-24">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center justify-between gap-2">
                            {editingSessionId ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        <Pencil size={20} className="text-blue-500" /> Edit Session
                                    </div>
                                    <button onClick={handleCancelEdit} className="text-slate-400 hover:text-white transition-colors">
                                        <X size={20} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2">
                                        <Plus size={20} className="text-blue-500" /> Create Session
                                    </div>
                                </>
                            )}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Select Course</label>
                                <select
                                    className="w-full bg-navy-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
                                    value={selectedCourseId}
                                    onChange={(e) => setSelectedCourseId(e.target.value)}
                                >
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-navy-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Time</label>
                                    <input
                                        type="time"
                                        className="w-full bg-navy-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">End Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-navy-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Time</label>
                                    <input
                                        type="time"
                                        className="w-full bg-navy-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Format / Schedule Text</label>
                                <input
                                    type="text"
                                    className="w-full bg-navy-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                    placeholder="e.g. Mon-Fri, 9am - 4pm"
                                    value={daySchedule}
                                    onChange={(e) => setDaySchedule(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Capacity</label>
                                <input
                                    type="number"
                                    className="w-full bg-navy-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                    value={capacity}
                                    onChange={(e) => setCapacity(Number(e.target.value))}
                                />
                            </div>

                            <Button
                                className="w-full mt-4"
                                onClick={editingSessionId ? handleUpdateSession : handleCreateSession}
                                disabled={submitting || !startDate || !endDate}
                            >
                                {submitting ? (editingSessionId ? "Updating..." : "Creating...") : (editingSessionId ? "Update Session" : "Add to Schedule")}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Right: Session List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">
                            Scheduled Sessions: <span className="text-blue-400">{selectedCourse?.title}</span>
                        </h2>
                        <div className="text-sm text-slate-400">
                            {filteredSessions.length} sessions found
                        </div>
                    </div>

                    <div className="grid gap-4">
                        {filteredSessions.length === 0 ? (
                            <div className="bg-navy-900/50 border border-dashed border-white/10 rounded-xl p-12 text-center text-slate-500">
                                No sessions scheduled for this course yet.
                            </div>
                        ) : filteredSessions.map(session => (
                            <div key={session.id} className="bg-navy-900 border border-white/5 rounded-xl p-5 hover:border-blue-500/30 transition-all group">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-500/20 text-blue-300">
                                                {session.status}
                                            </span>
                                            <span className="text-xs text-slate-500 font-mono">ID: {session.id}</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            <Calendar size={18} className="text-blue-500" />
                                            {new Date(session.startDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                            <ArrowRight size={16} className="text-slate-600" />
                                            {new Date(session.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </h3>
                                        <div className="text-slate-400 text-sm mt-1 flex items-center gap-4">
                                            <span className="flex items-center gap-1.5">
                                                <Clock size={14} /> {session.daySchedule}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Users size={14} /> {session.enrolledCount} / {session.globalCapacity} Students
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => handleEditClick(session)}
                                            className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            title="Edit Session"
                                        >
                                            <Pencil size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteSession(session.id || "")}
                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            title="Cancel Session"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
