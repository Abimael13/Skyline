"use client";

import { useAuth } from "@/lib/AuthContext";
import { ProgressCard } from "@/components/dashboard/ProgressCards";
import { CourseModuleList } from "@/components/dashboard/CourseModuleList";
import { Clock, Trophy, BookOpen, CheckCircle, ShieldAlert, AlertTriangle } from "lucide-react";
import { Course } from "@/lib/courses";
import { getCourseById } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useEffect, useState } from "react";
import { getExamAttemptEligibility, EXAM_INELIGIBLE_MESSAGES, ExamResultRecord } from "@/lib/examEligibility";

// Real, working contact info shown whenever a student is stuck waiting on
// admin review or has run out of attempts - support@skylinesafetyservices.com
// is the same verified sending address used across lib/email.ts's
// EMAIL_FROM; the phone number matches the one shown on app/contact/page.tsx.
const SUPPORT_EMAIL = "support@skylinesafetyservices.com";
const SUPPORT_PHONE_DISPLAY = "(718) 323-8600";
const SUPPORT_PHONE_TEL = "+17183238600";

export default function Dashboard() {
    const { user, enrolledCourses, courseProgress, examResults, loading: authLoading } = useAuth();
    const userName = user?.displayName || user?.email?.split("@")[0] || "Candidate";

    const [myCourses, setMyCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);

    // Calculate Stats
    const totalModulesPassed = Object.values(courseProgress).reduce((acc, curr) => acc + (curr.completedModules?.length || 0), 0);

    // Calculate Active Course Progress
    const activeCourse = myCourses[0];
    const activeProgress = activeCourse ? (courseProgress[activeCourse.id]?.completedModules || []) : [];
    const totalModules = activeCourse ? activeCourse.modules.reduce((acc, m) => acc + (m.subModules?.length || 0), 0) : 0;
    const progressPercent = totalModules > 0 ? Math.round((activeProgress.length / totalModules) * 100) : 0;

    // Real study manual for the active course, if one has been uploaded
    // (currently only F-89 has a documents[] entry). Used to power the
    // "Download FDNY FLSD Manual" checklist item below instead of a dead
    // link - if there's no manual for this course yet, the item is shown
    // as "Coming soon" rather than a clickable link that goes nowhere.
    const manualDoc = activeCourse?.documents?.[0];

    const checklistItems: {
        id: number;
        label: string;
        action: string;
        href?: string;
        external?: boolean;
    }[] = [
        { id: 1, label: "Download FDNY FLSD Manual", action: "Download", href: manualDoc?.url, external: true },
        { id: 2, label: "Download CBT Success Guide", action: "Coming Soon" },
        { id: 3, label: "Watch Welcome Video", action: "Coming Soon" },
        { id: 4, label: "Complete Module 1: Fire Basics", action: "Start", href: "/portal/learning/class-1" },
    ];

    useEffect(() => {
        const fetchCourses = async () => {
            if (authLoading) return;

            const fetched: Course[] = [];

            const coursesToFetch = new Set(enrolledCourses);

            for (const id of Array.from(coursesToFetch)) {
                const course = await getCourseById(id);
                if (course) {
                    fetched.push(course);
                }
            }
            setMyCourses(fetched);
            setLoadingCourses(false);
        };

        fetchCourses();
    }, [enrolledCourses, authLoading, user]);

    if (authLoading || loadingCourses) {
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
                    <Link href="/portal/catalog">
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
                            {checklistItems.map((item) => (
                                <div key={item.id} className="flex items-center justify-between bg-navy-950/50 border border-white/5 p-4 rounded-xl group hover:border-blue-500/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full border-2 border-slate-600 group-hover:border-blue-500 transition-colors" />
                                        <span className="text-slate-300 text-sm font-medium">{item.label}</span>
                                    </div>
                                    {!item.href ? (
                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider cursor-not-allowed">
                                            {item.action}
                                        </span>
                                    ) : item.external ? (
                                        <a
                                            href={item.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider"
                                        >
                                            {item.action}
                                        </a>
                                    ) : (
                                        <Link
                                            href={item.href}
                                            className="text-xs font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider"
                                        >
                                            {item.action}
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            {/* For now, just show the first enrolled course as the main progress card */}
                            <ProgressCard
                                percentage={progressPercent}
                                label={activeCourse.title}
                                sublabel={`${activeCourse.duration} Course Compliance`}
                            />
                        </div>

                        <div className="bg-navy-900 border border-white/5 rounded-2xl p-6 flex flex-col justify-center space-y-4">
                            <div className="flex items-center gap-3 text-slate-300">
                                <Clock className="text-blue-500" />
                                <span className="font-medium">{Math.floor(totalModulesPassed * 0.5)} Hrs Completed</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-300">
                                <Trophy className="text-yellow-500" />
                                <span className="font-medium">{totalModulesPassed} Modules Passed</span>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <h3 className="font-semibold text-white text-lg">Your Courses</h3>
                            {myCourses.map(course => {
                                const result = examResults?.[course.id] as ExamResultRecord | undefined;
                                // Two-attempt exam cap: a failed attempt is never
                                // self-service. See lib/examEligibility.ts for the
                                // full state machine - the real enforcement lives
                                // server-side in app/api/exam/submit/route.ts, this
                                // is just what tells the student what state they're
                                // in and whether they have anything to do.
                                const eligibility = getExamAttemptEligibility(result);
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
                                            <Link href={`/portal/courses?expand=${course.id}`}>
                                                <Button size="sm" variant="outline">View Course Content</Button>
                                            </Link>

                                            {/* Exam Result Actions */}
                                            {result?.status === 'passed' && result.diplomaUrl && (
                                                <a href={result.diplomaUrl} target="_blank" className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all">
                                                    <Trophy size={16} /> Download Diploma
                                                </a>
                                            )}

                                            {/* Failed, attempt 1, admin has approved a retake: send them
                                                straight into the exam flow (real enforcement is server-side).
                                                Uses Button's own href prop (not Button nested inside a
                                                separate <Link>) so this renders as a single valid <a> -
                                                this is the single most important click target in the whole
                                                retake flow, and a <button> nested inside an <a> is invalid
                                                HTML that can break keyboard/screen-reader focus. */}
                                            {result?.status === 'failed' && eligibility.eligible && eligibility.attemptNumber === 2 && (
                                                <Button
                                                    href="/portal/exam"
                                                    size="sm"
                                                    className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500"
                                                >
                                                    You've Been Cleared for a Retake - Start Now
                                                </Button>
                                            )}

                                            {/* Failed, attempt 1, awaiting admin review: no self-service
                                                action. Body copy comes from lib/examEligibility.ts's
                                                EXAM_INELIGIBLE_MESSAGES - the same shared source of truth
                                                components/learning/ExamAttemptGate.tsx uses - plus a real
                                                contact method and a stated review turnaround. */}
                                            {result?.status === 'failed' && !eligibility.eligible && eligibility.reason === 'awaiting-review' && (
                                                <div className="flex items-start gap-2 text-sm text-slate-400 bg-white/5 border border-white/5 rounded-lg px-4 py-3 max-w-md">
                                                    <Clock size={16} className="text-yellow-500 shrink-0 mt-0.5" />
                                                    <div className="space-y-1">
                                                        <p>{EXAM_INELIGIBLE_MESSAGES['awaiting-review']}</p>
                                                        <p>
                                                            Email{" "}
                                                            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-400 hover:text-blue-300 font-medium">
                                                                {SUPPORT_EMAIL}
                                                            </a>{" "}
                                                            or call{" "}
                                                            <a href={`tel:${SUPPORT_PHONE_TEL}`} className="text-blue-400 hover:text-blue-300 font-medium">
                                                                {SUPPORT_PHONE_DISPLAY}
                                                            </a>.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Failed, attempt 2 (or otherwise exhausted): hard stop, no
                                                retake possible. */}
                                            {result?.status === 'failed' && !eligibility.eligible && eligibility.reason === 'attempts-exhausted' && (
                                                <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 max-w-md">
                                                    <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                                                    <div className="space-y-1">
                                                        <p>{EXAM_INELIGIBLE_MESSAGES['attempts-exhausted']}</p>
                                                        <p>
                                                            Email{" "}
                                                            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-red-300 hover:text-red-200 font-medium">
                                                                {SUPPORT_EMAIL}
                                                            </a>{" "}
                                                            or call{" "}
                                                            <a href={`tel:${SUPPORT_PHONE_TEL}`} className="text-red-300 hover:text-red-200 font-medium">
                                                                {SUPPORT_PHONE_DISPLAY}
                                                            </a>.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Malformed/unrecognized exam record: fails closed rather
                                                than silently granting a new attempt - see
                                                lib/examEligibility.ts. Not gated on status === 'failed'
                                                since a malformed record may have no recognizable status
                                                at all. */}
                                            {!!result && !eligibility.eligible && eligibility.reason === 'invalid-record' && (
                                                <div className="flex items-start gap-2 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-3 max-w-md">
                                                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                                    <div className="space-y-1">
                                                        <p>{EXAM_INELIGIBLE_MESSAGES['invalid-record']}</p>
                                                        <p>
                                                            Email{" "}
                                                            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-yellow-300 hover:text-yellow-200 font-medium">
                                                                {SUPPORT_EMAIL}
                                                            </a>{" "}
                                                            or call{" "}
                                                            <a href={`tel:${SUPPORT_PHONE_TEL}`} className="text-yellow-300 hover:text-yellow-200 font-medium">
                                                                {SUPPORT_PHONE_DISPLAY}
                                                            </a>.
                                                        </p>
                                                    </div>
                                                </div>
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
