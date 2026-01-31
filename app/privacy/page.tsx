"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-navy-950 text-white selection:bg-blue-500/30">
            <Navbar />

            <main className="pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto prose prose-invert prose-lg">
                    <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
                    <p className="text-slate-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold mb-4 text-white">1. Information We Collect</h2>
                        <p className="text-slate-300">
                            We collect information you provide directly to us, such as when you create an account, purchase a course, or contact us. This may include your name, email address, phone number, and payment information.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold mb-4 text-white">2. How We Use Your Information</h2>
                        <p className="text-slate-300">
                            We use the information we collect to provide and improve our services, process payments, send you course updates and certificates, and communicate with you about your account.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold mb-4 text-white">3. Data Security</h2>
                        <p className="text-slate-300">
                            We implement appropriate technical and organizational measures to protect the security of your personal information. However, no method of transmission over the Internet is 100% secure.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold mb-4 text-white">4. Cookies</h2>
                        <p className="text-slate-300">
                            We use cookies and similar technologies to track activity on our service and hold certain information to improve your user experience.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold mb-4 text-white">5. Contact Us</h2>
                        <p className="text-slate-300">
                            If you have any questions about this Privacy Policy, please contact us at info@skylinesafetyservice.com.
                        </p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
}
