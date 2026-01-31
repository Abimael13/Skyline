"use client";

import { Button } from "@/components/ui/Button";
import { Plus, Trash2, GripVertical, ArrowUp, ArrowDown } from "lucide-react";

interface EligibilityEditorProps {
    requirements: string[];
    onChange: (requirements: string[]) => void;
}

export function EligibilityEditor({ requirements = [], onChange }: EligibilityEditorProps) {

    // Ensure requirements is always an array
    const list = Array.isArray(requirements) ? requirements : [];

    const handleAdd = () => {
        onChange([...list, "New requirement"]);
    };

    const handleRemove = (index: number) => {
        const newList = [...list];
        newList.splice(index, 1);
        onChange(newList);
    };

    const handleUpdate = (index: number, value: string) => {
        const newList = [...list];
        newList[index] = value;
        onChange(newList);
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const newList = [...list];
        if (direction === 'up' && index > 0) {
            [newList[index], newList[index - 1]] = [newList[index - 1], newList[index]];
        } else if (direction === 'down' && index < list.length - 1) {
            [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
        }
        onChange(newList);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-300 uppercase">Eligibility Requirements</h3>
                <Button onClick={handleAdd} size="sm" variant="outline" className="h-8">
                    <Plus size={14} className="mr-1" />
                    Add Rule
                </Button>
            </div>

            <div className="space-y-2">
                {list.length === 0 && (
                    <div className="p-4 border border-dashed border-white/10 rounded-lg text-center text-slate-500 text-sm">
                        No eligibility requirements defined.
                    </div>
                )}

                {list.map((req, index) => (
                    <div key={index} className="flex items-start gap-2 group">
                        <div className="text-slate-600 mt-2 cursor-move">
                            <GripVertical size={16} />
                        </div>
                        <textarea
                            value={req}
                            onChange={(e) => handleUpdate(index, e.target.value)}
                            rows={2}
                            className="flex-1 bg-navy-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm resize-none"
                        />
                        <div className="flex flex-col gap-0.5 mt-1">
                            <button
                                onClick={() => handleMove(index, 'up')}
                                disabled={index === 0}
                                className="text-slate-500 hover:text-white disabled:opacity-30 p-1"
                            >
                                <ArrowUp size={14} />
                            </button>
                            <button
                                onClick={() => handleMove(index, 'down')}
                                disabled={index === list.length - 1}
                                className="text-slate-500 hover:text-white disabled:opacity-30 p-1"
                            >
                                <ArrowDown size={14} />
                            </button>
                        </div>
                        <button
                            onClick={() => handleRemove(index)}
                            className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-white/5 mt-1"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
