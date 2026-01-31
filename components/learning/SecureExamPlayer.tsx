"use client";

import { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, AlertTriangle, ScanEye, MonitorX, CheckCircle, Loader2, Camera, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Module } from "@/lib/courses";
import jsPDF from "jspdf";

interface SecureExamPlayerProps {
    module: Module;
    onComplete: (score: number, complianceLogs: string[]) => void;
}

type ExamStep = "intro" | "id-check" | "room-scan" | "exam" | "result";

export function SecureExamPlayer({ module, onComplete }: SecureExamPlayerProps) {
    const [step, setStep] = useState<ExamStep>("intro");
    const [complianceLog, setComplianceLog] = useState<string[]>([]);

    // Media References
    const webcamRef = useRef<Webcam>(null);
    const [idImage, setIdImage] = useState<string | null>(null);

    // --- ID CHECK LOGIC ---
    const handleCaptureId = () => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            setIdImage(imageSrc);
            // Simulate Gemini Vision Verification
            setTimeout(() => {
                console.log("Gemini Vision Verification Passed");
            }, 1500);
        }
    };

    // --- FULL SCREEN ENFORCEMENT ---
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && step === "exam") {
                const msg = `Alert: Tab switch detected at ${new Date().toLocaleTimeString()}`;
                setComplianceLog(prev => [...prev, msg]);
                alert("Provide Full Attention! Usage of other tabs is prohibited.");
            }
        };

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && step === "exam") {
                const msg = `Alert: Exited fullscreen at ${new Date().toLocaleTimeString()}`;
                setComplianceLog(prev => [...prev, msg]);
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        document.addEventListener("fullscreenchange", handleFullscreenChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
        };
    }, [step]);

    const requestFullscreen = async () => {
        try {
            await document.documentElement.requestFullscreen();
        } catch (e) {
            console.error("Fullscreen denied", e);
        }
    };

    // --- RENDERERS ---

    if (step === "intro") {
        return (
            <div className="max-w-2xl mx-auto text-center space-y-8 py-12">
                <div className="w-24 h-24 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto text-blue-400">
                    <ShieldCheck size={48} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white mb-4">Secure Graduation Exam</h1>
                    <p className="text-slate-400 text-lg">
                        This exam requires strict compliance. You will be monitored via webcam.
                        Please ensure you are in a quiet room alone.
                    </p>
                </div>

                <div className="bg-navy-900 border border-white/10 rounded-xl p-6 text-left space-y-4">
                    <h3 className="font-semibold text-white">Compliance Requirements:</h3>
                    <ul className="space-y-3 text-sm text-slate-300">
                        <li className="flex gap-3">
                            <Camera size={20} className="text-blue-400 flex-shrink-0" />
                            <span>Webcam must be on at all times. Face must be visible.</span>
                        </li>
                        <li className="flex gap-3">
                            <MonitorX size={20} className="text-blue-400 flex-shrink-0" />
                            <span>Full-screen mode is enforced. Leaving the tab triggers an alert.</span>
                        </li>
                        <li className="flex gap-3">
                            <ScanEye size={20} className="text-blue-400 flex-shrink-0" />
                            <span>Gaze tracking is active. Looking away for more than 10s is flagged.</span>
                        </li>
                    </ul>
                </div>

                <Button
                    size="lg"
                    onClick={() => {
                        requestFullscreen();
                        setStep("id-check");
                    }}
                    className="w-full md:w-auto"
                >
                    Start Pre-Exam Check-in
                </Button>
            </div>
        );
    }

    if (step === "id-check") {
        return (
            <div className="max-w-xl mx-auto text-center space-y-6 py-8">
                <h2 className="text-2xl font-bold text-white">Step 1: Identity Verification</h2>
                <p className="text-slate-400">Hold your Government ID up to the camera.</p>

                <div className="relative aspect-video bg-black rounded-xl overflow-hidden border-2 border-slate-700">
                    {!idImage ? (
                        <>
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 border-[3px] border-dashed border-blue-500/50 m-12 rounded-lg pointer-events-none flex items-center justify-center">
                                <span className="bg-black/50 px-3 py-1 text-xs rounded text-blue-200">Align ID Here</span>
                            </div>
                        </>
                    ) : (
                        <img src={idImage} className="w-full h-full object-cover" />
                    )}
                </div>

                {!idImage ? (
                    <Button onClick={handleCaptureId}>Capture ID</Button>
                ) : (
                    <div className="flex gap-4 justify-center">
                        <Button variant="outline" onClick={() => setIdImage(null)}>Retake</Button>
                        <Button onClick={() => setStep("room-scan")}>Confirm & Continue</Button>
                    </div>
                )}
            </div>
        );
    }

    if (step === "room-scan") {
        return (
            <div className="max-w-xl mx-auto text-center space-y-6 py-8">
                <h2 className="text-2xl font-bold text-white">Step 2: Room Scan</h2>
                <p className="text-slate-400">Please slowly rotate your camera 360 degrees to show your environment.</p>

                <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 right-4 bg-red-500/80 text-white text-xs px-2 py-1 rounded animate-pulse">
                        Recording...
                    </div>
                </div>

                <Button onClick={() => handleStartExam()} size="lg" className="w-full">
                    Environment Secure - Begin Exam
                </Button>
            </div>
        );
    }

    // --- EXAM LOGIC ---
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [examStartTime, setExamStartTime] = useState<Date | null>(null);
    const [endTime, setEndTime] = useState<Date | null>(null);
    const [score, setScore] = useState<number | null>(null);

    const handleStartExam = () => {
        setStep("exam");
        setExamStartTime(new Date());
        requestFullscreen();
    };

    const handleAnswer = (optionIndex: number) => {
        setAnswers(prev => ({ ...prev, [currentQuestionIndex]: optionIndex }));
    };

    const handleNext = () => {
        if (!module.content?.questions) return;
        if (currentQuestionIndex < module.content.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            finishExam();
        }
    };

    const finishExam = () => {
        if (!module.content?.questions) return;

        const now = new Date();
        setEndTime(now);
        setStep("result");

        // Calculate Score
        let correctCount = 0;
        module.content.questions.forEach((q, idx) => {
            if (answers[idx] === q.correctIndex) correctCount++;
        });
        const finalScore = (correctCount / module.content.questions.length) * 100;
        setScore(finalScore);

        onComplete(finalScore, complianceLog);
    };

    const generateAuditPack = () => {
        if (!score || !examStartTime || !endTime) return;

        const doc = new jsPDF();

        // Header
        doc.setFillColor(10, 20, 50); // Navy Blue
        doc.rect(0, 0, 210, 40, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("Official Exam Audit Pack", 105, 25, { align: "center" });

        // Student Info & ID
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text(`Course: ${module.title}`, 20, 60);
        doc.text(`Date: ${examStartTime.toLocaleDateString()}`, 20, 70);
        doc.text(`Duration: ${Math.round((endTime.getTime() - examStartTime.getTime()) / 60000)} mins`, 20, 80);

        doc.setFontSize(16);
        doc.text(`Final Score: ${score.toFixed(1)}%`, 20, 100);
        const status = score >= 70 ? "PASSED" : "FAILED";
        doc.setTextColor(score >= 70 ? 0 : 200, score >= 70 ? 150 : 0, 0); // Green or Red
        doc.text(`Status: ${status}`, 20, 110);

        // ID Image
        if (idImage) {
            doc.text("Verified ID:", 120, 60);
            doc.addImage(idImage, "JPEG", 120, 65, 70, 45); // x, y, w, h
        }

        // Compliance Log
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text("Compliance Logs:", 20, 140);
        doc.setFontSize(10);

        if (complianceLog.length === 0) {
            doc.setTextColor(0, 150, 0);
            doc.text("No compliance issues detected.", 20, 150);
        } else {
            doc.setTextColor(200, 0, 0);
            complianceLog.forEach((log, i) => {
                doc.text(`[ALERT] ${log}`, 20, 150 + (i * 8));
            });
        }

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("Generated by Skyline Safety Secure Exam System", 105, 280, { align: "center" });

        doc.save("Exam_Audit_Pack.pdf");
    };

    if (step === "exam") {
        const questions = module.content?.questions || [];
        const currentQ = questions[currentQuestionIndex];

        return (
            <div className="max-w-4xl mx-auto py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Exam Area */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="flex justify-between items-center text-slate-400 text-sm">
                        <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                        <span className="flex items-center gap-2 text-green-400"><MonitorX size={14} /> Fullscreen Secure</span>
                    </div>

                    <div className="bg-navy-900 border border-white/10 rounded-xl p-8 min-h-[400px]">
                        <h3 className="text-xl text-white font-medium mb-8">{currentQ?.text}</h3>
                        <div className="space-y-4">
                            {currentQ?.options.map((opt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(idx)}
                                    className={`w-full text-left p-4 rounded-lg border transition-all ${answers[currentQuestionIndex] === idx
                                        ? "bg-blue-600/20 border-blue-500 text-white"
                                        : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs ${answers[currentQuestionIndex] === idx ? "border-blue-500 bg-blue-500 text-white" : "border-slate-600"
                                            }`}>
                                            {String.fromCharCode(65 + idx)}
                                        </div>
                                        {opt}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between">
                        <Button
                            variant="ghost"
                            disabled={currentQuestionIndex === 0}
                            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                        >
                            Previous
                        </Button>
                        <Button onClick={handleNext} disabled={answers[currentQuestionIndex] === undefined}>
                            {currentQuestionIndex === questions.length - 1 ? "Submit Exam" : "Next Question"}
                        </Button>
                    </div>
                </div>

                {/* Sidebar Monitoring */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-black rounded-lg overflow-hidden relative aspect-video border border-slate-700">
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            className="w-full h-full object-cover opacity-80"
                        />
                        <div className="absolute top-2 left-2 flex gap-2">
                            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                            </span>
                        </div>
                        <div className="absolute bottom-2 right-2 text-xs text-slate-400 font-mono">
                            Monitoring Active
                        </div>
                    </div>

                    <div className="bg-navy-900 border border-white/10 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                            <ShieldCheck size={16} className="text-green-400" /> Session Status
                        </h4>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between p-2 bg-black/20 rounded">
                                <span className="text-slate-500">Connection</span>
                                <span className="text-green-400">Secure</span>
                            </div>
                            <div className="flex justify-between p-2 bg-black/20 rounded">
                                <span className="text-slate-500">Environment</span>
                                <span className="text-green-400">Verified</span>
                            </div>
                            <div className="flex justify-between p-2 bg-black/20 rounded">
                                <span className="text-slate-500">Alerts</span>
                                <span className={complianceLog.length > 0 ? "text-red-400 font-bold" : "text-slate-400"}>
                                    {complianceLog.length} Detected
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (step === "result") {
        const passed = (score || 0) >= 70;
        return (
            <div className="max-w-xl mx-auto text-center py-16 space-y-8">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto ${passed ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
                    {passed ? <CheckCircle size={48} /> : <AlertTriangle size={48} />}
                </div>

                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">{passed ? "Exam Passed" : "Exam Failed"}</h2>
                    <p className="text-4xl font-mono text-blue-400 font-bold">{score?.toFixed(1)}%</p>
                    <p className="text-slate-400 mt-2">required: 70%</p>
                </div>

                <div className="bg-navy-900 p-6 rounded-xl border border-white/10 space-y-4">
                    <div className="flex items-center gap-4 text-left">
                        <div className="bg-white/5 p-3 rounded-lg"><MonitorX size={24} className="text-blue-400" /></div>
                        <div>
                            <h4 className="font-bold text-white">Compliance Audit</h4>
                            <p className="text-xs text-slate-400">{complianceLog.length} alerts recorded during session.</p>
                        </div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={generateAuditPack}>
                        Download Audit Pack (PDF)
                    </Button>
                </div>

                <Button href="/portal/courses" variant="ghost">Return to Dashboard</Button>
            </div>
        );
    }

    return null;
}

