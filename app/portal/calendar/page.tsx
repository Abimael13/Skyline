"use client";

import { useAuth } from "@/lib/AuthContext";
import { COURSES } from "@/lib/courses";
import { Calendar as CalendarIcon, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function CalendarPage() {
    const { enrolledCourses, user, loading } = useAuth();

    // Demo logic: if user is 'andy.herrera', show F-89
    const isDemoUser = user?.email?.includes("andy.herrera");
    const myCourses = COURSES.filter(course =>
        enrolledCourses.includes(course.id) || (isDemoUser && course.id === "f89-flsd")
    );

    const allDates = myCourses.flatMap(course =>
        course.upcomingDates.map(date => ({
            courseTitle: course.title,
            dateString: date,
            courseId: course.id
        }))
    );

    if (loading) {
        return <div className="text-white">Loading calendar...</div>;
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/portal/dashboard">
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                        <ArrowLeft size={20} />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-white">Course Calendar</h1>
                    <p className="text-slate-400">Upcoming sessions for your enrolled courses.</p>
                </div>
            </div>

            {allDates.length === 0 ? (
                <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-400">
                        <CalendarIcon size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">No upcoming dates</h2>
                    <p className="text-slate-400 mb-6">You don't have any upcoming classes scheduled.</p>
                    <Link href="/portal/catalog">
                        <Button>Browse Course Catalog</Button>
                    </Link>
                </div>
            ) : (
                <div className="bg-navy-900 border border-white/5 rounded-2xl overflow-hidden">
                    <div className="divide-y divide-white/5">
                        {allDates.map((item, i) => (
                            <div key={i} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-blue-500/20 text-blue-400 rounded-lg">
                                        <CalendarIcon size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{item.dateString}</h3>
                                        <div className="flex items-center gap-2 text-slate-400 mt-1">
                                            <span className="font-medium text-blue-300">{item.courseTitle}</span>
                                        </div>
                                    </div>
                                </div>

                                <Link href={`/portal/courses`}>
                                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                                        Go to Course
                                    </Button>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
