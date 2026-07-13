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
                        <h2 className="text-2xl font-bold mb-4 text-white">4. Video, Audio, Recording, and ID Verification (Live Classes and Exams)</h2>
                        <p className="text-slate-300 mb-4">
                            Some of our courses require live video and audio (camera and microphone) through your web browser, and identity verification using a photo of your government-issued ID. This applies to the following:
                        </p>
                        <ul className="text-slate-300 mb-4 list-disc pl-6 space-y-2">
                            <li>
                                <strong className="text-white">Live classroom sessions.</strong> These are held over Zoom. Zoom&apos;s cloud recording feature is used to record these sessions for training quality purposes only - this recording is not part of any FDNY compliance record.
                            </li>
                            <li>
                                <strong className="text-white">Proctored graduation exams.</strong> These use live video and audio between the student and a proctor within our learning platform. These sessions are recorded within the platform (not Zoom) for FDNY audit and compliance purposes.
                            </li>
                            <li>
                                <strong className="text-white">ID verification.</strong> Before joining a live classroom session, and again before a proctored exam, you are asked to hold your government-issued ID up to your camera. A photo of your ID is captured and stored (not just used momentarily) so an instructor or proctor can confirm your identity before you are admitted.
                            </li>
                        </ul>
                        <p className="text-slate-300 mb-4">
                            Recordings of proctored exams are retained for FDNY audit and compliance purposes and are only ever accessible to authorized Skyline Safety Services administrators - never to students, including the student who was recorded. Recordings of live classroom sessions are retained for training quality purposes and are managed through Zoom&apos;s own administrator controls. ID verification photos are retained to support identity verification and our compliance and audit obligations, and are accessible to authorized Skyline Safety Services staff reviewing them for those purposes and to your own account (to show your verification status) - never to other students.
                        </p>
                        <p className="text-slate-300">
                            <strong className="text-white">1:1 review calls are not recorded.</strong> If you book an optional 1:1 review call with an instructor, that call is a live conversation only. No video, audio, or transcript of a review call is recorded or stored.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold mb-4 text-white">5. Cookies</h2>
                        <p className="text-slate-300">
                            We use cookies and similar technologies to track activity on our service and hold certain information to improve your user experience.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold mb-4 text-white">6. Contact Us</h2>
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
