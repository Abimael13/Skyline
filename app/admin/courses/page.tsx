"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, setDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COURSES } from "@/lib/courses";
import { Button } from "@/components/ui/Button";
import { Loader2, Plus, RefreshCw, AlertTriangle, Trash2 } from "lucide-react";
import Link from "next/link";
import { Course } from "@/lib/courses";
import { useRouter } from "next/navigation";

export default function AdminCoursesPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);
    const router = useRouter();

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "courses"));
            const fetchedCourses: Course[] = [];
            querySnapshot.forEach((doc) => {
                fetchedCourses.push(doc.data() as Course);
            });
            setCourses(fetchedCourses);
        } catch (error) {
            console.error("Error fetching courses:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    const handleSeedDatabase = async () => {
        if (!confirm("This will overwrite existing courses in the database with the static defaults. Are you sure?")) return;

        setSeeding(true);
        try {
            for (const course of COURSES) {
                await setDoc(doc(db, "courses", course.id), course);
            }
            alert("Database seeded successfully!");
            fetchCourses();
        } catch (error) {
            console.error("Error seeding database:", error);
            alert("Error seeding database check console.");
        } finally {
            setSeeding(false);
        }
    };

    const handleAddCourse = async () => {
        const newId = `course-${Date.now()}`;
        const newCourse: Course = {
            id: newId,
            title: "New Untitled Course",
            description: "Description goes here...",
            price: 100,
            duration: "10 Hours",
            schedule: "TBD",
            upcomingDates: [],
            zoomLink: "",
            format: "Online",
            modules: [],
        };

        try {
            await setDoc(doc(db, "courses", newId), newCourse);
            // Refresh or navigate? Let's just refresh for now
            await fetchCourses();
            // Optional: navigate to edit
            if (confirm("Course created! Go to edit page now?")) {
                router.push(`/admin/courses/${newId}`);
            }
        } catch (error) {
            console.error("Error creating course:", error);
            alert("Failed to create course.");
        }
    };

    const handleDeleteCourse = async (courseId: string) => {
        if (!confirm("Are you sure you want to delete this course? This cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, "courses", courseId));
            alert("Course deleted.");
            fetchCourses();
        } catch (error) {
            console.error("Error deleting course:", error);
            alert("Failed to delete course.");
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Manage Courses</h1>
                    <p className="text-slate-400">Create, edit, and manage course content and modules.</p>
                </div>
                <div className="flex gap-4">
                    <Button onClick={handleSeedDatabase} variant="outline" disabled={seeding} className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10">
                        {seeding ? <Loader2 className="animate-spin mr-2" size={16} /> : <RefreshCw className="mr-2" size={16} />}
                        Seed Database (Reset)
                    </Button>
                    <Button onClick={handleAddCourse}>
                        <Plus className="mr-2" size={16} />
                        Add New Course
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                </div>
            ) : courses.length === 0 ? (
                <div className="bg-navy-900 border border-white/5 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="text-yellow-500" size={32} />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No Courses Found</h3>
                    <p className="text-slate-400 max-w-md mb-6">
                        The database is currently empty. Use the "Seed Database" button to load the initial course catalog.
                    </p>
                    <Button onClick={handleSeedDatabase} disabled={seeding}>
                        Seed Database Now
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {courses.map((course) => (
                        <div key={course.id} className="bg-navy-900 border border-white/5 rounded-xl p-6 flex justify-between items-center hover:border-blue-500/30 transition-all">
                            <div>
                                <h3 className="text-lg font-bold text-white">{course.title}</h3>
                                <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                                    <span>{course.duration}</span>
                                    <span>•</span>
                                    <span>${course.price}</span>
                                    <span>•</span>
                                    <span className="text-blue-400">{course.format}</span>
                                </div>
                                <div className="mt-2 text-xs text-slate-500">
                                    {course.modules?.length || 0} Modules configured
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <Link href={`/admin/courses/${course.id}`}>
                                    <Button variant="outline" size="sm">Edit</Button>
                                </Link>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                                    onClick={() => handleDeleteCourse(course.id)}
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
