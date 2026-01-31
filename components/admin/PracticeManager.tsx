import { PracticeItem } from "@/lib/courses";
import { PracticeItemEditor } from "./PracticeItemEditor";
import { Plus, BrainCircuit } from "lucide-react";

interface PracticeManagerProps {
    items: PracticeItem[];
    onChange: (items: PracticeItem[]) => void;
}

export function PracticeManager({ items = [], onChange }: PracticeManagerProps) {

    const handleAddItem = (type: "quiz" | "flashcard" | "scenario" = "quiz") => {
        const newItem: PracticeItem = {
            id: `p-${Date.now()}`,
            type,
            question: "",
            options: type === "quiz" ? ["Option 1", "Option 2"] : undefined,
            correctIndex: type === "quiz" ? 0 : undefined,
            answer: type === "flashcard" ? "" : undefined,
            scenarioContext: type === "scenario" ? "" : undefined,
            correctAction: type === "scenario" ? "" : undefined,
        };
        onChange([...items, newItem]);
    };

    const handleUpdateItem = (index: number, updatedItem: PracticeItem) => {
        const newItems = [...items];
        newItems[index] = updatedItem;
        onChange(newItems);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        onChange(newItems);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div className="flex items-center gap-2 text-white">
                    <BrainCircuit className="text-purple-400" size={20} />
                    <h4 className="font-semibold">Practice & Drills</h4>
                    <span className="bg-white/10 text-xs px-2 py-0.5 rounded-full text-slate-300">{items.length} Items</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleAddItem("flashcard")}
                        className="text-xs bg-navy-800 hover:bg-navy-700 text-white px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
                    >
                        + Flashcard
                    </button>
                    <button
                        onClick={() => handleAddItem("quiz")}
                        className="text-xs bg-navy-800 hover:bg-navy-700 text-white px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
                    >
                        + Quiz
                    </button>
                    <button
                        onClick={() => handleAddItem("scenario")}
                        className="text-xs bg-navy-800 hover:bg-navy-700 text-white px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
                    >
                        + Scenario
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {items.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-xl text-slate-500">
                        <BrainCircuit size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No practice items yet.</p>
                        <p className="text-xs mt-1">Add Flashcards, Quizzes, or Scenarios to build the Drill curriculum.</p>
                    </div>
                )}

                {items.map((item, index) => (
                    <PracticeItemEditor
                        key={item.id}
                        item={item}
                        onChange={(updated) => handleUpdateItem(index, updated)}
                        onRemove={() => handleRemoveItem(index)}
                    />
                ))}
            </div>
        </div>
    );
}
