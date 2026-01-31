import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, RefreshCw, ChevronLeft, ChevronRight, HelpCircle, Trophy, Flame, Star, Award } from "lucide-react";
import { PracticeItem } from "@/lib/courses";
import { Button } from "@/components/ui/Button";

interface PracticeViewProps {
    items: PracticeItem[];
}

export function PracticeView({ items }: PracticeViewProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
    const [filter, setFilter] = useState<"all" | "quiz" | "flashcard" | "scenario">("all");

    // --- GAMIFICATION STATE ---
    const [xp, setXp] = useState(0);
    const [streak, setStreak] = useState(0);
    const [showLevelUp, setShowLevelUp] = useState<string | null>(null);
    const [xpGained, setXpGained] = useState(0); // For animation

    // Ranks
    const RANKS = [
        { threshold: 0, title: "Probationary", color: "text-slate-400" },
        { threshold: 200, title: "Fire Guard", color: "text-blue-400" },
        { threshold: 500, title: "Deputy Warden", color: "text-purple-400" },
        { threshold: 1000, title: "Fire Safety Director", color: "text-yellow-400" },
        { threshold: 2500, title: "Chief", color: "text-red-500" },
    ];

    const currentRank = RANKS.slice().reverse().find(r => xp >= r.threshold) || RANKS[0];
    const nextRank = RANKS.find(r => r.threshold > xp);
    const progressToNext = nextRank ? ((xp - currentRank.threshold) / (nextRank.threshold - currentRank.threshold)) * 100 : 100;

    const awardXp = (amount: number) => {
        const streakBonus = streak >= 2 ? 10 : 0;
        const totalAward = amount + streakBonus;
        const newXp = xp + totalAward;

        setXp(newXp);
        setXpGained(totalAward);

        // Check for Rank Up
        const newRank = RANKS.slice().reverse().find(r => newXp >= r.threshold);
        if (newRank && newRank.title !== currentRank.title) {
            setShowLevelUp(newRank.title);
            setTimeout(() => setShowLevelUp(null), 3000);
        }

        // Streak logic
        setStreak(prev => prev + 1);
    };

    const handleIncorrect = () => {
        setStreak(0);
    };

    // Filter items based on selected mode
    const filteredItems = items.filter(item => filter === "all" || item.type === filter);
    const currentItem = filteredItems[currentIndex];

    const handleNext = () => {
        if (currentIndex < filteredItems.length - 1) {
            setCurrentIndex(currentIndex + 1);
            resetState();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            resetState();
        }
    };

    const resetState = () => {
        setShowAnswer(false);
        setFeedback(null);
    };

    const handleQuizOption = (index: number) => {
        if (feedback) return; // Prevent multiple clicks
        const isCorrect = index === currentItem.correctIndex;
        setFeedback(isCorrect ? "correct" : "incorrect");
        if (isCorrect) {
            awardXp(20);
        } else {
            handleIncorrect();
        }
    };

    if (filteredItems.length === 0) {
        return (
            <div className="text-center py-20 text-slate-400">
                <p>No practice items found for this category.</p>
                <Button onClick={() => setFilter("all")} variant="outline" className="mt-4">
                    View All Items
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            {/* Gamification Header */}
            <div className="bg-navy-900/50 border border-white/10 rounded-2xl p-4 mb-8 flex items-center justify-between relative overflow-hidden">
                <div className="flex items-center gap-4 z-10">
                    <div className="w-12 h-12 rounded-full bg-navy-800 border border-white/10 flex items-center justify-center">
                        <Trophy size={20} className={currentRank.color} />
                    </div>
                    <div>
                        <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Current Rank</div>
                        <div className={`font-bold ${currentRank.color}`}>{currentRank.title}</div>
                    </div>
                </div>

                <div className="flex flex-col items-center z-10">
                    <div className="text-2xl font-black text-white flex items-center gap-2">
                        {xp} XP
                        <AnimatePresence>
                            {xpGained > 0 && (
                                <motion.span
                                    initial={{ y: 0, opacity: 1 }}
                                    animate={{ y: -20, opacity: 0 }}
                                    exit={{ opacity: 0 }}
                                    key={xp}
                                    className="text-sm text-green-400 absolute ml-20"
                                >
                                    +{xpGained}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                    <div className="w-32 h-1.5 bg-navy-800 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${progressToNext}%` }} />
                    </div>
                </div>

                <div className="flex items-center gap-4 z-10">
                    <div className="text-right">
                        <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Streak</div>
                        <div className={`font-bold flex items-center justify-end gap-1 ${streak > 2 ? 'text-orange-500' : 'text-white'}`}>
                            {streak} <Flame size={16} fill={streak > 2 ? "currentColor" : "none"} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Level Up Overlay */}
            <AnimatePresence>
                {showLevelUp && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                    >
                        <div className="bg-navy-900/90 backdrop-blur-xl border border-yellow-500/50 p-8 rounded-3xl text-center shadow-2xl shadow-yellow-500/20 transform">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 0.5 }}
                                className="mx-auto w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4"
                            >
                                <Award size={40} className="text-yellow-400" />
                            </motion.div>
                            <h2 className="text-3xl font-black text-white mb-2">PROMOTED!</h2>
                            <p className="text-slate-300">You are now a</p>
                            <div className={`text-2xl font-bold ${currentRank.color} mt-2`}>{showLevelUp}</div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Filter Tabs */}
            <div className="flex justify-center gap-2 mb-8">
                {(["all", "quiz", "flashcard", "scenario"] as const).map((type) => (
                    <button
                        key={type}
                        onClick={() => { setFilter(type); setCurrentIndex(0); resetState(); }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === type
                            ? "bg-blue-600 text-white"
                            : "bg-navy-800 text-slate-400 hover:bg-navy-700"
                            }`}
                    >
                        {type.charAt(0).toUpperCase() + type.slice(1)}s
                    </button>
                ))}
            </div>

            {/* Progress Bar */}
            <div className="mb-6 flex items-center justify-between text-xs text-slate-400">
                <span>Item {currentIndex + 1} of {filteredItems.length}</span>
                <div className="w-1/2 h-1 bg-navy-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${((currentIndex + 1) / filteredItems.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Card Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentItem.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="bg-navy-900 border border-white/5 rounded-2xl p-8 min-h-[400px] flex flex-col"
                >
                    <div className="flex items-center gap-2 mb-6 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                        <span className="bg-blue-400/10 px-2 py-1 rounded">{currentItem.type}</span>
                    </div>

                    <h3 className="text-xl font-semibold text-white mb-6 leading-relaxed">
                        {currentItem.question}
                    </h3>

                    {/* Scenario Context */}
                    {currentItem.type === "scenario" && currentItem.scenarioContext && (
                        <div className="bg-navy-950 p-4 rounded-xl border-l-4 border-yellow-500 mb-6 text-slate-300 italic">
                            "{currentItem.scenarioContext}"
                        </div>
                    )}

                    {/* Quiz Interaction */}
                    {currentItem.type === "quiz" && currentItem.options && (
                        <div className="space-y-3 flex-1">
                            {currentItem.options.map((option, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleQuizOption(idx)}
                                    disabled={feedback !== null}
                                    className={`w-full text-left p-4 rounded-xl border transition-all ${feedback === null
                                        ? "bg-navy-800 border-white/5 hover:border-blue-500"
                                        : idx === currentItem.correctIndex
                                            ? "bg-green-500/10 border-green-500 text-white"
                                            : feedback === "incorrect" && "bg-navy-800 border-white/5 opacity-50"
                                        }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span>{option}</span>
                                        {feedback && idx === currentItem.correctIndex && <CheckCircle className="text-green-500" size={18} />}
                                    </div>
                                </button>
                            ))}
                            {feedback === "incorrect" && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm flex items-center gap-2 mt-4">
                                    <XCircle size={16} />
                                    Incorrect. View the explanation below.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Flashcard Interaction */}
                    {currentItem.type === "flashcard" && (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            {!showAnswer ? (
                                <Button onClick={() => { setShowAnswer(true); awardXp(5); }} variant="outline" className="h-32 w-full text-lg">
                                    Reveal Answer
                                </Button>
                            ) : (
                                <div className="w-full bg-blue-500/10 border border-blue-500/20 p-6 rounded-xl text-center">
                                    <p className="text-lg text-white font-medium">{currentItem.answer}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Scenario Interaction */}
                    {currentItem.type === "scenario" && (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            {!showAnswer ? (
                                <Button onClick={() => { setShowAnswer(true); awardXp(50); }} className="bg-blue-600 hover:bg-blue-500">
                                    Show Recommended Action
                                </Button>
                            ) : (
                                <div className="w-full bg-green-500/10 border border-green-500/20 p-6 rounded-xl">
                                    <h4 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
                                        <CheckCircle size={16} /> Correct Action
                                    </h4>
                                    <p className="text-slate-300">{currentItem.correctAction}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Explanation (for Quiz/Scenario) */}
                    {(feedback || (showAnswer && currentItem.type !== "flashcard")) && currentItem.explanation && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-6 pt-6 border-t border-white/5"
                        >
                            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Explanation</h4>
                            <p className="text-slate-300 text-sm leading-relaxed">{currentItem.explanation}</p>
                        </motion.div>
                    )}

                </motion.div>
            </AnimatePresence>

            {/* Navigation Controls */}
            <div className="flex justify-between items-center mt-6">
                <Button
                    variant="ghost"
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="text-slate-400 hover:text-white"
                >
                    <ChevronLeft className="mr-2" size={16} /> Previous
                </Button>

                <Button onClick={handleNext} disabled={currentIndex === filteredItems.length - 1}>
                    Next Item <ChevronRight className="ml-2" size={16} />
                </Button>
            </div>
        </div>
    );
}
