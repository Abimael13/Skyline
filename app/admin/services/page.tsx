"use client";

import { useEffect, useState } from "react";
import { getAllServices, seedServices, Service } from "@/lib/db";
import { servicesData } from "@/lib/services-data";
import Link from "next/link";
import { Edit2, Plus, RefreshCw } from "lucide-react";

export default function AdminServicesPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);

    const fetchServices = async () => {
        setLoading(true);
        const data = await getAllServices();
        setServices(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchServices();
    }, []);

    const handleSeed = async () => {
        setSeeding(true);
        // Convert static data to Service interface (extracting string icon names manually for now or just generic)
        // We need to map the icon component to a string name
        const iconMap: Record<string, string> = {
            "fire-safety-plans": "FileText",
            "emergency-action-plans": "ShieldCheck",
            "violations-removal": "AlertTriangle",
            "on-site-inspections": "Search",
            "drill-coordination": "BookOpen",
            "record-keeping": "ClipboardCheck"
        };

        const seedData: Service[] = servicesData.map(s => ({
            slug: s.slug,
            title: s.title,
            description: s.description,
            fullDescription: s.fullDescription,
            image: s.image,
            iconName: iconMap[s.slug] || "FileText"
        }));

        const success = await seedServices(seedData);
        if (success) {
            alert("Services seeded successfully!");
            fetchServices();
        } else {
            alert("Failed to seed services.");
        }
        setSeeding(false);
    };

    if (loading) return <div className="text-white">Loading...</div>;

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Services Editor</h1>
                    <p className="text-slate-400 mt-2">Manage public service pages</p>
                </div>
                {services.length === 0 && (
                    <button
                        onClick={handleSeed}
                        disabled={seeding}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={seeding ? "animate-spin" : ""} />
                        {seeding ? "Seeding..." : "Seed from Static Data"}
                    </button>
                )}
            </div>

            <div className="grid gap-4">
                {services.map((service) => (
                    <div
                        key={service.slug}
                        className="bg-navy-900 border border-white/5 p-6 rounded-xl flex items-center justify-between hover:border-blue-500/30 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            {service.image && (
                                <img
                                    src={service.image}
                                    alt={service.title}
                                    className="w-16 h-16 object-cover rounded-lg bg-navy-800"
                                />
                            )}
                            <div>
                                <h3 className="text-xl font-bold text-white">{service.title}</h3>
                                <p className="text-slate-400 text-sm">/services/{service.slug}</p>
                            </div>
                        </div>
                        <Link
                            href={`/admin/services/${service.slug}`}
                            className="bg-white/5 hover:bg-blue-600 hover:text-white text-slate-300 p-3 rounded-lg transition-all"
                        >
                            <Edit2 size={20} />
                        </Link>
                    </div>
                ))}

                {services.length === 0 && !loading && (
                    <div className="text-center p-12 border-2 border-dashed border-white/5 rounded-2xl text-slate-500">
                        No services found in database. Please seed the data.
                    </div>
                )}
            </div>
        </div>
    );
}
