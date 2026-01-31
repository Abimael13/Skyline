"use client";

import { use, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Mail, User, Shield, BookOpen, ArrowLeft, CheckCircle, XCircle, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { GradingForm } from "@/components/admin/GradingForm";
import { COURSES } from "@/lib/courses";

// Properly type page props for Next.js App Router
type Params = Promise<{ studentId: string }>;

interface UserData {
    uid: string;
    email: string;
    displayName?: string;
    enrolledCourses?: string[];
    role?: string;
    examResults?: Record<string, any>;
}

interface ExamSubmission {
    courseId: string;
    submittedAt: string;
    answers: Record<string, number>;
    status: string;
}

export default function StudentDetailPage(props: { params: Params }) {
    const params = use(props.params);
    const { studentId } = params;

    const [student, setStudent] = useState<UserData | null>(null);
    const [submission, setSubmission] = useState<ExamSubmission | null>(null);
    const [loading, setLoading] = useState(true);
    const [showExam, setShowExam] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch User
                const userDocRef = doc(db, "users", studentId);
                const userSnap = await getDoc(userDocRef);

                if (userSnap.exists()) {
                    setStudent({ uid: userSnap.id, ...userSnap.data() } as UserData);

                    // Fetch Exam Submission (Assuming F-89 for now)
                    const subDocRef = doc(db, "users", studentId, "examSubmissions", "f89-flsd");
                    const subSnap = await getDoc(subDocRef);
                    if (subSnap.exists()) {
                        setSubmission(subSnap.data() as ExamSubmission);
                    }
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [studentId]);

    // Get Exam Questions
    const examModule = COURSES.find(c => c.id === "f89-flsd")?.modules.find(m => m.type === "exam");
    const questions = examModule?.content?.questions || [];

    if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

    if (!student) return <div className="p-20 text-center text-slate-500">Student not found.</div>;

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <Link href="/admin/students">
                <Button variant="outline" size="sm" className="mb-4">
                    <ArrowLeft size={16} className="mr-2" /> Back to Students
                </Button>
            </Link>

            {/* Profile Header */}
            <div className="bg-navy-900 border border-white/5 rounded-2xl p-8 flex items-start justify-between gap-6">
                <div className="flex items-start gap-6">
                    <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-2xl">
                        {student.displayName ? student.displayName.charAt(0).toUpperCase() : <User />}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">{student.displayName || "Unknown Student"}</h1>
                        <div className="flex items-center gap-6 text-slate-400 text-sm">
                            <span className="flex items-center gap-2"><Mail size={16} /> {student.email}</span>
                            <span className="flex items-center gap-2"><Shield size={16} /> {student.role || "Student"}</span>
                            <span className="flex items-center gap-2"><BookOpen size={16} /> ID: {student.uid}</span>
                        </div>
                    </div>
                </div>
                <Button
                    onClick={async () => {
                        if (!confirm("Generate mock exam submission? This will overwrite existing data.")) return;

                        try {
                            const mockAnswers: Record<number, number> = {};
                            questions.forEach((q, idx) => {
                                // 70% chance of correct
                                mockAnswers[idx] = Math.random() > 0.3 ? q.correctIndex : (q.correctIndex + 1) % q.options.length;
                            });

                            const submissionData = {
                                courseId: "f89-flsd",
                                submittedAt: new Date().toISOString(),
                                answers: mockAnswers,
                                totalQuestions: questions.length,
                                status: "submitted"
                            };

                            await setDoc(doc(db, "users", studentId, "examSubmissions", "f89-flsd"), submissionData);
                            setSubmission(submissionData as ExamSubmission);
                            alert("Mock exam generated!");
                        } catch (e) {
                            console.error(e);
                            alert("Error generating mock exam");
                        }
                    }}
                    variant="outline"
                    className="border-dashed border-slate-700 text-slate-400 hover:text-white"
                >
                    Generate Mock Exam
                </Button>
            </div>

            {/* Grading Section */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-white">Course Enrollments & Grading</h2>

                {(!student.enrolledCourses || student.enrolledCourses.length === 0) ? (
                    <div className="p-8 border border-dashed border-white/10 rounded-xl text-center text-slate-500">
                        This student is not enrolled in any courses.
                    </div>
                ) : (
                    student.enrolledCourses.map(courseId => {
                        const result = student.examResults?.[courseId];

                        // Calculate score if submission exists for this course
                        let calculatedScore = 0;
                        if (submission?.courseId === courseId) {
                            const correctCount = questions.reduce((acc, q, idx) => {
                                return acc + (submission.answers[idx] === q.correctIndex ? 1 : 0);
                            }, 0);
                            calculatedScore = Math.round((correctCount / questions.length) * 100);
                        }

                        return (
                            <div key={courseId} className="space-y-4">
                                {/* Result Summary */}
                                {result ? (
                                    <div className={`bg-navy-900 border rounded-2xl p-6 ${result.status === 'passed' ? 'border-green-500/30' : 'border-red-500/30'}`}>
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-bold text-white uppercase tracking-wider">{courseId}</h3>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${result.status === 'passed' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                                }`}>
                                                {result.status}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm text-slate-400">
                                            <div>
                                                <span className="block text-xs uppercase font-semibold mb-1">Score</span>
                                                <span className="text-white font-mono text-lg">{result.score}%</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs uppercase font-semibold mb-1">Graded At</span>
                                                <span className="text-white">{result.gradedAt ? new Date(result.gradedAt).toLocaleDateString() : 'N/A'}</span>
                                            </div>
                                        </div>
                                        {result.diplomaUrl && (
                                            <div className="mt-4 pt-4 border-t border-white/5">
                                                <a href={result.diplomaUrl} target="_blank" className="text-blue-400 hover:text-blue-300 text-sm underline">
                                                    View / Download Diploma PDF
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <GradingForm
                                        studentId={student.uid}
                                        courseId={courseId}
                                        courseTitle={courseId.toUpperCase()}
                                        initialScore={calculatedScore}
                                        onSuccess={() => window.location.reload()}
                                    />
                                )}

                                {/* Exam Submission Viewer */}
                                {submission && submission.courseId === courseId && (
                                    <div className="bg-navy-900 border border-white/5 rounded-2xl p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white">Graduation Exam Submission</h4>
                                                    <p className="text-slate-400 text-xs text-slate-400">
                                                        Submitted: {new Date(submission.submittedAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button size="sm" variant="outline" onClick={() => setShowExam(!showExam)}>
                                                {showExam ? "Hide Answers" : "View Answers"}
                                            </Button>
                                        </div>

                                        {showExam && (
                                            <div className="space-y-4 mt-6 pt-6 border-t border-white/5">
                                                {questions.map((q, idx) => {
                                                    const studentAnswer = submission.answers[idx];
                                                    const isCorrect = studentAnswer === q.correctIndex;

                                                    return (
                                                        <div key={idx} className={`p-4 rounded-xl border ${isCorrect ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                                                            <div className="flex items-start gap-4">
                                                                <span className="font-mono text-slate-400 text-sm">Q{idx + 1}</span>
                                                                <div className="flex-1">
                                                                    <p className="font-medium text-white mb-3">{q.text}</p>

                                                                    <div className="space-y-2 text-sm">
                                                                        <div className={`p-2 rounded flex items-center justify-between ${isCorrect ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                                                            <span>Student: {q.options[studentAnswer] ?? "No Answer"}</span>
                                                                            {isCorrect ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                                                        </div>

                                                                        {!isCorrect && (
                                                                            <div className="p-2 rounded bg-white/5 text-slate-400 flex items-center gap-2">
                                                                                <CheckCircle size={14} className="text-green-500" />
                                                                                <span>Correct: {q.options[q.correctIndex]}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
