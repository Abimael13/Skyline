"use client";

import { use, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Loader2, Mail, User, Shield, BookOpen, ArrowLeft, CheckCircle, XCircle, FileText, ShieldCheck, Clock, Video, PlayCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { GradingForm } from "@/components/admin/GradingForm";
import { COURSES } from "@/lib/courses";
import { getExamAttemptEligibility, ExamResultRecord } from "@/lib/examEligibility";

// Properly type page props for Next.js App Router
type Params = Promise<{ studentId: string }>;

interface UserData {
    uid: string;
    email: string;
    displayName?: string;
    enrolledCourses?: string[];
    role?: string;
    examResults?: Record<string, ExamResultRecord>;
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
    const [approvingRetakeFor, setApprovingRetakeFor] = useState<string | null>(null);
    // Required note explaining why a retake is being approved (what was
    // reviewed, any context) - keyed by courseId so each course's retake
    // approval card has its own draft. Sent to
    // app/api/admin/approve-retake/route.ts and stored as
    // examResults[courseId].retakeApprovalNotes.
    const [retakeNotes, setRetakeNotes] = useState<Record<string, string>>({});

    // Exam proctoring recordings for this student's graduation exam
    // (keyed by attempt number - see lib/examRecording.ts), read from
    // exam_sessions/{studentId}_f89-flsd.recordings. Only the f89-flsd
    // graduation exam has proctoring/recording in this app today - see
    // components/learning/ExamPortal.tsx.
    const [examRecordings, setExamRecordings] = useState<Record<string, { status: string; error?: string | null }>>({});
    const [fetchingRecordingUrl, setFetchingRecordingUrl] = useState(false);
    const [recordingError, setRecordingError] = useState<string | null>(null);

    const handleViewRecording = async (attemptNumber: number) => {
        if (!auth.currentUser) return;
        setFetchingRecordingUrl(true);
        setRecordingError(null);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const resp = await fetch(
                `/api/admin/exam-recording/playback-url?sessionId=${studentId}_f89-flsd&attempt=${attemptNumber}`,
                { headers: { Authorization: `Bearer ${idToken}` } }
            );
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || "Failed to load the recording.");
            window.open(data.url, "_blank", "noopener,noreferrer");
        } catch (error: any) {
            setRecordingError(error.message || "Failed to load the recording.");
        } finally {
            setFetchingRecordingUrl(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch User
                const userDocRef = doc(db, "users", studentId);
                const userSnap = await getDoc(userDocRef);

                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    setStudent({ uid: userSnap.id, ...userData } as UserData);

                    // Fetch Exam Submission (Assuming F-89 for now).
                    // examSubmissions is keyed by BOTH courseId and attempt
                    // number (see app/api/exam/submit/route.ts), so look up
                    // the submission for whichever attempt the current
                    // graded result reflects - that's the one the "View
                    // Answers" panel below is meant to show.
                    const currentResult = userData?.examResults?.["f89-flsd"] as ExamResultRecord | undefined;
                    const attempt = currentResult?.attempt ?? 1;
                    const subDocRef = doc(db, "users", studentId, "examSubmissions", `f89-flsd_attempt${attempt}`);
                    let subSnap = await getDoc(subDocRef);

                    // Backward compatibility: submissions written before
                    // this fix used a fixed "f89-flsd" doc ID with no
                    // attempt suffix.
                    if (!subSnap.exists()) {
                        subSnap = await getDoc(doc(db, "users", studentId, "examSubmissions", "f89-flsd"));
                    }

                    if (subSnap.exists()) {
                        setSubmission(subSnap.data() as ExamSubmission);
                    }

                    // Exam proctoring recording metadata, if any (see
                    // lib/examRecording.ts). Admin-only Firestore rules
                    // already allow this read for a signed-in admin - see
                    // firestore.rules on exam_sessions/{sessionId}.
                    const sessionSnap = await getDoc(doc(db, "exam_sessions", `${studentId}_f89-flsd`));
                    if (sessionSnap.exists()) {
                        setExamRecordings(sessionSnap.data()?.recordings || {});
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

    // Approve a student's second and final attempt after reviewing a failed
    // first attempt. Calls the admin-only, server-verified route (which
    // re-checks eligibility itself and sends the retake-approved email) -
    // matches the same "ID token in Authorization header" pattern used by
    // components/admin/GradingForm.tsx.
    const handleApproveRetake = async (courseId: string) => {
        if (!student) return;

        const notes = (retakeNotes[courseId] || "").trim();
        if (!notes) {
            alert("Please enter a short note on why this retake is being approved before continuing.");
            return;
        }

        if (!confirm("Approve a retake for this student? They will get one final attempt and will be emailed immediately.")) {
            return;
        }

        setApprovingRetakeFor(courseId);
        try {
            if (!auth.currentUser) {
                throw new Error("You must be signed in as an admin to approve a retake.");
            }
            const idToken = await auth.currentUser.getIdToken();

            const response = await fetch("/api/admin/approve-retake", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ studentId: student.uid, courseId, notes }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to approve retake.");
            }

            alert(
                data.emailSent
                    ? "Retake approved. The student has been emailed."
                    : "Retake approved, but the notification email failed to send. Please follow up with the student directly."
            );
            window.location.reload();
        } catch (error: any) {
            console.error("Error approving retake:", error);
            alert(error.message || "Error approving retake.");
        } finally {
            setApprovingRetakeFor(null);
        }
    };

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

                            // Key this mock submission the same way the real
                            // proctored exam does (courseId + attempt number)
                            // so it lines up with whichever attempt is about
                            // to be graded, rather than silently overwriting
                            // a previous attempt's raw answers.
                            const existingResult = student.examResults?.["f89-flsd"];
                            const mockEligibility = getExamAttemptEligibility(existingResult);
                            const mockAttempt = mockEligibility.eligible
                                ? mockEligibility.attemptNumber
                                : (existingResult?.attempt ?? 1);

                            await setDoc(doc(db, "users", studentId, "examSubmissions", `f89-flsd_attempt${mockAttempt}`), submissionData);
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
                        // Two-attempt exam cap: this button is only ever
                        // shown when the student is genuinely sitting in
                        // the failed-attempt-1-awaiting-review state. The
                        // API route re-checks this itself server-side too
                        // (never trust this client-side check alone) - see
                        // lib/examEligibility.ts for the full state machine.
                        const eligibility = getExamAttemptEligibility(result);
                        const canApproveRetake = !eligibility.eligible && eligibility.reason === 'awaiting-review';

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

                                        {/* Exam proctoring recording (FDNY audit) - admin-only. See
                                            lib/examRecording.ts. Only the f89-flsd graduation exam has
                                            proctoring/recording today. */}
                                        {courseId === "f89-flsd" && (() => {
                                            const attempt = result.attempt ?? 1;
                                            const recording = examRecordings[String(attempt)];
                                            if (!recording) return null;
                                            return (
                                                <div className="mt-4 pt-4 border-t border-white/5">
                                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase mb-2">
                                                        <Video size={14} /> Exam Recording (Attempt {attempt})
                                                    </div>
                                                    {recording.status === "completed" ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleViewRecording(attempt)}
                                                            disabled={fetchingRecordingUrl}
                                                        >
                                                            {fetchingRecordingUrl ? (
                                                                <Loader2 className="animate-spin mr-2" size={14} />
                                                            ) : (
                                                                <PlayCircle className="mr-2" size={14} />
                                                            )}
                                                            View Recording
                                                        </Button>
                                                    ) : recording.status === "recording" || recording.status === "recording_unconfirmed" ? (
                                                        <p className="text-xs text-red-400">Recording is still in progress.</p>
                                                    ) : (
                                                        <p className="text-xs text-yellow-400">
                                                            No playable recording ({recording.status.replace("_", " ")}).
                                                            {recording.error ? ` ${recording.error}` : ""}
                                                        </p>
                                                    )}
                                                    {recordingError && <p className="text-xs text-red-400 mt-2">{recordingError}</p>}
                                                </div>
                                            );
                                        })()}

                                        {/* Retake status / approval action - only relevant for a failed result. */}
                                        {result.status === 'failed' && (
                                            <div className="mt-4 pt-4 border-t border-white/5">
                                                {canApproveRetake && (
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 text-sm text-yellow-400">
                                                            <Clock size={16} className="shrink-0" />
                                                            Attempt 1 failed - awaiting review. Not yet approved for a retake.
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
                                                                Approval Notes (required)
                                                            </label>
                                                            <textarea
                                                                value={retakeNotes[courseId] || ""}
                                                                onChange={(e) =>
                                                                    setRetakeNotes((prev) => ({ ...prev, [courseId]: e.target.value }))
                                                                }
                                                                rows={2}
                                                                placeholder="What did you review? Why is this student being cleared for a retake?"
                                                                className="w-full bg-navy-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 resize-none text-sm"
                                                            />
                                                        </div>
                                                        <div className="flex justify-end">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleApproveRetake(courseId)}
                                                                disabled={approvingRetakeFor === courseId || !(retakeNotes[courseId] || "").trim()}
                                                                className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500"
                                                            >
                                                                {approvingRetakeFor === courseId ? (
                                                                    <Loader2 className="animate-spin mr-2" size={16} />
                                                                ) : (
                                                                    <ShieldCheck className="mr-2" size={16} />
                                                                )}
                                                                Approve Retake
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                                {!eligibility.eligible && eligibility.reason === 'attempts-exhausted' && (
                                                    <div className="flex items-center gap-2 text-sm text-red-400">
                                                        <XCircle size={16} className="shrink-0" />
                                                        Both allowed attempts have been used. No further attempts are possible.
                                                    </div>
                                                )}
                                                {eligibility.eligible && (
                                                    <div className="flex items-start gap-2 text-sm text-emerald-400">
                                                        <CheckCircle size={16} className="shrink-0 mt-0.5" />
                                                        <div>
                                                            <p>
                                                                Retake approved{result.retakeApprovedBy ? ` by ${result.retakeApprovedBy}` : ''}{result.retakeApprovedAt ? ` on ${new Date(result.retakeApprovedAt).toLocaleDateString()}` : ''}. Awaiting the student's second attempt.
                                                            </p>
                                                            {result.retakeApprovalNotes && (
                                                                <p className="text-slate-400 mt-1">Notes: {result.retakeApprovalNotes}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
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
