"use client";

import { use, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Course, Module } from "@/lib/courses";
import { Button } from "@/components/ui/Button";
import { Loader2, ArrowLeft, BookOpen, Video, BrainCircuit, GraduationCap, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";

// Player Components
import { QuizPlayer } from "@/components/learning/QuizPlayer";
import { FlashcardPlayer } from "@/components/learning/FlashcardPlayer";
import { LiveClassPlayer } from "@/components/learning/LiveClassPlayer";
import { SecureExamPlayer } from "@/components/learning/SecureExamPlayer";

// Type props for Next.js App Router
type Params = Promise<{ courseId: string; moduleId: string }>;

export default function LearningPage(props: { params: Params }) {
    const params = use(props.params);
    const { courseId, moduleId } = params;
    const router = useRouter();

    const [course, setCourse] = useState<Course | null>(null);
    const [currentModule, setCurrentModule] = useState<Module | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // In a real app we'd fetch from Firestore
                // For this demo, we can import local mock data if needed, or assume Firestore has it
                // But the project seems to use a hybrid approach. 
                // Let's assume the local mock data in `lib/courses.ts` is the source of truth for now 
                // OR that we fetch from Firestore (as the original code did).
                // However, the original code had: import { db } from "@/lib/firebase";
                // I will keep the fetch logic as it was, assuming it works or falls back.

                const docRef = doc(db, "courses", courseId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const courseData = docSnap.data() as Course;
                    setCourse(courseData);

                    // Find module by ID (convert both to strings for safe comparison)
                    let foundModule = courseData.modules?.find(m => String(m.id) === String(moduleId));

                    // Fallback: If not in Firestore, check local mock data (for dev/test modules like 'final-exam-secure')
                    if (!foundModule) {
                        const { COURSES } = await import("@/lib/courses");
                        const localCourse = COURSES.find(c => c.id === courseId);
                        if (localCourse) {
                            foundModule = localCourse.modules.find(m => String(m.id) === String(moduleId));
                            // If found locally, we might want to ensure 'course' state also has it in the list updates, 
                            // but for the player, just setting currentModule is enough.
                        }
                    }

                    if (foundModule) {
                        setCurrentModule(foundModule);
                    }
                } else {
                    // Fallback to local data if firestore not populated (common in dev)
                    const { COURSES } = await import("@/lib/courses");
                    const foundCourse = COURSES.find(c => c.id === courseId);
                    if (foundCourse) {
                        setCourse(foundCourse);
                        const foundModule = foundCourse.modules.find(m => String(m.id) === String(moduleId));
                        if (foundModule) setCurrentModule(foundModule);
                    }
                }
            } catch (error) {
                console.error("Error fetching learning data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [courseId, moduleId]);

    // Some modules are just pointers to a dedicated, purpose-built route
    // (e.g. exam-type modules that must be served by the secure, server-graded
    // exam flow rather than rendered inline here). Respect that regardless of
    // how the student navigated to this URL, including direct/typed navigation.
    useEffect(() => {
        if (currentModule?.type === "exam" && currentModule.route) {
            router.replace(currentModule.route);
        }
    }, [currentModule, router]);

    if (currentModule?.type === "exam" && currentModule.route) {
        return (
            <div className="flex justify-center py-20 min-h-screen bg-navy-950 items-center">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center py-20 min-h-screen bg-navy-950 items-center">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    if (!course || !currentModule) {
        return (
            <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-8 text-center">
                <h1 className="text-2xl font-bold text-white mb-4">Module Not Found</h1>
                <Link href="/portal/courses">
                    <Button variant="outline">Return to My Courses</Button>
                </Link>
            </div>
        );
    }

    const ModuleIcon = {
        video: Video,
        quiz: GraduationCap,
        flashcards: BrainCircuit,
        text: BookOpen,
        "live-class": Video,
        exam: ShieldCheck,
        "class-session": BookOpen
    }[currentModule.type || "text"] || BookOpen;

    return (
        <div className="min-h-screen bg-navy-950 flex flex-col">
            {/* Top Bar */}
            <header className="border-b border-white/5 bg-navy-900/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/portal/courses">
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                                <ArrowLeft size={20} className="mr-2" /> Exit
                            </Button>
                        </Link>
                        <div className="h-6 w-px bg-white/10 mx-2" />
                        <div>
                            <h2 className="text-sm text-slate-400">{course.title}</h2>
                            <h1 className="font-bold text-white flex items-center gap-2">
                                <ModuleIcon size={18} className="text-blue-400" />
                                {currentModule.title}
                            </h1>
                        </div>
                    </div>
                    {/* Future: Progress / Mark Complete Button */}
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 max-w-4xl mx-auto w-full p-8 lg:p-12">
                {currentModule.type === 'quiz' && (
                    <QuizPlayer questions={currentModule.content?.questions} />
                )}

                {currentModule.type === 'flashcards' && (
                    <FlashcardPlayer cards={currentModule.content?.cards} />
                )}

                {currentModule.type === 'live-class' && (
                    <div className="h-[600px]">
                        <LiveClassPlayer
                            sessionId={courseId}
                            meetLink={currentModule.content?.meetLink || course.zoomLink}
                        />
                    </div>
                )}

                {currentModule.type === 'exam' && (
                    <SecureExamPlayer
                        module={currentModule}
                        onComplete={async (score, complianceLogs) => {
                            console.log("Exam Complete", score, complianceLogs);

                            // Save the submission so staff can review/grade it.
                            //
                            // NOTE ON SCOPE: this component computes `score`
                            // entirely in the browser, so it can never be
                            // trusted as a final, official grade - a client
                            // can report any score it likes. That's a known,
                            // pre-existing issue with this exam flow (shared
                            // with components/learning/ExamPortal.tsx) that
                            // is planned to be addressed separately as part
                            // of broader exam-integrity work (server-side
                            // verification of answers, not just the score).
                            //
                            // For now we write to the SAME collection/shape
                            // already used by ExamPortal.tsx and already
                            // covered by firestore.rules
                            // (users/{uid}/examSubmissions/{examId} - owner
                            // may create their own, only an admin may
                            // update/grade it). The previous code wrote to a
                            // different, uncovered path
                            // (users/{uid}/exam_results, auto-ID) that the
                            // rules never granted access to, so every write
                            // silently failed and the result was lost. We
                            // record the client-reported score/status here
                            // for visibility only - the authoritative pass/
                            // fail record students and admins actually see
                            // (app/portal/dashboard, app/admin/students/**)
                            // is the `examResults` map on the user doc,
                            // which is only ever set by the admin-only
                            // /api/admin/grade-exam route.
                            if (auth.currentUser) {
                                try {
                                    const passed = score >= 70;
                                    // Doc ID is the courseId (not moduleId) to match the existing
                                    // convention used by ExamPortal.tsx and the admin student
                                    // detail page, which both key this subcollection by course id
                                    // (e.g. "f89-flsd") so admins can actually find the submission.
                                    await setDoc(doc(db, "users", auth.currentUser.uid, "examSubmissions", courseId), {
                                        courseId: courseId,
                                        moduleId: moduleId,
                                        moduleTitle: currentModule.title,
                                        submittedAt: new Date().toISOString(),
                                        status: "submitted",
                                        // Client-reported only - not an official grade until an
                                        // admin reviews it via the grading tool.
                                        clientReportedScore: score,
                                        clientReportedPassed: passed,
                                        complianceLogs: complianceLogs || []
                                    });
                                    console.log("Exam submission saved to Firestore");
                                } catch (e) {
                                    console.error("Failed to save exam submission", e);
                                }
                            } else {
                                console.warn("Cannot save result: No user logged in");
                            }
                        }}
                    />
                )}

                {currentModule.type === 'video' && currentModule.content?.videoUrl && (
                    <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                        {/* Placeholder for actual video player */}
                        <iframe
                            src={currentModule.content.videoUrl.replace("watch?v=", "embed/")}
                            className="w-full h-full"
                            allowFullScreen
                        />
                    </div>
                )}

                {(currentModule.type === 'text' || !currentModule.type) && (
                    <div className="prose prose-invert prose-lg max-w-none">
                        {currentModule.content?.body ? (
                            <div className="whitespace-pre-wrap">{currentModule.content.body}</div>
                        ) : (
                            <p className="text-slate-500 italic">This module has no text content yet.</p>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
