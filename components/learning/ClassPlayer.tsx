"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Play, CheckCircle, Lock, Menu, ChevronRight, FileText, Video, Clock, BookOpen, BrainCircuit, ArrowLeft } from "lucide-react";
import { Module } from "@/lib/courses";
import { Button } from "@/components/ui/Button";
import { PracticeView } from "./PracticeView";
import { markModuleCompleted } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import { LiveClassPlayer } from "./LiveClassPlayer";

interface ClassPlayerProps {
    session: Module;
    courseId?: string;
}

export function ClassPlayer({ session, courseId }: ClassPlayerProps) {
    const modules = session.subModules || [];
    const router = useRouter();
    const { user, courseProgress } = useAuth();
    const [activeModuleId, setActiveModuleId] = useState<string | number>(modules[0]?.id || "");
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<"learn" | "practice">("learn");
    const [completing, setCompleting] = useState(false);

    const activeModule = modules.find(m => m.id === activeModuleId) || modules[0];

    const handleCompleteModule = async () => {
        if (!user || !courseId) return;

        setCompleting(true);
        try {
            await markModuleCompleted(user.uid, courseId, activeModule.id);
            // In a real app, we'd update the local context/state to show the checkmark immediately
        } catch (error) {
            console.error("Failed to mark complete:", error);
        }
        setCompleting(false);

        const currentIndex = modules.findIndex(m => m.id === activeModuleId);
        if (currentIndex < modules.length - 1) {
            setActiveModuleId(modules[currentIndex + 1].id);
            setActiveTab("learn");
            window.scrollTo(0, 0);
        } else {
            router.push("/portal/courses");
        }
    };

    if (!activeModule) {
        return <div className="p-8 text-white">No modules found for this class.</div>;
    }

    return (
        <div className="flex h-[calc(100vh-64px)] bg-navy-950 overflow-hidden">
            {/* Sidebar Navigation */}
            <motion.div
                initial={false}
                animate={{ width: isSidebarOpen ? 320 : 0, opacity: isSidebarOpen ? 1 : 0 }}
                className="bg-navy-900 border-r border-white/5 flex flex-col h-full"
            >
                <div className="p-6 border-b border-white/5">
                    <Link href={`/portal/courses?expand=${courseId || 'f89-flsd'}`}>
                        <Button variant="ghost" size="sm" className="mb-4 text-slate-400 hover:text-white pl-0 hover:bg-transparent -ml-2">
                            <ArrowLeft size={16} className="mr-2" />
                            Back to Curriculum
                        </Button>
                    </Link>
                    <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-2">
                        {session.title}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock size={14} />
                        <span>{session.duration}</span>
                        <span className="text-slate-600">•</span>
                        <span>{modules.length} Modules</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {modules.map((module) => {
                        const isActive = module.id === activeModuleId;
                        const targetCourseId = courseId || 'f89-flsd';
                        const isCompleted = courseProgress[targetCourseId]?.completedModules?.some(
                            id => String(id) === String(module.id)
                        );

                        return (
                            <button
                                key={module.id}
                                onClick={() => {
                                    setActiveModuleId(module.id);
                                    setActiveTab("learn"); // Reset tab on module change
                                }}
                                className={`w-full text-left p-3 rounded-xl transition-all duration-200 border ${isActive
                                    ? "bg-blue-500/10 border-blue-500/30 shadow-lg shadow-blue-500/5"
                                    : "bg-navy-800/30 border-transparent hover:bg-navy-800 hover:border-white/5"
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`mt-0.5 rounded-full p-1 ${isActive ? "bg-blue-500 text-white" :
                                            isCompleted ? "bg-green-500/20 text-green-500 shadow-[0_0_10px_-3px_rgba(34,197,94,0.4)]" :
                                                "bg-slate-700 text-slate-400"
                                        }`}>
                                        {isActive ? <Play size={10} fill="currentColor" /> :
                                            isCompleted ? <CheckCircle size={10} /> :
                                                <div className="w-2.5 h-2.5 rounded-full" />}
                                    </div>
                                    <div>
                                        <h4 className={`text-sm font-medium mb-1 ${isActive ? "text-blue-100" : "text-slate-300"
                                            }`}>
                                            {module.title}
                                        </h4>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <span>{module.duration}</span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </motion.div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full relative">
                {/* Mobile/Toggle Header */}
                <div className="h-16 border-b border-white/5 flex items-center px-6 justify-between bg-navy-900/50 backdrop-blur-sm">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors"
                    >
                        <Menu size={20} />
                    </button>
                    <div className="text-sm font-medium text-slate-300">
                        Module: <span className="text-white">{activeModule.title}</span>
                    </div>
                    <div className="w-10" /> {/* Spacer for balance */}
                </div>

                {/* Content Container */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <div className="max-w-6xl mx-auto">
                        <motion.div
                            key={activeModule.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Tabs */}
                            <div className="flex gap-4 border-b border-white/5 mb-8">
                                <button
                                    onClick={() => setActiveTab("learn")}
                                    className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 transition-colors relative ${activeTab === "learn" ? "text-blue-400" : "text-slate-400 hover:text-white"
                                        }`}
                                >
                                    <BookOpen size={16} />
                                    Learn Lesson
                                    {activeTab === "learn" && (
                                        <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                                    )}
                                </button>
                                {activeModule.type !== 'live-class' && (
                                    <button
                                        onClick={() => setActiveTab("practice")}
                                        className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 transition-colors relative ${activeTab === "practice" ? "text-blue-400" : "text-slate-400 hover:text-white"
                                            }`}
                                    >
                                        <BrainCircuit size={16} />
                                        Practice & Drills
                                        {activeTab === "practice" && (
                                            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Tab Content */}
                            {activeTab === "practice" ? (
                                <PracticeView items={activeModule.practice || []} />
                            ) : (
                                <>
                                    {/* Video Placeholder / Live Class Gating */}
                                    <div className={`bg-navy-900 rounded-2xl border border-white/10 flex items-center justify-center relative overflow-hidden group mb-8 ${activeModule.type !== 'live-class' ? 'aspect-video' : 'min-h-[500px]'
                                        }`}>
                                        {activeModule.status === 'locked' ? (
                                            <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
                                                <div className="w-16 h-16 bg-navy-800 rounded-full flex items-center justify-center mb-4 border border-white/10">
                                                    <Lock size={32} className="text-slate-400" />
                                                </div>
                                                <h3 className="text-xl font-bold text-white mb-2">Live Session Locked</h3>
                                                <p className="text-slate-400 max-w-sm mb-6">
                                                    This session is currently locked. Please complete the previous modules or wait for the scheduled time.
                                                </p>
                                                {/* <div className="flex items-center gap-2 text-sm text-blue-400 bg-blue-500/10 px-4 py-2 rounded-full font-medium">
                                                    <Clock size={16} />
                                                    Unlocks: Feb 10, 8:45 AM
                                                </div> */}
                                                <button
                                                    onClick={() => alert("This session is currently locked.")}
                                                    className="absolute inset-0 w-full h-full cursor-not-allowed"
                                                    aria-label="Locked Session"
                                                />
                                            </div>
                                        ) : activeModule.type === 'live-class' ? (
                                            <div className="w-full h-full">
                                                <LiveClassPlayer
                                                    sessionId={session.id as string} // This is actually unused in the player logic for *finding* the session, but let's keep it.
                                                    meetLink={activeModule.content?.meetLink}
                                                    courseId={session.id as string} // Pass "class-1" instead of "f89-flsd" to match the DB
                                                    title={activeModule.title || "Live Class Session"}
                                                    description={`Instructor-led training for ${session.title}.`}
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div className="text-center">
                                                    <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center pl-1 mx-auto mb-4 shadow-2xl shadow-blue-500/20 group-hover:scale-110 transition-transform cursor-pointer">
                                                        <Play size={32} className="text-white" fill="currentColor" />
                                                    </div>
                                                    <p className="text-slate-400 text-sm font-medium">Start Video Lesson</p>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Content Info */}
                                    <div className="prose prose-invert max-w-none">
                                        <h1 className="text-3xl font-bold mb-4">{activeModule.title}</h1>

                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold rounded-full">
                                                VIDEO LESSON
                                            </div>
                                            <div className="text-slate-400 text-sm">
                                                Standard Duration: {activeModule.duration}
                                            </div>
                                        </div>

                                        {activeModule.content?.body ? (
                                            <article className="prose prose-invert prose-headings:text-white prose-p:text-slate-300 prose-li:text-slate-300 prose-li:marker:text-blue-500 prose-ul:list-disc prose-ul:pl-5 prose-strong:text-white max-w-none">
                                                <ReactMarkdown>
                                                    {activeModule.content.body}
                                                </ReactMarkdown>
                                            </article>
                                        ) : (
                                            <div className="bg-navy-800/30 border border-white/5 rounded-2xl p-6 mb-8">
                                                <h3 className="text-lg font-semibold text-white mb-3">Module Overview</h3>
                                                <p className="text-slate-300 leading-relaxed">
                                                    {activeModule.content?.description || "Select a module to view its content."}
                                                </p>
                                            </div>
                                        )}

                                        <div className="grid md:grid-cols-2 gap-6 mb-12">
                                            {activeModule.referenceMaterials && activeModule.referenceMaterials.length > 0 && (
                                                <div className="p-4 bg-navy-900 border border-white/5 rounded-xl">
                                                    <h4 className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                                                        <FileText size={16} className="text-blue-500" />
                                                        Reference Materials
                                                    </h4>
                                                    <ul className="text-sm text-slate-400 space-y-1 ml-6 list-disc">
                                                        {activeModule.referenceMaterials.map((item, i) => (
                                                            <li key={i}>{item}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {activeModule.keyObjectives && activeModule.keyObjectives.length > 0 && (
                                                <div className="p-4 bg-navy-900 border border-white/5 rounded-xl">
                                                    <h4 className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                                                        <CheckCircle size={16} className="text-green-500" />
                                                        Key Objectives
                                                    </h4>
                                                    <ul className="text-sm text-slate-400 space-y-1 ml-6 list-disc">
                                                        {activeModule.keyObjectives.map((item, i) => (
                                                            <li key={i}>{item}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Navigation Footer */}
                            <div className="flex items-center justify-between pt-8 border-t border-white/5">
                                <Button
                                    variant="outline"
                                    className="text-slate-300 border-white/10 hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => {
                                        const currentIndex = modules.findIndex(m => m.id === activeModuleId);
                                        if (currentIndex > 0) {
                                            setActiveModuleId(modules[currentIndex - 1].id);
                                            setActiveTab("learn");
                                        }
                                    }}
                                    disabled={modules.findIndex(m => m.id === activeModuleId) === 0}
                                >
                                    Previous Module
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleCompleteModule}
                                    disabled={completing}
                                >
                                    {modules.findIndex(m => m.id === activeModuleId) === modules.length - 1 ? (
                                        <>Finish & Exit <ChevronRight size={16} className="ml-2" /></>
                                    ) : (
                                        <>
                                            {completing ? "Saving..." : "Complete & Continue"}
                                            <ChevronRight size={16} className="ml-2" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
