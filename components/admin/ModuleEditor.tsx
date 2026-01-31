"use client";

import { useState } from "react";
import { Module } from "@/lib/courses";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from "lucide-react";
import { QuizEditor } from "./QuizEditor";
import { FlashcardEditor } from "./FlashcardEditor";
import { PracticeManager } from "./PracticeManager";

interface ModuleEditorProps {
    modules: Module[];
    onChange: (modules: Module[]) => void;
}

export function ModuleEditor({ modules, onChange }: ModuleEditorProps) {
    const [expandedModule, setExpandedModule] = useState<number | null>(null);

    const handleAddModule = () => {
        const newModule: Module = {
            id: Date.now(),
            title: "New Module",
            duration: "1h",
            status: "locked",
            type: "text",
            content: { body: "" }
        };
        onChange([...modules, newModule]);
        setExpandedModule(modules.length); // Expand the new module
    };

    const handleRemoveModule = (index: number) => {
        const newModules = [...modules];
        newModules.splice(index, 1);
        onChange(newModules);
    };

    const handleMoveModule = (index: number, direction: 'up' | 'down') => {
        const newModules = [...modules];
        if (direction === 'up' && index > 0) {
            [newModules[index], newModules[index - 1]] = [newModules[index - 1], newModules[index]];
            // If the moved module was expanded, track it.
            if (expandedModule === index) setExpandedModule(index - 1);
            else if (expandedModule === index - 1) setExpandedModule(index);
        } else if (direction === 'down' && index < modules.length - 1) {
            [newModules[index], newModules[index + 1]] = [newModules[index + 1], newModules[index]];
            // If the moved module was expanded, track it.
            if (expandedModule === index) setExpandedModule(index + 1);
            else if (expandedModule === index + 1) setExpandedModule(index);
        }
        onChange(newModules);
    };

    const handleUpdateModule = (index: number, field: keyof Module, value: any) => {
        const newModules = [...modules];
        newModules[index] = { ...newModules[index], [field]: value };

        // Reset content when type changes
        if (field === "type") {
            newModules[index].content = {};
            if (value === "quiz" || value === "exam") newModules[index].content.questions = [];
            if (value === "flashcards") newModules[index].content.cards = [];
            if (value === "text") newModules[index].content.body = "";
            if (value === "video") newModules[index].content.videoUrl = "";
            if (value === "live-class") newModules[index].content.meetLink = "";
        }

        onChange(newModules);
    };

    const handleUpdateContent = (index: number, content: any) => {
        const newModules = [...modules];
        newModules[index] = { ...newModules[index], content: { ...newModules[index].content, ...content } };
        onChange(newModules);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-white">Curriculum Modules</h3>
                <Button onClick={handleAddModule} size="sm" variant="outline">
                    <Plus size={16} className="mr-2" />
                    Add Module
                </Button>
            </div>

            <div className="space-y-3">
                {modules.length === 0 && (
                    <div className="p-8 border-2 border-dashed border-white/10 rounded-xl text-center text-slate-500">
                        No modules defined. Click "Add Module" to start.
                    </div>
                )}

                {modules.map((module, index) => {
                    const isExpanded = expandedModule === index;

                    return (
                        <div key={module.id} className="bg-navy-800/50 border border-white/5 rounded-xl transition-all">
                            {/* Module Header / Summary */}
                            <div className="p-4 flex gap-4 items-center">
                                <div className="text-slate-600 cursor-move">
                                    <GripVertical size={20} />
                                </div>
                                <div className="flex-1 grid md:grid-cols-4 gap-4 items-center">
                                    <div className="md:col-span-2">
                                        <input
                                            type="text"
                                            value={module.title}
                                            onChange={(e) => handleUpdateModule(index, "title", e.target.value)}
                                            className="w-full bg-transparent border-b border-transparent hover:border-white/10 focus:border-blue-500 text-white font-medium focus:outline-none px-2 py-1"
                                            placeholder="Module Title"
                                        />
                                    </div>
                                    <select
                                        value={module.type || "text"}
                                        onChange={(e) => handleUpdateModule(index, "type", e.target.value)}
                                        className="bg-navy-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
                                    >
                                        <option value="text">Text / Article</option>
                                        <option value="video">Video Lesson</option>
                                        <option value="quiz">Quiz / Exam</option>
                                        <option value="flashcards">Flashcards</option>
                                        <option value="live-class">Live Zoom Class</option>
                                        <option value="exam">Graduation Exam (Secure)</option>
                                        <option value="class-session">Class Session (Container)</option>
                                    </select>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-slate-500">{module.duration}</span>
                                        <div className="flex gap-2">
                                            <div className="flex flex-col gap-0.5 justify-center mr-2">
                                                <button
                                                    onClick={() => handleMoveModule(index, 'up')}
                                                    disabled={index === 0}
                                                    className="text-slate-500 hover:text-white disabled:opacity-30 disabled:hover:text-slate-500"
                                                >
                                                    <ArrowUp size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleMoveModule(index, 'down')}
                                                    disabled={index === modules.length - 1}
                                                    className="text-slate-500 hover:text-white disabled:opacity-30 disabled:hover:text-slate-500"
                                                >
                                                    <ArrowDown size={14} />
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => setExpandedModule(isExpanded ? null : index)}
                                                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
                                            >
                                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                            </button>
                                            <button
                                                onClick={() => handleRemoveModule(index)}
                                                className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-white/5"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Practice & Drills Section (Available for all types except containers if preferred, but allowing all for flexibility) */}
                            {isExpanded && module.type !== "class-session" && (
                                <div className="px-4 pb-4 border-t border-white/5 mt-4 pt-4">
                                    <PracticeManager
                                        items={module.practice || []}
                                        onChange={(newPractice) => handleUpdateModule(index, "practice", newPractice)}
                                    />
                                </div>
                            )}

                            {/* Expanded Content Editor */}
                            {isExpanded && (
                                <div className="px-4 pb-4 pt-0 border-t border-white/5 mt-2">
                                    <div className="pt-4 space-y-4">
                                        {/* Common Metadata */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-slate-500 uppercase font-semibold mb-1 block">Duration</label>
                                                <input
                                                    type="text"
                                                    value={module.duration}
                                                    onChange={(e) => handleUpdateModule(index, "duration", e.target.value)}
                                                    className="w-full bg-navy-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 uppercase font-semibold mb-1 block">Status</label>
                                                <select
                                                    value={module.status}
                                                    onChange={(e) => handleUpdateModule(index, "status", e.target.value)}
                                                    className="w-full bg-navy-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                                >
                                                    <option value="locked">Locked</option>
                                                    <option value="current">Current</option>
                                                    <option value="completed">Completed</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Module Description (Overview) */}
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase font-semibold mb-1 block">Module Overview (Description)</label>
                                            <textarea
                                                value={module.content?.description || ""}
                                                onChange={(e) => handleUpdateContent(index, { description: e.target.value })}
                                                rows={2}
                                                className="w-full bg-navy-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 resize-none"
                                                placeholder="Brief summary of this module..."
                                            />
                                        </div>

                                        {/* Type-Specific Content Editor */}
                                        <div className="bg-navy-950/30 rounded-xl p-4 border border-white/5">
                                            {(module.type === 'quiz' || module.type === 'exam') && (
                                                <QuizEditor
                                                    questions={module.content?.questions || []}
                                                    onChange={(q) => handleUpdateContent(index, { questions: q })}
                                                />
                                            )}
                                            {module.type === 'flashcards' && (
                                                <FlashcardEditor
                                                    cards={module.content?.cards || []}
                                                    onChange={(c) => handleUpdateContent(index, { cards: c })}
                                                />
                                            )}
                                            {module.type === 'video' && (
                                                <div>
                                                    <label className="text-xs text-slate-500 uppercase font-semibold mb-1 block">Video URL</label>
                                                    <input
                                                        type="text"
                                                        value={module.content?.videoUrl || ""}
                                                        onChange={(e) => handleUpdateContent(index, { videoUrl: e.target.value })}
                                                        placeholder="https://vimeo.com/..."
                                                        className="w-full bg-navy-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                                    />
                                                </div>
                                            )}
                                            {module.type === 'live-class' && (
                                                <div>
                                                    <label className="text-xs text-slate-500 uppercase font-semibold mb-1 block">Zoom Meeting Link</label>
                                                    <input
                                                        type="text"
                                                        value={module.content?.meetLink || ""}
                                                        onChange={(e) => handleUpdateContent(index, { meetLink: e.target.value })}
                                                        placeholder="https://zoom.us/j/..."
                                                        className="w-full bg-navy-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                                    />
                                                    <p className="text-xs text-slate-500 mt-2">
                                                        Leave empty to use the course default Zoom link.
                                                    </p>
                                                </div>
                                            )}
                                            {module.type === 'class-session' && (
                                                <div className="space-y-4">
                                                    <div className="p-4 bg-navy-900 border border-blue-500/20 rounded-xl">
                                                        <h4 className="text-sm font-semibold text-blue-400 mb-4">Class Curriculum Structure</h4>
                                                        <p className="text-xs text-slate-400 mb-4">
                                                            Define the topics and modules that are part of this 4-hour class session.
                                                        </p>
                                                        {/* Recursive Module Editor for SubModules */}
                                                        <ModuleEditor
                                                            modules={module.subModules || []}
                                                            onChange={(newSubModules) => handleUpdateModule(index, "subModules", newSubModules)}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            {(module.type === 'text' || !module.type) && (
                                                <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <label className="text-xs text-slate-500 uppercase font-semibold block">Markdown Content</label>
                                                        <a
                                                            href="https://www.markdownguide.org/cheat-sheet/"
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-[10px] text-blue-400 hover:text-blue-300"
                                                        >
                                                            Markdown Supported
                                                        </a>
                                                    </div>
                                                    <textarea
                                                        value={module.content?.body || ""}
                                                        onChange={(e) => handleUpdateContent(index, { body: e.target.value })}
                                                        rows={12}
                                                        className="w-full bg-navy-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                                                        placeholder="# Heading 1&#10;## Heading 2&#10;* Bullet point"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
