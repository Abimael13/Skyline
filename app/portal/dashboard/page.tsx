"use client";

import { useAuth } from "@/lib/AuthContext";
import { ProgressCard } from "@/components/dashboard/ProgressCards";
import { CourseModuleList } from "@/components/dashboard/CourseModuleList";
import { Clock, Trophy, BookOpen, CheckCircle } from "lucide-react";
import { COURSES } from "@/lib/courses";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function Dashboard() {
    const { user, enrolledCourses, examResults, loading } = useAuth();
    const userName = user?.displayName || user?.email?.split("@")[0] || "Candidate";

    // Get full course details for enrolled courses
    const myCourses = COURSES.filter(course => enrolledCourses.includes(course.id));

    if (loading) {
        return <div className="text-white">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-white">
                        Welcome back, <span className="text-blue-400 capitalize">{userName}</span>
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Continue your progress towards FDNY certification.
                    </p>
                </div>
                {myCourses.length > 0 && (
                    <div className="text-sm text-slate-400 hidden md:block">
                        Enrolled in <span className="text-white font-medium">{myCourses.length}</span> course{myCourses.length !== 1 ? 's' : ''}
                    </div>
                )}
            </div>

            {/* Empty State if no courses */}
            {myCourses.length === 0 ? (
                <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-400">
                        <BookOpen size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">You haven't enrolled in any courses yet</h2>
                    <p className="text-slate-400 max-w-md mx-auto mb-8">
                        Browse our catalog to find the right training for your FDNY certification needs.
                    </p>
                    <Link href="/courses">
                        <Button>Browse Courses</Button>
                    </Link>
                </div>
            ) : (
                <>
                    {/* Getting Started Checklist (Onboarding) */}
                    <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-2xl p-6 mb-8">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <CheckCircle className="text-blue-400" size={20} />
                                    Getting Started Checklist
                                </h3>
                                <p className="text-slate-400 text-sm mt-1">
                                    Complete these steps before your first live class to ensure success.
                                </p>
                            </div>
                            <span className="text-xs font-bold bg-blue-500 text-white px-3 py-1 rounded-full">
                                0 / 4 Completed
                            </span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            {[
                                { id: 1, label: "Download FDNY FLSD Manual", action: "Download", link: "#" },
                                { id: 2, label: "Download CBT Success Guide", action: "Download", link: "#" },
                                { id: 3, label: "Watch Welcome Video", action: "Watch", link: "#" },
                                { id: 4, label: "Complete Module 1: Fire Basics", action: "Start", link: "/portal/learning/class-1" }
                            ].map((item) => (
                                <div key={item.id} className="flex items-center justify-between bg-navy-950/50 border border-white/5 p-4 rounded-xl group hover:border-blue-500/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full border-2 border-slate-600 group-hover:border-blue-500 transition-colors" />
                                        <span className="text-slate-300 text-sm font-medium">{item.label}</span>
                                    </div>
                                    <Link
                                        href={item.link}
                                        className="text-xs font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider"
                                    >
                                        {item.action}
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            {/* For now, just show the first enrolled course as the main progress card */}
                            <ProgressCard
                                percentage={0} // TODO: hook up real progress
                                label={myCourses[0].title}
                                sublabel={`${myCourses[0].duration} Course Compliance`}
                            />
                        </div>

                        <div className="bg-navy-900 border border-white/5 rounded-2xl p-6 flex flex-col justify-center space-y-4">
                            <div className="flex items-center gap-3 text-slate-300">
                                <Clock className="text-blue-500" />
                                <span className="font-medium">0 Hrs Completed</span> {/* TODO: hook up real stats */}
                            </div>
                            <div className="flex items-center gap-3 text-slate-300">
                                <Trophy className="text-yellow-500" />
                                <span className="font-medium">0 Modules Passed</span> {/* TODO: hook up real stats */}
                            </div>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <h3 className="font-semibold text-white text-lg">Your Courses</h3>
                            {myCourses.map(course => {
                                const result = examResults?.[course.id];
                                return (
                                    <div key={course.id} className="bg-navy-900 border border-white/5 rounded-xl p-6 relative overflow-hidden">
                                        {/* Status Badge */}
                                        {result && result.status && (
                                            <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-xl text-xs font-bold uppercase tracking-wider ${result.status === 'passed' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                                }`}>
                                                Exam {result.status}
                                            </div>
                                        )}

                                        <h4 className="font-bold text-white mb-2">{course.title}</h4>
                                        <p className="text-slate-400 text-sm mb-4">{course.description}</p>

                                        <div className="flex flex-wrap gap-3 items-center">
                                            <Button size="sm" variant="outline">View Course Content</Button>

                                            {/* Exam Result Actions */}
                                            {result?.status === 'passed' && result.diplomaUrl && (
                                                <a href={result.diplomaUrl} target="_blank" className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all">
                                                    <Trophy size={16} /> Download Diploma
                                                </a>
                                            )}

                                            {result?.status === 'failed' && (
                                                <Link href="/portal/exam/schedule-retake">
                                                    <Button size="sm" className="bg-red-600 hover:bg-red-500 border-red-500">
                                                        Schedule Retake (Due by {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()})
                                                    </Button>
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="bg-navy-900 border border-white/5 rounded-2xl p-6 h-fit sticky top-24">
                            <h3 className="font-semibold text-white mb-4">Upcoming Schedule</h3>
                            {myCourses.flatMap(c => c.upcomingDates).slice(0, 3).length > 0 ? (
                                <div className="space-y-4">
                                    {/* This is a bit of a placeholder since upcomingDates are strings in the current model. 
                                         Ideally we'd pars them. For now just listing them. */}
                                    {myCourses.flatMap(c => c.upcomingDates).slice(0, 3).map((date, i) => (
                                        <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/5">
                                            <div className="text-sm font-medium text-blue-400">{date}</div>
                                            <div className="text-slate-200">Course Start</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-500 text-sm">No upcoming dates scheduled.</p>
                            )}

                            <Link href="/portal/calendar">
                                <Button className="w-full mt-6" variant="outline">
                                    View Full Calendar
                                </Button>
                            </Link>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
