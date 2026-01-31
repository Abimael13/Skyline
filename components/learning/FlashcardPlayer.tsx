"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, ArrowRight, RotateCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from 'clsx'; // Assuming clsx is available

interface Card {
    front: string;
    back: string;
}

export function FlashcardPlayer({ cards = [] }: { cards?: Card[] }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    if (cards.length === 0) return <div className="text-slate-400">No flashcards available.</div>;

    const handleNext = () => {
        setIsFlipped(false);
        setTimeout(() => setCurrentIndex((prev) => (prev + 1) % cards.length), 200);
    };

    const handlePrev = () => {
        setIsFlipped(false);
        setTimeout(() => setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length), 200);
    };

    return (
        <div className="max-w-xl mx-auto space-y-8">
            <div className="perspective-1000 h-[300px] w-full cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
                <motion.div
                    className="relative w-full h-full text-center transition-transform duration-500 transform-style-3d"
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                    style={{ transformStyle: "preserve-3d" }}
                >
                    {/* Front */}
                    <div className="absolute w-full h-full backface-hidden bg-navy-800 border-2 border-blue-500/20 rounded-2xl flex flex-col items-center justify-center p-8 shadow-xl">
                        <span className="text-xs uppercase tracking-widest text-blue-400 font-bold mb-4">Front</span>
                        <h3 className="text-2xl font-bold text-white leading-relaxed">{cards[currentIndex].front}</h3>
                        <p className="absolute bottom-4 text-xs text-slate-500 animate-pulse">Click to flip</p>
                    </div>

                    {/* Back */}
                    <div
                        className="absolute w-full h-full backface-hidden bg-blue-900 border-2 border-blue-400/50 rounded-2xl flex flex-col items-center justify-center p-8 shadow-xl"
                        style={{ transform: "rotateY(180deg)" }}
                    >
                        <span className="text-xs uppercase tracking-widest text-white/50 font-bold mb-4">Back</span>
                        <p className="text-xl text-white leading-relaxed">{cards[currentIndex].back}</p>
                    </div>
                </motion.div>
            </div>

            <div className="flex items-center justify-between">
                <Button onClick={handlePrev} variant="outline" size="sm">
                    <ArrowLeft size={16} className="mr-2" /> Prev
                </Button>
                <div className="text-slate-400 font-medium">
                    {currentIndex + 1} / {cards.length}
                </div>
                <Button onClick={handleNext} variant="outline" size="sm">
                    Next <ArrowRight size={16} className="ml-2" />
                </Button>
            </div>
        </div>
    );
}
