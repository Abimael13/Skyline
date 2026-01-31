"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Upload, CheckCircle, XCircle, FileText, Loader2, AlertCircle } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

interface GradingFormProps {
    studentId: string;
    courseId: string;
    courseTitle: string;
    onSuccess?: () => void;
    initialScore?: number;
}

export function GradingForm({ studentId, courseId, courseTitle, onSuccess, initialScore = 0 }: GradingFormProps) {
    const [score, setScore] = useState<number>(initialScore);
    const [passed, setPassed] = useState<boolean | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [feedback, setFeedback] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async () => {
        if (passed === null) {
            setError("Please select Pass or Fail.");
            return;
        }
        if (passed && !file) {
            setError("You must upload a Diploma PDF for passing grades.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let diplomaUrl = null;

            // 1. Upload File if passed
            if (passed && file && storage) {
                const storageRef = ref(storage, `diplomas/${studentId}/${courseId}_${Date.now()}.pdf`);
                await uploadBytes(storageRef, file);
                diplomaUrl = await getDownloadURL(storageRef);
            }

            // 2. Submit to API
            const response = await fetch("/api/admin/grade-exam", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentId,
                    courseId,
                    passed,
                    score,
                    diplomaUrl,
                    feedback
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to submit grade.");
            }

            alert("Exam graded and email sent successfully!");
            if (onSuccess) onSuccess();

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-navy-900 border border-white/5 rounded-2xl p-6 space-y-6">
            <h3 className="text-xl font-bold text-white mb-4">Grade Final Exam: <span className="text-blue-400">{courseTitle}</span></h3>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
                {/* Score Input */}
                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Exam Score (%)</label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={score}
                        onChange={(e) => setScore(Number(e.target.value))}
                        className="w-full bg-navy-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-lg font-mono font-bold"
                    />
                </div>

                {/* Pass/Fail Toggle */}
                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Result</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setPassed(true)}
                            className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${passed === true
                                ? "bg-green-500/20 border-green-500 text-green-400"
                                : "bg-navy-950 border-white/10 text-slate-500 hover:text-white"
                                }`}
                        >
                            <CheckCircle size={18} /> Pass
                        </button>
                        <button
                            onClick={() => setPassed(false)}
                            className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${passed === false
                                ? "bg-red-500/20 border-red-500 text-red-400"
                                : "bg-navy-950 border-white/10 text-slate-500 hover:text-white"
                                }`}
                        >
                            <XCircle size={18} /> Fail
                        </button>
                    </div>
                </div>
            </div>

            {/* Diploma Upload (Only if Passed) */}
            {passed && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Upload School Diploma (PDF)</label>
                    <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-blue-500/50 transition-colors relative group">
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                                {file ? <FileText size={24} /> : <Upload size={24} />}
                            </div>
                            <div>
                                <p className="text-white font-medium">{file ? file.name : "Click to upload PDF"}</p>
                                {!file && <p className="text-slate-500 text-xs mt-1">Maximum file size: 5MB</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Private Feedback */}
            <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Internal Notes / Feedback (Optional)</label>
                <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                    placeholder="Notes about this exam result..."
                    className="w-full bg-navy-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 resize-none text-sm"
                />
            </div>

            <Button
                onClick={handleSubmit}
                disabled={loading || passed === null}
                className={`w-full h-12 text-base ${passed === false ? 'bg-red-600 hover:bg-red-500' : ''}`}
            >
                {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                {passed ? "Submit Passing Grade & Send Diploma" : "Submit Failing Grade & Notify Student"}
            </Button>

            <p className="text-xs text-slate-500 text-center">
                This action will immediately email the student with their result.
            </p>
        </div>
    );
}
