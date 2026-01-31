"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, XCircle } from "lucide-react";
import { clsx } from "clsx";

interface Question {
    text: string;
    options: string[];
    correctIndex: number;
}

export function QuizPlayer({ questions = [] }: { questions?: Question[] }) {
    const [selectedAnswers, setSelectedAnswers] = useState<number[]>(new Array(questions.length).fill(-1));
    const [submitted, setSubmitted] = useState(false);

    const handleSelect = (idx: number, optionIdx: number) => {
        if (submitted) return;
        const newAnswers = [...selectedAnswers];
        newAnswers[idx] = optionIdx;
        setSelectedAnswers(newAnswers);
    };

    const handleSubmit = () => {
        setSubmitted(true);
    };

    const handleRetake = () => {
        setSelectedAnswers(new Array(questions.length).fill(-1));
        setSubmitted(false);
    };

    const score = selectedAnswers.reduce((acc, curr, idx) => {
        return acc + (curr === questions[idx].correctIndex ? 1 : 0);
    }, 0);

    if (questions.length === 0) return <div className="text-slate-400">No questions available.</div>;

    return (
        <div className="space-y-8 max-w-2xl">
            {questions.map((q, idx) => (
                <div key={idx} className="bg-navy-900/50 border border-white/5 rounded-xl p-6">
                    <h4 className="text-lg font-medium text-white mb-4">
                        <span className="text-slate-500 mr-2">{idx + 1}.</span>
                        {q.text}
                    </h4>
                    <div className="space-y-3">
                        {q.options.map((opt, optIdx) => {
                            const isSelected = selectedAnswers[idx] === optIdx;
                            const isCorrect = q.correctIndex === optIdx;

                            let styles = "border-white/10 hover:bg-white/5";
                            if (isSelected) styles = "border-blue-500 bg-blue-500/10 text-blue-100";

                            if (submitted) {
                                if (isCorrect) styles = "border-green-500 bg-green-500/10 text-green-100";
                                else if (isSelected && !isCorrect) styles = "border-red-500 bg-red-500/10 text-red-100";
                                else if (!isSelected) styles = "border-white/5 opacity-50";
                            }

                            return (
                                <button
                                    key={optIdx}
                                    onClick={() => handleSelect(idx, optIdx)}
                                    disabled={submitted}
                                    className={clsx(
                                        "w-full text-left p-4 rounded-xl border transition-all flex justify-between items-center group",
                                        styles
                                    )}
                                >
                                    <span>{opt}</span>
                                    {submitted && isCorrect && <CheckCircle2 className="text-green-500" size={20} />}
                                    {submitted && isSelected && !isCorrect && <XCircle className="text-red-500" size={20} />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            <div className="flex items-center justify-between pt-6 border-t border-white/10">
                {submitted ? (
                    <div className="flex items-center gap-6 w-full">
                        <div>
                            <p className="text-sm text-slate-400">Your Score</p>
                            <p className="text-2xl font-bold text-white">
                                {score} / {questions.length} <span className="text-sm font-normal text-slate-500">({Math.round((score / questions.length) * 100)}%)</span>
                            </p>
                        </div>
                        <div className="flex-1 flex justify-end">
                            <Button onClick={handleRetake} variant="outline">Retake Quiz</Button>
                        </div>
                    </div>
                ) : (
                    <Button onClick={handleSubmit} disabled={selectedAnswers.includes(-1)} className="w-full md:w-auto">
                        Submit Answers
                    </Button>
                )}
            </div>
        </div>
    );
}
