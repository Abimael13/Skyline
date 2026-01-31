"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Building2, Users, ExternalLink, Search, Database } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Company {
    id: string;
    name: string;
    code: string;
    managerName: string;
    managerEmail: string;
    seatsTotal: number;
    seatsUsed: number;
    createdAt?: any;
}

export default function AdminCompaniesPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const router = useRouter();

    const fetchCompanies = async () => {
        try {
            setLoading(true);
            const q = query(collection(db, "companies"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);

            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Company[];

            setCompanies(data);
        } catch (error) {
            console.error("Error fetching companies:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const seedMockData = async () => {
        if (!confirm("Add mock companies to database?")) return;

        const mocks = [
            {
                name: "Acme Security Group",
                code: "CORP-ACME99",
                managerName: "Wile E. Coyote",
                managerEmail: "manager@acme.com",
                seatsTotal: 50,
                seatsUsed: 12,
                managerUid: "mock_uid_1"
            },
            {
                name: "Metro Guard Services",
                code: "CORP-METRO1",
                managerName: "Sarah Connor",
                managerEmail: "s.connor@metroguard.net",
                seatsTotal: 25,
                seatsUsed: 24,
                managerUid: "mock_uid_2"
            },
            {
                name: "Global Protection Inc.",
                code: "CORP-GPI777",
                managerName: "John Wick",
                managerEmail: "jwick@global.com",
                seatsTotal: 100,
                seatsUsed: 88,
                managerUid: "mock_uid_3"
            }
        ];

        try {
            for (const company of mocks) {
                await addDoc(collection(db, "companies"), {
                    ...company,
                    createdAt: serverTimestamp()
                });
            }
            alert("Mock companies added!");
            fetchCompanies();
        } catch (e) {
            console.error("Error seeding:", e);
        }
    };

    const filteredCompanies = companies.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.managerEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto text-white">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Corporate Clients</h1>
                    <p className="text-slate-400">Manage B2B accounts and monitor their usage.</p>
                </div>
                <Button onClick={seedMockData} variant="outline" className="gap-2">
                    <Database size={16} /> Seed Mock Data
                </Button>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-navy-900 border border-white/5 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Building2 size={20} /></div>
                        <span className="text-sm text-slate-400">Total Companies</span>
                    </div>
                    <div className="text-3xl font-bold">{companies.length}</div>
                </div>
                <div className="bg-navy-900 border border-white/5 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-500/10 rounded-lg text-green-400"><Users size={20} /></div>
                        <span className="text-sm text-slate-400">Total Seats Sold</span>
                    </div>
                    <div className="text-3xl font-bold">
                        {companies.reduce((acc, c) => acc + (c.seatsTotal || 0), 0)}
                    </div>
                </div>
                <div className="bg-navy-900 border border-white/5 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><Users size={20} /></div>
                        <span className="text-sm text-slate-400">Seats Active</span>
                    </div>
                    <div className="text-3xl font-bold">
                        {companies.reduce((acc, c) => acc + (c.seatsUsed || 0), 0)}
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                    type="text"
                    placeholder="Search companies by name, code, or manager email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-navy-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500"
                />
            </div>

            {/* Table */}
            <div className="bg-navy-900 border border-white/5 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/20 border-b border-white/5 text-slate-400 text-xs uppercase tracking-wide">
                                <th className="p-4 font-semibold">Company</th>
                                <th className="p-4 font-semibold">Access Code</th>
                                <th className="p-4 font-semibold">Manager</th>
                                <th className="p-4 font-semibold">Utilization</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredCompanies.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        No companies found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredCompanies.map((company) => (
                                    <tr key={company.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4">
                                            <div className="font-bold text-white">{company.name}</div>
                                            <div className="text-xs text-slate-500">ID: {company.id}</div>
                                        </td>
                                        <td className="p-4">
                                            <code className="bg-white/5 px-2 py-1 rounded font-mono text-sm text-blue-300">
                                                {company.code}
                                            </code>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm text-white">{company.managerName}</div>
                                            <div className="text-xs text-slate-500">{company.managerEmail}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 w-24 h-1.5 bg-navy-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500 rounded-full"
                                                        style={{ width: `${Math.min(((company.seatsUsed || 0) / company.seatsTotal) * 100, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-slate-400 whitespace-nowrap">
                                                    {company.seatsUsed} / {company.seatsTotal}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <Link href={`/corporate/dashboard?companyId=${company.id}`}>
                                                <Button size="sm" variant="outline" className="h-8 text-xs border-white/10 hover:bg-blue-600 hover:text-white hover:border-transparent">
                                                    Login as Admin <ExternalLink size={12} className="ml-2" />
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
