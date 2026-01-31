import { PracticeItem, PracticeType } from "@/lib/courses";
import { Copy, Trash2, CheckCircle } from "lucide-react";

interface PracticeItemEditorProps {
    item: PracticeItem;
    onChange: (item: PracticeItem) => void;
    onRemove: () => void;
}

export function PracticeItemEditor({ item, onChange, onRemove }: PracticeItemEditorProps) {

    const handleChange = (field: keyof PracticeItem, value: any) => {
        onChange({ ...item, [field]: value });
    };

    const handleTypeChange = (newType: PracticeType) => {
        // Reset type-specific fields when switching
        const newItem: PracticeItem = {
            id: item.id,
            type: newType,
            question: item.question, // Keep question/front
            explanation: item.explanation || "",
        };

        if (newType === "quiz") {
            newItem.options = ["Option 1", "Option 2"];
            newItem.correctIndex = 0;
        } else if (newType === "flashcard") {
            newItem.answer = "";
        } else if (newType === "scenario") {
            newItem.scenarioContext = "";
            newItem.correctAction = "";
        }

        onChange(newItem);
    };

    return (
        <div className="bg-navy-900 border border-white/5 rounded-xl p-4 space-y-4">
            {/* Header: Type Selector and Delete */}
            <div className="flex justify-between items-center gap-4">
                <select
                    value={item.type}
                    onChange={(e) => handleTypeChange(e.target.value as PracticeType)}
                    className="bg-navy-800 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                >
                    <option value="quiz">Quiz Question</option>
                    <option value="flashcard">Flashcard</option>
                    <option value="scenario">Scenario</option>
                </select>
                <div className="text-xs text-slate-500 font-mono">{item.id}</div>
                <button onClick={onRemove} className="text-slate-500 hover:text-red-400">
                    <Trash2 size={16} />
                </button>
            </div>

            {/* Common Field: Question/Term */}
            <div>
                <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">
                    {item.type === "flashcard" ? "Front (Term/Question)" : "Question"}
                </label>
                <textarea
                    value={item.question}
                    onChange={(e) => handleChange("question", e.target.value)}
                    className="w-full bg-navy-950/50 rounded-lg p-3 text-sm text-white border border-white/5 focus:border-blue-500 focus:outline-none resize-none"
                    rows={2}
                    placeholder="Enter the question or flashcard front..."
                />
            </div>

            {/* TYPE SPECIFIC FIELDS */}

            {/* --- QUIZ --- */}
            {item.type === "quiz" && (
                <div className="space-y-3 pl-4 border-l-2 border-blue-500/20">
                    <label className="text-[10px] uppercase text-blue-400 font-bold block">Answer Options</label>
                    {item.options?.map((option, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <button
                                onClick={() => handleChange("correctIndex", idx)}
                                className={`p-1 rounded-full ${item.correctIndex === idx ? "text-green-400 bg-green-400/10" : "text-slate-600 hover:text-slate-400"}`}
                                title="Mark as Correct"
                            >
                                <CheckCircle size={16} fill={item.correctIndex === idx ? "currentColor" : "none"} />
                            </button>
                            <input
                                type="text"
                                value={option}
                                onChange={(e) => {
                                    const newOptions = [...(item.options || [])];
                                    newOptions[idx] = e.target.value;
                                    handleChange("options", newOptions);
                                }}
                                className={`flex-1 bg-navy-950/50 rounded px-2 py-1.5 text-sm text-white border focus:outline-none ${item.correctIndex === idx ? "border-green-500/30" : "border-white/5"}`}
                            />
                            <button
                                onClick={() => {
                                    const newOptions = [...(item.options || [])];
                                    newOptions.splice(idx, 1);
                                    handleChange("options", newOptions);
                                }}
                                className="text-slate-600 hover:text-red-400"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => handleChange("options", [...(item.options || []), "New Option"])}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1"
                    >
                        + Add Opiton
                    </button>
                </div>
            )}

            {/* --- FLASHCARD --- */}
            {item.type === "flashcard" && (
                <div>
                    <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Back (Answer/Definition)</label>
                    <textarea
                        value={item.answer || ""}
                        onChange={(e) => handleChange("answer", e.target.value)}
                        className="w-full bg-navy-950/50 rounded-lg p-3 text-sm text-white border border-white/5 focus:border-blue-500 focus:outline-none resize-none"
                        rows={3}
                    />
                </div>
            )}

            {/* --- SCENARIO --- */}
            {item.type === "scenario" && (
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] uppercase text-yellow-500 font-bold mb-1 block">Scenario Context (The "Situation")</label>
                        <textarea
                            value={item.scenarioContext || ""}
                            onChange={(e) => handleChange("scenarioContext", e.target.value)}
                            className="w-full bg-navy-950/50 rounded-lg p-3 text-sm text-slate-300 border-l-2 border-yellow-500/50 focus:border-yellow-500 focus:outline-none resize-none"
                            rows={2}
                            placeholder="e.g. 'Smoke detector activates on 5th floor...'"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase text-green-500 font-bold mb-1 block">Correct Action (The "Answer")</label>
                        <textarea
                            value={item.correctAction || ""}
                            onChange={(e) => handleChange("correctAction", e.target.value)}
                            className="w-full bg-navy-950/50 rounded-lg p-3 text-sm text-white border border-white/5 focus:border-green-500 focus:outline-none resize-none"
                            rows={4}
                            placeholder="Explain the correct protocol..."
                        />
                    </div>
                </div>
            )}

            {/* Common Field: Explanation (for Quiz/Scenario usually, but defined on all) */}
            {item.type !== "flashcard" && (
                <div>
                    <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Explanation (Optional)</label>
                    <textarea
                        value={item.explanation || ""}
                        onChange={(e) => handleChange("explanation", e.target.value)}
                        className="w-full bg-navy-950/30 rounded-lg p-2 text-xs text-slate-400 border border-white/5 focus:border-blue-500 focus:outline-none resize-none"
                        rows={2}
                        placeholder="Why is this the correct answer?"
                    />
                </div>
            )}

        </div>
    );
}
