"use client";

import { use, useEffect, useState } from "react";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Course, Module } from "@/lib/courses";
import { Button } from "@/components/ui/Button";
import { Loader2, ArrowLeft, BookOpen, Video, BrainCircuit, GraduationCap, ShieldCheck } from "lucide-react";
import Link from "next/link";
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

                            // Save Result to Database
                            if (auth.currentUser) {
                                try {
                                    const passed = score >= 70;
                                    await addDoc(collection(db, "users", auth.currentUser.uid, "exam_results"), {
                                        courseId: courseId,
                                        moduleId: moduleId,
                                        moduleTitle: currentModule.title,
                                        score: score,
                                        passed: passed,
                                        timestamp: new Date().toISOString(),
                                        complianceLogs: complianceLogs || []
                                    });
                                    console.log("Exam result saved to Firestore");
                                } catch (e) {
                                    console.error("Failed to save exam result", e);
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
