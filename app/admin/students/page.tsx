"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Search, Mail, BookOpen, Shield, Trash2, Calendar, Filter } from "lucide-react";
import Link from "next/link";

interface UserData {
    uid: string;
    email: string;
    displayName?: string;
    enrolledCourses?: string[];
    enrolledSessions?: string[]; // Added session tracking
    role?: string;
}

interface SessionData {
    id: string;
    courseId: string;
    startDate: string;
    endDate: string;
}

export default function StudentsPage() {
    const [students, setStudents] = useState<UserData[]>([]);
    const [sessions, setSessions] = useState<SessionData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCohort, setSelectedCohort] = useState<string>("all");

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Students
                const usersSnap = await getDocs(collection(db, "users"));
                const studentsData: UserData[] = [];
                usersSnap.forEach((doc) => {
                    const data = doc.data();
                    studentsData.push({
                        uid: doc.id,
                        email: data.email,
                        displayName: data.displayName,
                        enrolledCourses: data.enrolledCourses,
                        enrolledSessions: data.enrolledSessions || [],
                        role: data.role
                    } as UserData);
                });

                // 2. Fetch Sessions for Cohort Mapping
                const sessionsSnap = await getDocs(collection(db, "sessions"));
                const sessionsData = sessionsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as SessionData[];

                setStudents(studentsData);
                setSessions(sessionsData);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleDelete = async (uid: string) => {
        if (!confirm("Are you sure you want to delete this user? This will remove their profile data.")) return;

        try {
            await deleteDoc(doc(db, "users", uid));
            setStudents(prev => prev.filter(s => s.uid !== uid));
        } catch (error) {
            console.error("Error deleting user:", error);
            alert("Failed to delete user.");
        }
    };

    const getSessionLabel = (sessionId: string) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return sessionId;
        const date = new Date(session.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        return `${session.courseId?.toUpperCase() || 'Course'} (${date})`;
    };

    const filteredStudents = students.filter(student => {
        const matchesSearch = student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.displayName?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCohort = selectedCohort === "all" ||
            (student.enrolledSessions && student.enrolledSessions.includes(selectedCohort));

        return matchesSearch && matchesCohort;
    });

    // Get unique sessions that actually have students (plus active ones)
    const activeCohortIds = Array.from(new Set(students.flatMap(s => s.enrolledSessions || [])));

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Students</h1>
                    <p className="text-slate-400">Manage registered candidates and their enrollments.</p>
                </div>
            </div>

            <div className="bg-navy-900 border border-white/5 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-navy-950 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="flex items-center gap-2 max-w-xs w-full">
                        <Filter size={18} className="text-slate-500" />
                        <select
                            value={selectedCohort}
                            onChange={(e) => setSelectedCohort(e.target.value)}
                            className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
                        >
                            <option value="all">All Cohorts / Dates</option>
                            {activeCohortIds.map(sessionId => (
                                <option key={sessionId} value={sessionId}>
                                    {getSessionLabel(sessionId)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="animate-spin text-blue-500" size={32} />
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        No students found matching your filters.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-navy-950 text-slate-400 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4">Cohort</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredStudents.map((student) => {
                                    const studentCohortLabel = student.enrolledSessions && student.enrolledSessions.length > 0
                                        ? getSessionLabel(student.enrolledSessions[0])
                                        : "Self-Paced / None";

                                    return (
                                        <tr key={student.uid} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xs">
                                                        {student.displayName ? student.displayName.charAt(0).toUpperCase() : "?"}
                                                    </div>
                                                    <span className="font-medium text-white">
                                                        {student.displayName || "Unknown Name"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">
                                                <div className="flex items-center gap-2">
                                                    <Mail size={14} className="text-slate-500" />
                                                    {student.email}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-300 bg-slate-800/30 w-fit px-2 py-1 rounded-md text-xs border border-white/5">
                                                    <Calendar size={14} className="text-blue-400" />
                                                    {studentCohortLabel}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {student.role === 'admin' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-medium">
                                                            <Shield size={12} /> Admin
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400 text-xs font-medium">
                                                            Student
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Link href={`/admin/students/${student.uid}`}>
                                                        <button className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-colors">
                                                            View Profile
                                                        </button>
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(student.uid)}
                                                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
