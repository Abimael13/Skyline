"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { COURSES, Course } from "@/lib/courses";
import { Button } from "@/components/ui/Button";
import { Clock, BookOpen, ChevronRight, Check } from "lucide-react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function CatalogPreview() {
    const [courses, setCourses] = useState<Course[]>(COURSES);

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
                }
            } catch (error) {
                console.error("Error fetching courses:", error);
            }
        };

        fetchCourses();
    }, []);

    return (
        <section className="py-24 bg-navy-900 relative overflow-hidden" id="courses">
            {/* Background blobs */}
            <div className="absolute top-1/4 -right-64 w-96 h-96 bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 -left-64 w-96 h-96 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-5xl font-bold text-white mb-6"
                    >
                        Available Courses
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-xl text-slate-400 max-w-2xl mx-auto"
                    >
                        Accredited training programs designed to help you advance your career in Fire and Life Safety.
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {courses.map((course, index) => (
                        <motion.div
                            key={course.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-navy-950 border border-white/5 rounded-3xl overflow-hidden hover:border-blue-500/30 transition-all group flex flex-col relative"
                        >
                            <Link href={`/courses/${course.id}`} className="absolute inset-0 z-10">
                                <span className="sr-only">View {course.title}</span>
                            </Link>
                            <div className="p-8 flex-1 flex flex-col pointer-events-none">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-300 text-xs font-medium mb-4">
                                            <BookOpen size={12} />
                                            Certification
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-2">{course.title}</h3>
                                        <div className="flex items-center gap-4 text-sm text-slate-400">
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={16} className="text-blue-500" />
                                                {course.duration}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${course.format === 'Online' ? 'bg-cyan-500' : 'bg-green-500'}`} />
                                                {course.format}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-3xl font-bold text-white">
                                        ${course.price}
                                    </div>
                                </div>

                                <p className="text-slate-400 mb-8 line-clamp-3">
                                    {course.description}
                                </p>

                                <ul className="space-y-3 mb-8">
                                    {["FDNY Accredited", "Study Materials Included", "Certificate upon Completion"].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-slate-300 text-sm">
                                            <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                                                <Check size={12} />
                                            </div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>

                                <div className="mt-auto">
                                    <div className="w-full inline-flex items-center justify-center rounded-full font-medium transition-colors h-14 px-8 text-lg bg-blue-600 text-white shadow-lg shadow-blue-900/20 group-hover:bg-blue-500 group-hover:shadow-blue-500/25">
                                        Enroll Now <ChevronRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="mt-16 text-center">
                    <p className="text-slate-500 mb-4">Unsure which course is right for you?</p>
                    <Button variant="outline" href="/contact">
                        Contact Us
                    </Button>
                </div>
            </div>
        </section>
    );
}
