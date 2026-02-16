import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Circle, Lock, ChevronDown, ChevronUp, PlayCircle } from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { Module } from "@/lib/courses";
import { useAuth } from "@/lib/AuthContext";

interface CourseModuleListProps {
    courseId?: string; // Add courseId prop
    collapsible?: boolean;
    modules: Module[];
    defaultOpen?: boolean;
}

export function CourseModuleList({ collapsible = false, modules, courseId, defaultOpen }: CourseModuleListProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen !== undefined ? defaultOpen : !collapsible);
    const { courseProgress } = useAuth();
    const completedIds = courseId ? (courseProgress[courseId]?.completedModules || []) : [];

    if (!modules || modules.length === 0) {
        return (
            <div className="bg-navy-900 border border-white/5 rounded-2xl p-6 text-center text-slate-500">
                No modules available.
            </div>
        );
    }

    return (
        <div className="bg-navy-900 border border-white/5 rounded-2xl p-6 transition-all hover:border-blue-500/10">
            <button
                onClick={() => collapsible && setIsOpen(!isOpen)}
                className={clsx(
                    "w-full flex items-center justify-between group",
                    collapsible ? "cursor-pointer" : "cursor-default"
                )}
            >
                <h3 className="text-lg font-semibold text-white">Course Curriculum</h3>
                {collapsible && (
                    <div className={clsx(
                        "p-2 rounded-lg bg-white/5 text-slate-400 group-hover:text-white group-hover:bg-white/10 transition-colors",
                    )}>
                        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: "auto", opacity: 1, marginTop: 24 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-4">
                            {modules.map((module, index) => {
                                const isCompleted = completedIds.some(id => String(id) === String(module.id));
                                const previousCompleted = index === 0 || completedIds.some(id => String(id) === String(modules[index - 1].id));
                                const isCurrent = !isCompleted && previousCompleted;
                                const isLocked = (!isCompleted && !isCurrent) && module.status !== 'current';

                                const Content = (
                                    <div
                                        key={module.id}
                                        className={clsx(
                                            "flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer group",
                                            isCurrent
                                                ? "bg-blue-900/10 border-blue-500/30 shadow-lg shadow-blue-900/5 hover:bg-blue-900/20"
                                                : isLocked
                                                    ? "bg-transparent border-white/5 opacity-50 cursor-not-allowed"
                                                    : "bg-transparent border-white/5 hover:border-white/10 hover:bg-white/5"
                                        )}
                                    >
                                        <div className="flex-shrink-0">
                                            {isCompleted ? (
                                                <div className="bg-green-500/10 p-1 rounded-full text-green-500">
                                                    <CheckCircle2 size={20} />
                                                </div>
                                            ) : isCurrent ? (
                                                <div className="bg-blue-500/10 p-1 rounded-full text-blue-500">
                                                    <PlayCircle size={20} />
                                                </div>
                                            ) : (
                                                <Lock className="text-slate-600" size={24} />
                                            )}
                                        </div>

                                        <div className="flex-grow">
                                            <h4 className={clsx("font-medium group-hover:text-blue-400 transition-colors", isCurrent ? "text-white" : "text-slate-300")}>
                                                {module.title}
                                            </h4>
                                            <p className="text-xs text-slate-500 flex gap-2">
                                                <span>{module.duration}</span>
                                                {module.type && <span className="uppercase text-[10px] bg-white/5 px-1.5 rounded">{module.type}</span>}
                                            </p>
                                        </div>

                                        {!isLocked && (
                                            <div className={clsx(
                                                "px-4 py-1.5 rounded-full text-xs font-medium transition-colors",
                                                isCompleted
                                                    ? "bg-green-500/10 text-green-400 group-hover:bg-green-500 group-hover:text-white"
                                                    : "bg-blue-600/10 text-blue-400 group-hover:bg-blue-600 group-hover:text-white"
                                            )}>
                                                {isCompleted ? "Review" : "Start"}
                                            </div>
                                        )}
                                    </div>
                                );

                                if (isLocked || !courseId) return Content;

                                const href = module.route || `/portal/learn/${courseId}/${module.id}`;

                                return (
                                    <Link key={module.id} href={href}>
                                        {Content}
                                    </Link>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
