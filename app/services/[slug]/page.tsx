"use client";

import { use, useEffect, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CheckCircle2, FileText, ShieldCheck, AlertTriangle, Search, BookOpen, ClipboardCheck } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getServiceBySlug, Service } from "@/lib/db";
import { servicesData } from "@/lib/services-data";
import ReactMarkdown from "react-markdown";

// Map slugs to Lucide icons
const iconMap: Record<string, any> = {
    "fire-safety-plans": FileText,
    "emergency-action-plans": ShieldCheck,
    "violations-removal": AlertTriangle,
    "on-site-inspections": Search,
    "drill-coordination": BookOpen,
    "record-keeping": ClipboardCheck
};

export default function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    // Unwrap params in Next.js 15+
    const unwrappedParams = use(params);
    const router = useRouter();
    const [service, setService] = useState<Service | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchService = async () => {
            let data = await getServiceBySlug(unwrappedParams.slug);

            if (!data) {
                // Fallback to static data
                const staticService = servicesData.find(s => s.slug === unwrappedParams.slug);
                if (staticService) {
                    data = {
                        ...staticService,
                        iconName: unwrappedParams.slug
                    };
                }
            }

            if (data) {
                setService(data);
            } else {
                // If neither DB nor static has it
                setLoading(false);
                return; // Will trigger the !service check below (or rely on router.push if we want)
            }
            setLoading(false);
        };
        fetchService();
    }, [unwrappedParams.slug, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-navy-950 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!service) {
        notFound();
        return null;
    }

    const Icon = iconMap[service.iconName || service.slug] || FileText;

    return (
        <div className="min-h-screen bg-navy-950 text-white selection:bg-blue-500/30 font-inter">
            <Navbar />

            {/* Hero Section with Image Background */}
            <div className="relative h-[60vh] min-h-[500px] w-full overflow-hidden">
                {/* Image Layer */}
                {service.image && (
                    <div className="absolute inset-0 z-0">
                        <Image
                            src={service.image}
                            alt={service.title}
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                )}

                {/* Overlay Layers */}
                <div className="absolute inset-0 bg-navy-950/60 z-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/40 to-transparent z-10" />

                <div className="absolute inset-0 z-20 flex flex-col justify-end pb-20 px-6">
                    <div className="max-w-7xl mx-auto w-full">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="mb-6 flex items-center gap-2 text-blue-400 font-medium tracking-wide text-sm uppercase"
                        >
                            <Link href="/services" className="hover:text-blue-300 transition-colors flex items-center gap-1">
                                <ArrowLeft size={16} /> Services
                            </Link>
                            <span>/</span>
                            <span>{service.title}</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight leading-none"
                        >
                            {service.title}
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-xl md:text-2xl text-slate-300 max-w-2xl font-light leading-relaxed"
                        >
                            {service.description}
                        </motion.p>
                    </div>
                </div>
            </div>

            <main className="px-6 py-20 relative z-20 -mt-10">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-16">
                    {/* Main Content */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="lg:col-span-2 space-y-8"
                    >
                        <div className="mb-8">
                            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 flex items-center justify-center mb-6 text-blue-500">
                                <Icon size={32} />
                            </div>
                        </div>

                        <div className="prose prose-lg prose-invert max-w-none 
                            prose-headings:text-white prose-headings:font-bold prose-headings:tracking-tight
                            prose-p:text-slate-300 prose-p:leading-relaxed prose-p:text-lg
                            prose-li:text-slate-300 
                            prose-strong:text-white prose-strong:font-semibold
                            prose-ul:space-y-3 prose-ul:my-6
                            prose-hr:border-white/10"
                        >
                            <ReactMarkdown
                                components={{
                                    ul: ({ node, ...props }) => <ul className="list-none pl-0 grid grid-cols-1 md:grid-cols-2 gap-4" {...props} />,
                                    li: ({ node, ...props }) => (
                                        <li className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors" {...props}>
                                            <CheckCircle2 size={24} className="text-blue-500 flex-shrink-0 mt-0.5" />
                                            <span className="font-medium">{props.children}</span>
                                        </li>
                                    ),
                                    h3: ({ node, ...props }) => (
                                        <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 mt-12 mb-6 pb-2 border-b border-white/10" {...props} />
                                    ),
                                }}
                            >
                                {service.fullDescription}
                            </ReactMarkdown>
                        </div>
                    </motion.div>

                    {/* Sidebar CTA */}
                    <aside className="lg:col-span-1">
                        <div className="sticky top-32 p-8 rounded-3xl bg-gradient-to-br from-blue-900/20 to-navy-900 border border-blue-500/20 backdrop-blur-sm">
                            <h3 className="text-2xl font-bold text-white mb-4">Partner with Skyline</h3>
                            <p className="text-slate-300 mb-8 leading-relaxed">
                                Get expert guidance and ensure fully code-compliant safety for your building today.
                            </p>

                            <Link
                                href="/contact"
                                className="block w-full text-center bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-1"
                            >
                                Contact Us
                            </Link>

                            <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-center gap-4 text-slate-400 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span>Available 24/7</span>
                                </div>
                                <span>•</span>
                                <span>FDNY Accredited</span>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            <Footer />
        </div>
    );
}
