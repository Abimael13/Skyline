"use client";

import { motion } from "framer-motion";
import { BookOpen, Award, Users, ShieldCheck, Clock, Laptop } from "lucide-react";

const features = [
    {
        icon: BookOpen,
        title: "Comprehensive Curriculum",
        description: "Full 31-hour coverage of FDNY requirements including Local Law 5.",
    },
    {
        icon: ShieldCheck,
        title: "FDNY Accredited",
        description: "Officially recognized training that qualifies you for the F-89 exam.",
    },
    {
        icon: Users,
        title: "Expert Instructors",
        description: "Learn from active and retired FDNY veterans with real-world experience.",
    },
    {
        icon: Clock,
        title: "Flexible Scheduling",
        description: "Evening and weekend classes designed for working professionals.",
    },
    {
        icon: Laptop,
        title: "Interactive Learning",
        description: "Engaging video content, simulations, and real-time progress tracking.",
    },
    {
        icon: Award,
        title: "Certification Support",
        description: "Guidance through the entire application and exam process.",
    },
];

export function ProgramDetails() {
    return (
        <section id="program" className="py-24 relative">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Master the Curriculum
                    </h2>
                    <p className="text-slate-400 text-lg">
                        Our FLSD course is designed to provide deeper insights into fire safety,
                        emergency protocols, and building management.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="p-6 rounded-2xl bg-navy-900/50 border border-white/5 hover:border-blue-500/30 transition-colors group"
                        >
                            <div className="w-12 h-12 rounded-lg bg-blue-900/20 flex items-center justify-center mb-4 group-hover:bg-blue-600/20 transition-colors">
                                <feature.icon className="text-blue-400 group-hover:text-blue-300" size={24} />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-slate-400 leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
