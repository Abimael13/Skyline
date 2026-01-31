"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2, ArrowRightLeft } from "lucide-react";

interface Flashcard {
    front: string;
    back: string;
}

interface FlashcardEditorProps {
    cards: Flashcard[];
    onChange: (cards: Flashcard[]) => void;
}

export function FlashcardEditor({ cards = [], onChange }: FlashcardEditorProps) {
    const handleAddCard = () => {
        onChange([...cards, { front: "Term / Question", back: "Definition / Answer" }]);
    };

    const handleUpdateCard = (index: number, field: keyof Flashcard, value: string) => {
        const newCards = [...cards];
        newCards[index] = { ...newCards[index], [field]: value };
        onChange(newCards);
    };

    const handleRemoveCard = (index: number) => {
        const newCards = [...cards];
        newCards.splice(index, 1);
        onChange(newCards);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h4 className="text-white font-medium">Flashcard Deck</h4>
                <Button size="sm" onClick={handleAddCard} variant="outline">
                    <Plus size={16} className="mr-2" /> Add Card
                </Button>
            </div>

            <div className="grid gap-4">
                {cards.map((card, index) => (
                    <div key={index} className="bg-navy-950/50 border border-white/10 rounded-xl p-4 relative group">
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Front</label>
                                <textarea
                                    value={card.front}
                                    onChange={(e) => handleUpdateCard(index, "front", e.target.value)}
                                    className="w-full bg-navy-900 rounded-lg p-2 text-sm text-white border border-white/5 focus:border-blue-500 focus:outline-none resize-none"
                                    rows={2}
                                />
                            </div>

                            <ArrowRightLeft className="text-slate-600" size={16} />

                            <div className="flex-1">
                                <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Back</label>
                                <textarea
                                    value={card.back}
                                    onChange={(e) => handleUpdateCard(index, "back", e.target.value)}
                                    className="w-full bg-navy-900 rounded-lg p-2 text-sm text-white border border-white/5 focus:border-blue-500 focus:outline-none resize-none"
                                    rows={2}
                                />
                            </div>

                            <button
                                onClick={() => handleRemoveCard(index)}
                                className="self-center p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
