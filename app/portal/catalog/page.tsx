"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { COURSES, Course, isCourseEnrollable } from "@/lib/courses";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/Button";
import { Clock, BookOpen, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function CatalogPage() {
    const { enrolledCourses } = useAuth();
    // Removed local payment state since we are redirecting to public course page

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Course Catalog</h1>
                <p className="text-slate-400">Explore our accredited safety training programs.</p>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {COURSES.map((course, index) => {
                    const isEnrolled = enrolledCourses.includes(course.id);
                    const enrollable = isCourseEnrollable(course);

                    return (
                        <motion.div
                            key={course.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-navy-900/50 border border-white/5 rounded-2xl overflow-hidden flex flex-col hover:border-blue-500/30 transition-all group"
                        >
                            {/* Course Image & Link */}
                            <Link href={`/courses/${course.id}`} className="block relative h-48 bg-navy-800">
                                <Image
                                    src={course.image || "/logo.png"}
                                    alt={course.title}
                                    fill
                                    className="object-contain p-4 transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-navy-950 to-transparent opacity-90" />

                                {!enrollable && (
                                    <div className="absolute top-4 left-4 z-10 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/60 border border-amber-500/40 text-amber-300 text-xs font-medium backdrop-blur-sm">
                                        Coming Soon
                                    </div>
                                )}

                                <div className="absolute bottom-4 left-4 right-4 z-10">
                                    <h3 className="text-xl font-bold text-white leading-tight drop-shadow-md">{course.title}</h3>
                                </div>
                            </Link>

                            <div className="p-6 flex-1 flex flex-col">
                                <p className="text-slate-400 text-sm mb-6 flex-1 line-clamp-3">
                                    {course.description}
                                </p>

                                <div className="flex items-center gap-4 text-xs font-medium text-slate-500 mb-6">
                                    <div className="flex items-center gap-1.5 bg-slate-800/50 px-2.5 py-1 rounded-full">
                                        <Clock size={14} />
                                        {enrollable ? course.duration : "Duration TBD"}
                                    </div>
                                    {enrollable && (
                                        <div className="flex items-center gap-1.5 bg-slate-800/50 px-2.5 py-1 rounded-full">
                                            <BookOpen size={14} />
                                            Online + Live
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                                    <div className="text-2xl font-bold text-white">
                                        {enrollable ? `$${course.price}` : (
                                            <span className="text-base font-semibold text-slate-400">Pricing TBA</span>
                                        )}
                                    </div>

                                    {!enrollable ? (
                                        <Link href={`/courses/${course.id}`}>
                                            <Button variant="outline">
                                                Learn More
                                            </Button>
                                        </Link>
                                    ) : isEnrolled ? (
                                        <Button disabled className="bg-green-600/20 text-green-400 cursor-default hover:bg-green-600/20 border border-green-500/50">
                                            <Check size={16} className="mr-2" />
                                            Enrolled
                                        </Button>
                                    ) : (
                                        <Link href={`/courses/${course.id}`}>
                                            <Button>
                                                View Course
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
