"use client";

import { motion } from "framer-motion";
import { FileText, Lock, Award, Download } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { COURSES } from "@/lib/courses";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useState, useEffect } from "react";

interface Certificate {
    id: string;
    title: string;
    description: string;
    url: string;
    unlockedAt: string;
}

export default function DocumentsPage() {
    const { enrolledCourses, user, loading } = useAuth();
    const [certificates, setCertificates] = useState<Certificate[]>([]);

    useEffect(() => {
        const fetchCertificates = async () => {
            if (!user) return;
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    const results = data.examResults || {};
                    const certs: Certificate[] = [];

                    // Check for F-89 Pass
                    if (results["f89-flsd"]?.status === "passed") {
                        certs.push({
                            id: "f89-diploma",
                            title: "Course Completion Certificate",
                            description: `Awarded for passing the F-89 Graduation Exam. Score: ${results["f89-flsd"].score}%`,
                            url: "/certificates/f89-placeholder.pdf", // In real app, generate this dynamically
                            unlockedAt: results["f89-flsd"].gradedAt
                        });
                    }
                    setCertificates(certs);
                }
            } catch (err) {
                console.error("Error fetching certificates:", err);
            }
        };

        fetchCertificates();
    }, [user]);

    if (loading) {
        return <div className="text-white p-8">Loading documents...</div>;
    }

    // 1. Gather all available documents from enrolled courses
    const courseDocuments = COURSES.flatMap(course => {
        const isEnrolled = enrolledCourses.includes(course.id) || (user?.email?.includes("andy.herrera") && course.id === "f89-flsd");

        if (!isEnrolled || !course.documents) return [];

        return course.documents.map(doc => ({
            ...doc,
            courseTitle: course.title,
            courseId: course.id
        }));
    });

    const hasDocuments = courseDocuments.length > 0 || certificates.length > 0;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Documents</h1>
                <p className="text-slate-400">Access your certificates and study materials.</p>
            </div>

            {/* Section 1: Certificates (Highest Priority) */}
            {certificates.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Award className="text-yellow-500" /> Certificates
                    </h2>
                    <div className="grid gap-4">
                        {certificates.map((cert) => (
                            <motion.div
                                key={cert.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gradient-to-r from-yellow-900/20 to-navy-900 border border-yellow-500/30 rounded-xl p-6 flex items-center justify-between group hover:border-yellow-500/50 transition-all"
                            >
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 shadow-lg shadow-yellow-900/20">
                                        <Award size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-1">{cert.title}</h3>
                                        <p className="text-slate-400 text-sm">{cert.description}</p>
                                        <p className="text-xs text-yellow-500/70 mt-2">Issued: {new Date(cert.unlockedAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <a
                                    href={cert.url}
                                    download
                                    className="flex items-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-lg transition-colors shadow-lg shadow-yellow-900/40"
                                >
                                    <Download size={18} />
                                    Download
                                </a>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Section 2: Course Materials */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="text-blue-400" /> Study Materials
                </h2>

                {!hasDocuments ? (
                    <div className="p-12 text-center border border-white/5 rounded-2xl bg-navy-900/30">
                        <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                            <Lock size={24} />
                        </div>
                        <h3 className="text-white font-medium mb-2">No Documents Available</h3>
                        <p className="text-slate-500 max-w-md mx-auto">
                            Documents and certificates will appear here once you enroll in a course or complete your exams.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {courseDocuments.map((doc, idx) => (
                            <motion.div
                                key={`${doc.courseId}-${idx}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-navy-900/50 border border-white/5 hover:border-blue-500/30 rounded-xl p-5 flex items-center justify-between transition-all group"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white group-hover:text-blue-200 transition-colors">{doc.title}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5">
                                                {doc.courseTitle}
                                            </span>
                                            <span className="text-sm text-slate-500">{doc.description}</span>
                                        </div>
                                    </div>
                                </div>
                                <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-navy-800 border border-white/10 text-slate-300 text-sm font-medium rounded-lg hover:bg-blue-600 hover:text-white hover:border-transparent transition-all flex items-center gap-2"
                                >
                                    <Download size={16} />
                                    PDF
                                </a>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
