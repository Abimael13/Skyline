"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CourseModuleList } from "@/components/dashboard/CourseModuleList";
import { BookOpen, ShoppingBag } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Course } from "@/lib/courses";
import { getCourseById } from "@/lib/db";
import { LiveClassButton } from "@/components/dashboard/LiveClassButton";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function MyCoursesPage() {
    const { enrolledCourses, loading: authLoading, user } = useAuth();
    const searchParams = useSearchParams();
    const expandId = searchParams.get('expand');

    const [myCourses, setMyCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);

    useEffect(() => {
        const fetchCourses = async () => {
            if (authLoading) return;

            // 1. Identify which courses to fetch
            const courseIdsToFetch = new Set<string>(enrolledCourses);

            // Demo Logic: If user is "Andy.herrera3190", auto-show F-89
            const isDemoUser = user?.email?.toLowerCase().includes("andy.herrera");
            if (isDemoUser) {
                courseIdsToFetch.add("f89-flsd");
            }

            if (courseIdsToFetch.size === 0) {
                setMyCourses([]);
                setLoadingCourses(false);
                return;
            }

            // 2. Fetch specific courses from DB
            const fetchedCourses: Course[] = [];
            for (const id of Array.from(courseIdsToFetch)) {
                const course = await getCourseById(id);
                if (course) {
                    fetchedCourses.push(course);
                }
            }

            setMyCourses(fetchedCourses);
            setLoadingCourses(false);
        };

        fetchCourses();
    }, [enrolledCourses, authLoading, user]);


    if (authLoading || loadingCourses) {
        return (
            <div className="space-y-8 animate-pulse">
                <div>
                    <div className="h-8 w-48 bg-slate-800 rounded mb-2"></div>
                    <div className="h-4 w-96 bg-slate-800/50 rounded"></div>
                </div>
                <div className="h-64 bg-navy-900/50 border border-white/5 rounded-2xl"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">My Courses</h1>
                <p className="text-slate-400">Manage your active certifications and training modules.</p>
            </div>

            {myCourses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-navy-900/50 border border-white/5 rounded-2xl border-dashed">
                    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                        <ShoppingBag size={32} className="text-slate-500" />
                    </div>
                    <h3 className="text-lg font-medium text-white">No courses yet</h3>
                    <p className="text-slate-500 mt-2 mb-6 max-w-sm text-center">
                        You haven't enrolled in any courses yet. Visit the catalog to get started.
                    </p>
                    <div className="flex gap-4">
                        <Link href="/portal/catalog">
                            <Button>Browse Catalog</Button>
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="grid gap-6">
                    {myCourses.map(course => (
                        <div
                            key={course.id}
                            className="bg-navy-900/50 border border-white/5 rounded-2xl p-6"
                        >
                            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 border-b border-white/5 pb-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-lg bg-blue-600/20 text-blue-400">
                                        <BookOpen size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">{course.title}</h2>
                                        <p className="text-sm text-slate-400">{course.duration}</p>
                                    </div>
                                </div>

                                <div className="md:ml-auto flex items-center gap-3">
                                    <div className="px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20">
                                        In Progress
                                    </div>
                                    {/* Live Class Button Logic */}
                                    {course.format === "Live + Online" && (() => {
                                        return (
                                            <LiveSessionStatus
                                                courseId={course.id}
                                                zoomLink={course.zoomLink}
                                            />
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Ensure modules exist before rendering list */}
                            <CourseModuleList
                                collapsible
                                defaultOpen={expandId === course.id}
                                modules={course.modules || []}
                                courseId={course.id}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}



function LiveSessionStatus({ courseId, zoomLink }: { courseId: string, zoomLink: string }) {
    const { enrolledSessions } = useAuth();
    // Use the inner checker to handle async logic
    return (
        <LiveClassChecker
            courseId={courseId}
            enrolledSessions={enrolledSessions}
            zoomLink={zoomLink}
        />
    );
}

function LiveClassChecker({ courseId, enrolledSessions, zoomLink }: { courseId: string, enrolledSessions: string[], zoomLink: string }) {
    const [isLive, setIsLive] = useState(false);
    const [nextClass, setNextClass] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [mySessionId, setMySessionId] = useState<string | null>(null);

    useEffect(() => {
        const checkStatus = async () => {
            if (!enrolledSessions || enrolledSessions.length === 0) {
                setLoading(false);
                return;
            }

            let foundSession = null;

            for (const sId of enrolledSessions) {
                try {
                    const snap = await getDoc(doc(db, "sessions", sId));
                    if (snap.exists() && snap.data().courseId === courseId) {
                        foundSession = snap.data();
                        setMySessionId(sId);
                        break;
                    }
                } catch (e) {
                    console.error(e);
                }
            }

            if (!foundSession) {
                setLoading(false);
                return;
            }

            const now = new Date();
            const start = new Date(foundSession.startDate);
            const end = new Date(foundSession.endDate);

            // Check if within date range (Active Course Duration)
            const isWithinDates = now >= start && now <= end;

            // Check if within Time of Day (e.g. 9am - 5pm)
            const currentHour = now.getHours();
            const currentMin = now.getMinutes();

            const startHour = start.getHours();
            const startMin = start.getMinutes();
            const endHour = end.getHours();
            const endMin = end.getMinutes();

            // Time compare (minutes since midnight)
            const nowMins = currentHour * 60 + currentMin;
            const startMins = startHour * 60 + startMin;
            const endMins = endHour * 60 + endMin;

            const isWithinTime = nowMins >= startMins && nowMins <= endMins;

            if (isWithinDates && isWithinTime) {
                setIsLive(true);
            } else {
                setIsLive(false);
                if (now < start) {
                    setNextClass(start.toLocaleDateString() + " " + start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                } else if (isWithinDates && !isWithinTime) {
                    // Next class is probably tomorrow same time? matching startHour
                    setNextClass("Tomorrow " + start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                }
            }

            setLoading(false);
        };

        checkStatus();
    }, [enrolledSessions, courseId]);

    if (loading) return <div className="h-8 w-24 bg-slate-800/50 rounded animate-pulse" />;

    if (isLive) {
        return <LiveClassButton zoomLink={zoomLink} sessionId={mySessionId || undefined} />;
    }

    if (mySessionId) {
        return (
            <div className="px-3 py-1.5 rounded-full bg-slate-800 text-slate-400 text-xs font-medium border border-white/5">
                {nextClass ? `Next: ${nextClass}` : 'Class Not in Session'}
            </div>
        );
    }

    return null;
}
