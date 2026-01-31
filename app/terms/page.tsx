"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-navy-950 text-white selection:bg-blue-500/30">
            <Navbar />

            <main className="pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto prose prose-invert prose-lg">
                    <h1 className="text-4xl font-bold mb-8">SaaS Terms of Service</h1>
                    <p className="text-slate-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold mb-4 text-white">1. SaaS Services and Support</h2>
                        <p className="text-slate-300">
                            Skyline Safety Service ("Provider") grants you a non-exclusive, non-transferable, revocable license to access and use our training and compliance platform ("Service") subject to these Terms. Not withstanding the foregoing, the Service is provided "as is" and "as available".
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold mb-4 text-white">2. Restrictions and Responsibilities</h2>
                        <p className="text-slate-300">
                            You will not, directly or indirectly: reverse engineer, decompile, disassemble or otherwise attempt to discover the source code, object code or underlying structure, ideas, know-how or algorithms relevant to the Services or any software, documentation or data related to the Services. You represent, covenant, and warrant that you will use the Services only in compliance with Provider's standard published policies then in effect (the "Policy") and all applicable laws and regulations.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold mb-4 text-white">3. Confidentiality; Proprietary Rights</h2>
                        <p className="text-slate-300">
                            Each party (the "Receiving Party") understands that the other party (the "Disclosing Party") has disclosed or may disclose business, technical or financial information relating to the Disclosing Party’s business (hereinafter referred to as "Proprietary Information" of the Disclosing Party). Proprietary Information of Provider includes non-public information regarding features, functionality and performance of the Service.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold mb-4 text-white">4. Payment of Fees</h2>
                        <p className="text-slate-300">
                            Customer will pay Provider the then applicable fees described in the Order Form for the Services and Implementation Services in accordance with the terms therein (the "Fees"). If Customer’s use of the Services exceeds the Service Capacity set forth on the Order Form or otherwise requires the payment of additional fees (per the terms of this Agreement), Customer shall be billed for such usage and Customer agrees to pay the additional fees in the manner provided herein.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold mb-4 text-white">5. Term and Termination</h2>
                        <p className="text-slate-300">
                            Subject to proper early termination as provided below, this Agreement is for the Initial Service Term as specified in the Order Form, and shall be automatically renewed for additional periods of the same duration as the Initial Service Term (collectively, the "Term"), unless either party requests termination at least thirty (30) days prior to the end of the then-current term.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold mb-4 text-white">6. Warranty and Disclaimer</h2>
                        <p className="text-slate-300">
                            Provider shall use reasonable efforts consistent with prevailing industry standards to maintain the Services in a manner which minimizes errors and interruptions in the Services. The Services may be temporarily unavailable for scheduled maintenance or for unscheduled emergency maintenance, either by Provider or by third-party providers, or because of other causes beyond Provider’s reasonable control.
                        </p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
}
