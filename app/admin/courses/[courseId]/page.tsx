"use client";

import { useState, useEffect, use } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Course, Module } from "@/lib/courses";
import { Button } from "@/components/ui/Button";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ModuleEditor } from "@/components/admin/ModuleEditor";
import { EligibilityEditor } from "@/components/admin/EligibilityEditor";
import { DocumentEditor } from "@/components/admin/DocumentEditor";
import { prepareCourseForSave } from "@/lib/adminUtils";

// Properly type page props for Next.js App Router
type Params = Promise<{ courseId: string }>;

export default function EditCoursePage(props: { params: Params }) {
    const params = use(props.params); // Unwrap promise
    const { courseId } = params;

    const router = useRouter();
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const docRef = doc(db, "courses", courseId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setCourse(docSnap.data() as Course);
                } else {
                    alert("Course not found!");
                    router.push("/admin/courses");
                }
            } catch (error) {
                console.error("Error fetching course:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourse();
    }, [courseId, router]);


    const handleSave = async () => {
        if (!course) return;
        setSaving(true);
        try {
            const docRef = doc(db, "courses", courseId);
            const sanitizedData = prepareCourseForSave(course);
            await updateDoc(docRef, sanitizedData);
            alert("Course saved successfully!");
        } catch (error) {
            console.error("Error saving course:", error);
            alert("Failed to save course.");
        } finally {
            setSaving(false);
        }
    };

    const updateField = (field: keyof Course, value: any) => {
        if (!course) return;
        setCourse({ ...course, [field]: value });
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    if (!course) return null;

    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/courses">
                        <Button variant="outline" size="sm" className="rounded-full w-10 h-10 p-0 flex items-center justify-center">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Edit Course</h1>
                        <p className="text-slate-400 text-sm">ID: {courseId}</p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-500">
                    {saving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
                    Save Changes
                </Button>
            </div>

            {/* Main Form */}
            <div className="bg-navy-900 border border-white/5 rounded-2xl p-8 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="text-sm font-semibold text-slate-300 mb-2 block">Course Title</label>
                        <input
                            type="text"
                            value={course.title}
                            onChange={(e) => updateField("title", e.target.value)}
                            className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-slate-300 mb-2 block">Price ($)</label>
                        <input
                            type="number"
                            value={course.price}
                            onChange={(e) => updateField("price", Number(e.target.value))}
                            className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-slate-300 mb-2 block">Duration</label>
                        <input
                            type="text"
                            value={course.duration}
                            onChange={(e) => updateField("duration", e.target.value)}
                            className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="text-sm font-semibold text-slate-300 mb-2 block">Format</label>
                        <select
                            value={course.format}
                            onChange={(e) => updateField("format", e.target.value)}
                            className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                        >
                            <option value="Live + Online">Live + Online</option>
                            <option value="Online">Online</option>
                            <option value="In-Person">In-Person</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="text-sm font-semibold text-slate-300 mb-2 block">Description</label>
                        <textarea
                            value={course.description}
                            onChange={(e) => updateField("description", e.target.value)}
                            rows={4}
                            className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="text-sm font-semibold text-slate-300 mb-2 block">Schedule Format / Description</label>
                        <input
                            type="text"
                            value={course.schedule || ""}
                            onChange={(e) => updateField("schedule", e.target.value)}
                            placeholder="e.g. Mon-Fri, 9:00 AM - 4:00 PM EST"
                            className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                </div>

                <div className="border-t border-white/5 pt-6 mt-6">
                    <EligibilityEditor
                        requirements={course.eligibilityRequirements || []}
                        onChange={(reqs) => updateField("eligibilityRequirements", reqs)}
                    />
                </div>

                <div className="border-t border-white/5 pt-6 mt-6">
                    <DocumentEditor
                        documents={course.documents || []}
                        onChange={(docs) => updateField("documents", docs)}
                    />
                </div>
            </div>

            {/* Module Editor */}
            <div className="bg-navy-900 border border-white/5 rounded-2xl p-8">
                <ModuleEditor
                    modules={course.modules || []}
                    onChange={(newModules) => updateField("modules", newModules)}
                />
            </div>
        </div>
    );
}
