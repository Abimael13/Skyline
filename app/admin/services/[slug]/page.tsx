"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getServiceBySlug, updateService, Service } from "@/lib/db";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";

export default function EditServicePage({ params }: { params: Promise<{ slug: string }> }) {
    const unwrappedParams = use(params);
    const router = useRouter();

    const [service, setService] = useState<Service | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<Partial<Service>>({});

    useEffect(() => {
        const loadService = async () => {
            const data = await getServiceBySlug(unwrappedParams.slug);
            if (data) {
                setService(data);
                setFormData(data);
            } else {
                alert("Service not found");
                router.push("/admin/services");
            }
            setLoading(false);
        };
        loadService();
    }, [unwrappedParams.slug, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        if (service && service.slug) {
            const success = await updateService(service.slug, formData);
            if (success) {
                alert("Service updated successfully!");
                router.push("/admin/services");
            } else {
                alert("Failed to update service.");
            }
        }
        setSaving(false);
    };

    if (loading) return <div className="text-white p-8">Loading service data...</div>;
    if (!service) return null;

    return (
        <div>
            <div className="mb-8">
                <Link href="/admin/services" className="text-slate-400 hover:text-white flex items-center gap-2 mb-4 transition-colors">
                    <ArrowLeft size={18} /> Back to Services
                </Link>
                <h1 className="text-3xl font-bold text-white">Edit Service: {service.title}</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-navy-900 border border-white/5 rounded-2xl p-8 max-w-4xl space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Service Title</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title || ""}
                            onChange={handleChange}
                            className="w-full bg-navy-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Slug (Read-only)</label>
                        <input
                            type="text"
                            value={service.slug}
                            disabled
                            className="w-full bg-navy-950/50 border border-white/5 rounded-lg px-4 py-3 text-slate-500 cursor-not-allowed"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Short Description</label>
                    <textarea
                        name="description"
                        value={formData.description || ""}
                        onChange={handleChange}
                        rows={3}
                        className="w-full bg-navy-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Full Description (Markdown supported)</label>
                    <div className="relative">
                        <textarea
                            name="fullDescription"
                            value={formData.fullDescription || ""}
                            onChange={handleChange}
                            rows={15}
                            className="w-full bg-navy-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm leading-relaxed"
                        />
                        <div className="absolute top-3 right-3 text-xs text-slate-500">Markdown</div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Image URL</label>
                    <input
                        type="text"
                        name="image"
                        value={formData.image || ""}
                        onChange={handleChange}
                        className="w-full bg-navy-950 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    {formData.image && (
                        <div className="mt-2 relative h-40 w-full rounded-lg overflow-hidden border border-white/5">
                            <img src={formData.image} alt="Preview" className="w-full h-full object-cover opacity-60" />
                        </div>
                    )}
                </div>

                <div className="pt-6 border-t border-white/5 flex items-center justify-end gap-4">
                    <Link
                        href="/admin/services"
                        className="px-6 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-medium"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={20} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
