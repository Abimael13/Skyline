"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { COURSES, Course } from "@/lib/courses";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Calendar, Clock, CheckCircle, ArrowRight, AlertTriangle, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentModal } from "@/components/catalog/PaymentModal";
import { useRouter } from "next/navigation";
import { EligibilityCheck } from "@/components/sections/EligibilityCheck";
import { ClassSession } from "@/lib/db";

// Extend Session for UI
interface SessionWithCapacity extends ClassSession {
    seatsRemaining: number;
}

export default function CourseBookingPage({ params }: { params: Promise<{ courseId: string }> }) {
    // Unwrap params using React.use()
    const { courseId } = use(params);

    const [course, setCourse] = useState<Course | null>(null);
    const [loadingCourse, setLoadingCourse] = useState(true);

    // State
    const [sessions, setSessions] = useState<SessionWithCapacity[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [isLoadingSessions, setIsLoadingSessions] = useState(true);
    const [isEligible, setIsEligible] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [seatsRequested, setSeatsRequested] = useState(1);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();

    // Fetch Course & Sessions
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Course Data
                // Attempt to fetch from API/DB first, fall back to static if needed (though we want DB to be source of truth now)
                // For direct DB access in client comp:
                // const docRef = doc(db, "courses", courseId); ... 
                // However, we can use an API route or just client-side firestore. 
                // Since this uses `courses/[courseId]`, we can fetch course details from a new API or directly from Firestore if configured.
                // Given existing patterns, let's use the DB utility or fetch.
                // Let's assume we want to use the API for courses if it exists, or direct firestore.
                // Checking previous code: `app/admin/courses` uses direct firestore. We can do the same here.

                // Import dynamically to avoid SSR issues if needed, or standard import
                const { doc, getDoc } = await import("firebase/firestore");
                const { db } = await import("@/lib/firebase");

                const docRef = doc(db, "courses", courseId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setCourse(docSnap.data() as Course);
                } else {
                    // Fallback to static if not found in DB (safety net)
                    const staticCourse = COURSES.find(c => c.id === courseId);
                    if (staticCourse) {
                        setCourse(staticCourse);
                    } else {
                        throw new Error("Course not found");
                    }
                }
            } catch (err) {
                console.error("Error fetching course:", err);
                const staticCourse = COURSES.find(c => c.id === courseId);
                setCourse(staticCourse || null);
            } finally {
                setLoadingCourse(false);
            }
        };

        if (courseId) fetchData();
    }, [courseId]);

    // Fetch sessions (dependant on courseId)
    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const res = await fetch(`/api/sessions?courseId=${courseId}`, { cache: 'no-store' });
                if (!res.ok) throw new Error("Failed to load sessions");
                const data: ClassSession[] = await res.json();

                // Sort by date and calculate remaining seats
                const processed = data
                    .map(s => ({
                        ...s,
                        seatsRemaining: Math.max(0, s.globalCapacity - s.enrolledCount)
                    }))
                    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

                setSessions(processed);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoadingSessions(false);
            }
        };

        if (courseId) fetchSessions();
    }, [courseId]);

    if (loadingCourse) {
        return (
            <div className="min-h-screen bg-navy-950 flex items-center justify-center text-white">
                Loading...
            </div>
        );
    }

    if (!course) {
        notFound();
    }

    const selectedSession = sessions.find(s => s.id === selectedSessionId);
    const needsVerification = !!course.eligibilityRequirements && course.eligibilityRequirements.length > 0;

    // Validation
    const isCapacityIssue = selectedSession ? seatsRequested > selectedSession.seatsRemaining : false;
    const canProceed =
        selectedSessionId &&
        !isCapacityIssue &&
        selectedSession?.seatsRemaining! > 0 &&
        (!needsVerification || isEligible);



    const handlePaymentSuccess = async () => {
        try {
            // Confirm registration with backend
            const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId: selectedSessionId,
                    seatsRequested
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Store pending enrollment
            sessionStorage.setItem("pendingEnrollment", JSON.stringify({
                courseId: course.id,
                sessionId: selectedSessionId,
                seats: seatsRequested,
                paid: true
            }));

            router.push("/signup");
        } catch (e: any) {
            console.error("Enrollment error:", e);
            setError(e.message || "Registration failed. Please try again.");
            setShowPayment(false);
        }
    };

    return (
        <div className="min-h-screen bg-navy-950 text-white selection:bg-blue-500/30">
            <Navbar />

            <PaymentModal
                isOpen={showPayment}
                onClose={() => setShowPayment(false)}
                onConfirm={handlePaymentSuccess}
                courseTitle={course.title}
                courseId={course.id}
                price={course.price * seatsRequested}
            />

            <main className="pt-32 pb-20">
                <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-start">

                    {/* Left: Course Details */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-300 text-sm font-medium mb-6">
                            <CheckCircle size={14} />
                            FDNY Accredited
                        </div>

                        {/* Live Virtual Indicator */}
                        {course.format === "Live + Online" && (
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/30 border border-purple-500/30 text-purple-300 text-sm font-medium mb-6 ml-3">
                                <Users size={14} />
                                Live Virtual Zoom Course
                            </div>
                        )}

                        <h1 className="text-4xl md:text-5xl font-bold mb-6">{course.title}</h1>
                        <p className="text-xl text-slate-400 mb-8 leading-relaxed">
                            {course.description}
                        </p>

                        <div className="bg-navy-900 border border-white/5 rounded-2xl p-6 grid grid-cols-2 gap-6 mb-8">
                            <div>
                                <div className="text-slate-500 text-sm mb-1 flex items-center gap-2">
                                    <Clock size={16} /> Duration
                                </div>
                                <div className="font-semibold">{course.duration}</div>
                            </div>
                            <div>
                                <div className="text-slate-500 text-sm mb-1 flex items-center gap-2">
                                    <Calendar size={16} /> Price per Student
                                </div>
                                <div className="font-semibold text-blue-400 text-xl">${course.price}</div>
                            </div>
                            <div className="col-span-2">
                                <div className="text-slate-500 text-sm mb-1">Schedule Format</div>
                                <div className="font-semibold">{course.schedule}</div>
                            </div>
                        </div>

                        {needsVerification && (
                            <EligibilityCheck
                                requirements={course.eligibilityRequirements!}
                                onVerified={setIsEligible}
                            />
                        )}

                        <h3 className="text-lg font-bold mb-4">What you'll learn:</h3>
                        <ul className="space-y-3 mb-8">
                            {[
                                "Fire Safety fundamentals and codes",
                                "Emergency Action Plan (EAP) implementation",
                                "Active Shooter protocols",
                                "Building systems and alarms",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-slate-300">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Right: Date Selection */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-navy-900 border border-white/10 rounded-3xl p-8 sticky top-32 shadow-2xl shadow-black/20"
                    >
                        <h2 className="text-2xl font-bold mb-2">Select a Start Date</h2>
                        <p className="text-slate-400 mb-6">Choose when you want to begin your training.</p>

                        {isLoadingSessions ? (
                            <div className="text-center py-8 text-slate-500">Loading schedules...</div>
                        ) : (
                            <div className="space-y-3 mb-8">
                                {sessions.map((session) => {
                                    const isFull = session.seatsRemaining === 0;
                                    const formattedDate = new Date(session.startDate).toLocaleDateString(undefined, {
                                        month: 'short', day: 'numeric', year: 'numeric'
                                    });

                                    return (
                                        <button
                                            key={session.id}
                                            disabled={isFull}
                                            onClick={() => {
                                                setSelectedSessionId(session.id);
                                                setError(null);
                                            }}
                                            className={`w-full text-left p-4 rounded-xl border transition-all flex justify-between items-center group ${selectedSessionId === session.id
                                                ? "bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/40"
                                                : isFull
                                                    ? "bg-navy-950 border-white/5 opacity-50 cursor-not-allowed"
                                                    : "bg-navy-800 border-white/5 hover:border-blue-500/50 hover:bg-navy-800/80"
                                                }`}
                                        >
                                            <div>
                                                <span className="font-medium block">{formattedDate}</span>
                                                <span className="text-xs opacity-70 block mt-1">{session.daySchedule}</span>
                                            </div>

                                            <div className="text-right">
                                                {isFull ? (
                                                    <span className="inline-flex items-center gap-1 text-red-400 text-sm font-bold">
                                                        <AlertTriangle size={14} /> Class Full
                                                    </span>
                                                ) : (
                                                    <span className={`text-sm font-medium ${selectedSessionId === session.id ? "text-blue-100" : "text-blue-400"}`}>
                                                        {session.seatsRemaining} Seats Left
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}



                        <div className="pt-6 border-t border-white/5">
                            <Button
                                size="lg"
                                className="w-full"
                                disabled={!canProceed}
                                onClick={() => setShowPayment(true)}
                            >
                                {isCapacityIssue ? "Capacity Exceeded" : "Proceed to Payment"} <ArrowRight size={20} className="ml-2" />
                            </Button>
                            <p className="text-center text-xs text-slate-500 mt-4">
                                {!isEligible && needsVerification
                                    ? "Please verify your eligibility to continue."
                                    : "You'll create an account in the next step."}
                            </p>
                        </div>
                    </motion.div>

                </div>
            </main>
            <Footer />
        </div>
    );
}
