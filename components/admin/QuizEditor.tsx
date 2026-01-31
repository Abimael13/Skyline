"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2, CheckCircle2, Circle, ArrowUp, ArrowDown } from "lucide-react";
import { clsx } from "clsx";

interface Question {
    text: string;
    options: string[];
    correctIndex: number;
}

interface QuizEditorProps {
    questions: Question[];
    onChange: (questions: Question[]) => void;
}

export function QuizEditor({ questions = [], onChange }: QuizEditorProps) {
    const handleAddQuestion = () => {
        onChange([
            ...questions,
            { text: "New Question", options: ["Option A", "Option B"], correctIndex: 0 }
        ]);
    };

    const handleUpdateQuestion = (index: number, field: keyof Question, value: any) => {
        const newQuestions = [...questions];
        newQuestions[index] = { ...newQuestions[index], [field]: value };
        onChange(newQuestions);
    };

    const handleUpdateOption = (qIndex: number, oIndex: number, value: string) => {
        const newQuestions = [...questions];
        const newOptions = [...newQuestions[qIndex].options];
        newOptions[oIndex] = value;
        newQuestions[qIndex].options = newOptions;
        onChange(newQuestions);
    };

    const handleAddOption = (qIndex: number) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options.push(`Option ${String.fromCharCode(65 + newQuestions[qIndex].options.length)}`);
        onChange(newQuestions);
    };

    const handleRemoveQuestion = (index: number) => {
        const newQuestions = [...questions];
        newQuestions.splice(index, 1);
        onChange(newQuestions);
    };

    const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
        const newQuestions = [...questions];
        if (direction === 'up' && index > 0) {
            [newQuestions[index], newQuestions[index - 1]] = [newQuestions[index - 1], newQuestions[index]];
        } else if (direction === 'down' && index < questions.length - 1) {
            [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
        }
        onChange(newQuestions);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h4 className="text-white font-medium">Quiz Questions</h4>
                <Button size="sm" onClick={handleAddQuestion} variant="outline">
                    <Plus size={16} className="mr-2" /> Add Question
                </Button>
            </div>

            {questions.map((q, qIndex) => (
                <div key={qIndex} className="bg-navy-950/50 border border-white/10 rounded-xl p-4 space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-center w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 font-bold text-sm shrink-0 flex items-center justify-center">
                            {qIndex + 1}
                        </div>
                        <div className="flex-1">
                            <input
                                type="text"
                                value={q.text}
                                onChange={(e) => handleUpdateQuestion(qIndex, "text", e.target.value)}
                                className="w-full bg-transparent border-b border-white/10 text-white font-medium focus:outline-none focus:border-blue-500 pb-1"
                                placeholder="Enter question text..."
                            />
                        </div>
                        <div className="flex gap-2">
                            <div className="flex flex-col gap-1">
                                <button
                                    onClick={() => handleMoveQuestion(qIndex, 'up')}
                                    disabled={qIndex === 0}
                                    className="text-slate-500 hover:text-white disabled:opacity-30 disabled:hover:text-slate-500"
                                >
                                    <ArrowUp size={14} />
                                </button>
                                <button
                                    onClick={() => handleMoveQuestion(qIndex, 'down')}
                                    disabled={qIndex === questions.length - 1}
                                    className="text-slate-500 hover:text-white disabled:opacity-30 disabled:hover:text-slate-500"
                                >
                                    <ArrowDown size={14} />
                                </button>
                            </div>
                            <button onClick={() => handleRemoveQuestion(qIndex)} className="text-slate-500 hover:text-red-400 self-center">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="ml-12 space-y-2">
                        {q.options.map((opt, oIndex) => (
                            <div key={oIndex} className="flex items-center gap-3">
                                <button
                                    onClick={() => handleUpdateQuestion(qIndex, "correctIndex", oIndex)}
                                    className={clsx(
                                        "shrink-0 hover:text-green-400 transition-colors",
                                        q.correctIndex === oIndex ? "text-green-500" : "text-slate-600"
                                    )}
                                >
                                    {q.correctIndex === oIndex ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                </button>
                                <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => handleUpdateOption(qIndex, oIndex, e.target.value)}
                                    className="flex-1 bg-navy-900/50 rounded-lg px-3 py-1.5 text-sm text-slate-300 border border-transparent focus:border-blue-500/50 focus:outline-none"
                                />
                            </div>
                        ))}
                        <button
                            onClick={() => handleAddOption(qIndex)}
                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-2"
                        >
                            <Plus size={12} /> Add Option
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
