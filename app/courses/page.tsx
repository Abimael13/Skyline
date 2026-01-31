"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { COURSES, Course } from "@/lib/courses";
import { Button } from "@/components/ui/Button";
import { Clock, Calendar, Shield, ArrowRight } from "lucide-react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function CoursesPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "courses"));
                const fetchedCourses: Course[] = [];
                querySnapshot.forEach((doc) => {
                    fetchedCourses.push(doc.data() as Course);
                });

                if (fetchedCourses.length > 0) {
                    setCourses(fetchedCourses);
                } else {
                    // Fallback to static if empty
                    setCourses(COURSES);
                }
            } catch (error) {
                console.error("Error fetching courses:", error);
                setCourses(COURSES);
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, []);

    return (
        <div className="min-h-screen bg-navy-950 text-white selection:bg-blue-500/30">
            <Navbar />

            <main className="pt-32 pb-20">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-16"
                    >
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">Course Catalog</h1>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                            Browse our FDNY-accredited training programs. Select a course to view upcoming dates and eligibility requirements.
                        </p>
                    </motion.div>

                    {loading ? (
                        <div className="text-center py-20 text-slate-500">Loading courses...</div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {courses.map((course, index) => (
                                <motion.div
                                    key={course.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="group relative bg-navy-900 border border-white/5 rounded-3xl overflow-hidden hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300"
                                >
                                    <Link href={`/courses/${course.id}`} className="absolute inset-0 z-10">
                                        <span className="sr-only">View Details for {course.title}</span>
                                    </Link>
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />

                                    <div className="p-8 pointer-events-none">
                                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                                            <Shield size={24} />
                                        </div>

                                        <h3 className="text-2xl font-bold mb-3">{course.title}</h3>
                                        <p className="text-slate-400 mb-6 line-clamp-3">
                                            {course.description}
                                        </p>

                                        <div className="space-y-3 mb-8">
                                            <div className="flex items-center gap-3 text-slate-300 text-sm">
                                                <Clock size={16} className="text-blue-500" />
                                                <span>{course.duration}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-slate-300 text-sm">
                                                <div className={`w-2 h-2 rounded-full ${course.format === 'Online' ? 'bg-cyan-500' : 'bg-green-500'}`} />
                                                <span>{course.format}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-slate-300 text-sm">
                                                <Calendar size={16} className="text-blue-500" />
                                                <span>{course.schedule}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                            <div className="text-2xl font-bold text-white">
                                                ${course.price}
                                            </div>
                                            <div className="inline-flex items-center justify-center rounded-full font-medium transition-colors h-9 px-4 text-sm border border-slate-700 text-slate-300 bg-transparent group-hover:bg-blue-600 group-hover:border-blue-500 group-hover:text-white">
                                                View Details <ArrowRight size={16} className="ml-2" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
