"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

export function Hero() {
    return (
        <section className="relative pt-10 pb-12 lg:pt-14 lg:pb-20 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

            <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-400/20 backdrop-blur-sm max-w-3xl mx-auto"
                >
                    <p className="text-blue-100 text-sm md:text-base leading-relaxed">
                        <span className="font-bold text-blue-300 block sm:inline mr-2">Please note:</span>
                        Our FDNY F-89 Certificate of Fitness course will be available once we receive official accreditation from the FDNY. Stay tuned for updates, and feel free to reach out if you have any questions. We look forward to providing you with comprehensive, live virtual training soon!
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex justify-center relative -mb-12 md:-mb-24"
                >
                    {/* Glow effect */}
                    <motion.div
                        className="absolute inset-0 bg-blue-500/30 blur-3xl rounded-full"
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.6, 0.3]
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />

                    {/* Floating Logo */}
                    <motion.div
                        animate={{ y: [-10, 10, -10] }}
                        transition={{
                            duration: 6,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="relative w-96 h-96 md:w-[700px] md:h-[700px] -mt-12 md:-mt-20"
                    >
                        <Image src="/logo.png" alt="Skyline Safety Services" fill className="object-contain object-top" />
                    </motion.div>
                </motion.div>


                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6"
                >
                    Your Fire & Life Safety Director <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                        success begins here!
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
                >
                    Equipping You With the Necessary Skills and Knowledge to Excel as a Fire & Life Safety Director!
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                >
                    <Button href="/courses" size="lg" className="min-w-[160px]">
                        Get Started
                    </Button>
                </motion.div>
            </div>
        </section>
    );
}
