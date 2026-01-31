"use client";

import { useState, useEffect } from "react";
import { generateWelcomeEmailHtml } from "@/lib/email-templates";

export default function EmailPreviewPage() {
    const [html, setHtml] = useState("");

    useEffect(() => {
        // Generate sample email HTML
        const sampleHtml = generateWelcomeEmailHtml({
            name: "John Doe",
            courseTitle: "F-89 FLSD Graduation Exam",
            startDate: "February 10, 2026",
            portalLink: "http://localhost:3000/login"
        });
        setHtml(sampleHtml);
    }, []);

    return (
        <div className="min-h-screen bg-slate-100 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-slate-800 mb-6">Welcome Email Preview</h1>
                <div className="bg-white rounded-lg shadow-xl overflow-hidden border border-slate-200">
                    <div className="bg-slate-50 border-b border-slate-200 p-4 text-sm text-slate-500">
                        <span className="font-bold mr-2">Subject:</span> Welcome to F-89 FLSD Graduation Exam - Start Your Training
                    </div>
                    {/* Render HTML in iframe to isolate styles like a real email client */}
                    <iframe
                        srcDoc={html}
                        className="w-full h-[800px] border-none"
                        title="Email Preview"
                    />
                </div>
            </div>
        </div>
    );
}
