import { useState } from "react";
import { Plus, Trash2, FileText, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CourseDocument {
    title: string;
    description: string;
    url: string;
    req_enrollment?: boolean;
}

interface DocumentEditorProps {
    documents: CourseDocument[];
    onChange: (documents: CourseDocument[]) => void;
}

export function DocumentEditor({ documents, onChange }: DocumentEditorProps) {
    const addDocument = () => {
        onChange([
            ...documents,
            { title: "New Document", description: "", url: "", req_enrollment: true }
        ]);
    };

    const updateDocument = (index: number, field: keyof CourseDocument, value: any) => {
        const newDocs = [...documents];
        newDocs[index] = { ...newDocs[index], [field]: value };
        onChange(newDocs);
    };

    const removeDocument = (index: number) => {
        if (!confirm("Remove this document?")) return;
        const newDocs = documents.filter((_, i) => i !== index);
        onChange(newDocs);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <FileText className="text-blue-400" size={20} />
                        Course Documents
                    </h3>
                    <p className="text-sm text-slate-400">Manage downloadable materials and study guides.</p>
                </div>
                <Button onClick={addDocument} size="sm" variant="outline">
                    <Plus size={16} className="mr-2" /> Add Document
                </Button>
            </div>

            {documents.length === 0 ? (
                <div className="p-8 text-center border border-white/5 rounded-xl bg-navy-950/50 text-slate-500 text-sm">
                    No documents attached to this course.
                </div>
            ) : (
                <div className="space-y-4">
                    {documents.map((doc, index) => (
                        <div key={index} className="bg-navy-950 border border-white/10 rounded-xl p-4 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Title</label>
                                        <input
                                            type="text"
                                            value={doc.title}
                                            onChange={(e) => updateDocument(index, "title", e.target.value)}
                                            className="w-full bg-navy-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                                            placeholder="Document Title"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Description</label>
                                        <input
                                            type="text"
                                            value={doc.description}
                                            onChange={(e) => updateDocument(index, "description", e.target.value)}
                                            className="w-full bg-navy-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                                            placeholder="Brief description"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-semibold text-slate-500 mb-1 block">URL / Link</label>
                                        <div className="flex items-center gap-2">
                                            <Globe size={16} className="text-slate-500 shrink-0" />
                                            <input
                                                type="text"
                                                value={doc.url}
                                                onChange={(e) => updateDocument(index, "url", e.target.value)}
                                                className="w-full bg-navy-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none font-mono"
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => removeDocument(index)}
                                    size="sm"
                                    className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white mt-1"
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div
                                        onClick={() => updateDocument(index, "req_enrollment", !doc.req_enrollment)}
                                        className={`w-10 h-6 rounded-full p-1 transition-colors ${doc.req_enrollment ? "bg-blue-600" : "bg-slate-700"}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${doc.req_enrollment ? "translate-x-4" : ""}`} />
                                    </div>
                                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                                        Require Enrollment
                                    </span>
                                </label>
                                {doc.req_enrollment ? (
                                    <span className="text-xs text-blue-400 flex items-center gap-1">
                                        <Lock size={12} /> Exclusively for students
                                    </span>
                                ) : (
                                    <span className="text-xs text-green-400 flex items-center gap-1">
                                        <Globe size={12} /> Publicly accessible
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
