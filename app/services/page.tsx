"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, FileText, ShieldCheck, AlertTriangle, Search, BookOpen, ClipboardCheck } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getAllServices, Service } from "@/lib/db";
import { servicesData } from "@/lib/services-data";

// Map slugs to Lucide icons
const iconMap: Record<string, any> = {
    "fire-safety-plans": FileText,
    "emergency-action-plans": ShieldCheck,
    "violations-removal": AlertTriangle,
    "on-site-inspections": Search,
    "drill-coordination": BookOpen,
    "record-keeping": ClipboardCheck
};

export default function CompliancePage() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchServices = async () => {
            const data = await getAllServices();
            if (data.length > 0) {
                setServices(data);
            } else {
                // Fallback to static data if DB is empty
                const staticServices = servicesData.map(s => ({
                    ...s,
                    iconName: "FileText" // Default, though we use slug for mapping
                }));
                setServices(staticServices);
            }
            setLoading(false);
        };
        fetchServices();
    }, []);

    return (
        <div className="min-h-screen bg-navy-950 text-white selection:bg-blue-500/30">
            <Navbar />

            <main className="pt-32 pb-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-center mb-16"
                    >
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">
                            Our <span className="text-blue-500">Services</span>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                            Ensure your building meets all FDNY requirements with our expert compliance consulting and support services.
                        </p>
                    </motion.div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {services.map((item, index) => {
                                const Icon = iconMap[item.slug] || FileText;
                                return (
                                    <Link href={`/services/${item.slug}`} key={item.slug} className="block group">
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.5, delay: index * 0.1 }}
                                            className="h-full p-6 rounded-2xl bg-slate-900/50 border border-white/5 group-hover:border-blue-500/50 transition-all duration-300 hover:bg-slate-900/80 hover:-translate-y-1"
                                        >
                                            <div className="w-12 h-12 rounded-lg bg-blue-900/20 flex items-center justify-center mb-4 group-hover:bg-blue-600/20 transition-colors">
                                                <Icon className="text-blue-400 group-hover:text-blue-300" size={24} />
                                            </div>
                                            <h3 className="text-xl font-bold mb-3 text-white group-hover:text-blue-400 transition-colors">{item.title}</h3>
                                            <p className="text-slate-400">{item.description}</p>
                                            <div className="mt-4 flex items-center text-blue-500 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0">
                                                Learn More <ArrowRight className="ml-1 w-4 h-4" />
                                            </div>
                                        </motion.div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
