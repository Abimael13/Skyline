import Link from "next/link";
import Image from "next/image";
import { Shield } from "lucide-react";

export function Footer() {
    return (
        <footer className="bg-navy-950 border-t border-white/5 py-12 px-6">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8 rounded-md overflow-hidden border border-white/10">
                        <Image src="/logo.png" alt="Skyline Safety" fill className="object-cover" />
                    </div>
                    <span className="font-bold text-white">Skyline Safety Service</span>
                </div>

                <div className="text-slate-500 text-sm">
                    © {new Date().getFullYear()} Skyline Safety Service. FDNY Accredited.
                </div>

                <div className="flex gap-6 text-sm text-slate-400">
                    <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                    <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                    <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
                </div>
            </div>
        </footer>
    );
}
