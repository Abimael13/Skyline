"use client";

import { useEffect, useState, Suspense } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Button } from "@/components/ui/Button";
import { Loader2, Users, Award, ShieldCheck, Download, Search, Building2, Copy, Database } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

interface Company {
    id: string;
    name: string;
    code: string;
    seatsTotal: number;
    seatsUsed: number;
}

interface Employee {
    id: string;
    name: string;
    email: string;
    progress: number;
    status: "enrolled" | "in-progress" | "passed" | "failed";
    score?: number;
    enrolledAt: string;
}

interface RegistrationCode {
    code: string;
    status: 'active' | 'used';
    createdAt: any;
    usedBy?: string;
    usedAt?: any;
}

function DashboardContent() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [company, setCompany] = useState<Company | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [codes, setCodes] = useState<RegistrationCode[]>([]);
    const [generatingCodes, setGeneratingCodes] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const searchParams = useSearchParams();
    const adminOverrideId = searchParams.get("companyId");

    const fetchData = async (user: any) => {
        try {
            setLoading(true);
            let companyDocSnap;

            if (adminOverrideId) {
                // Admin Override Mode: Fetch specific company
                // (In real app, we would verify user.customClaims.admin === true here)
                const docRef = doc(db, "companies", adminOverrideId);
                companyDocSnap = await getDoc(docRef);
            } else {
                // Manager Mode: Find Company managed by this user
                const q = query(collection(db, "companies"), where("managerUid", "==", user.uid));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) companyDocSnap = querySnapshot.docs[0];
            }

            if (companyDocSnap && companyDocSnap.exists()) {
                const companyData = companyDocSnap.data();
                setCompany({
                    id: companyDocSnap.id,
                    name: companyData.name,
                    code: companyData.code,
                    seatsTotal: companyData.seatsTotal,
                    seatsUsed: companyData.seatsUsed || 0
                });

                // 2. Fetch Employees
                const usersQ = query(collection(db, "users"), where("linkedCompanyId", "==", companyDocSnap.id));
                const usersSnap = await getDocs(usersQ);

                if (!usersSnap.empty) {
                    const fetchedEmployees: Employee[] = usersSnap.docs.map(doc => ({
                        id: doc.id,
                        name: doc.data().displayName || doc.data().email,
                        email: doc.data().email,
                        progress: doc.data().progress || 0,
                        status: doc.data().examStatus || 'enrolled',
                        score: doc.data().examScore,
                        enrolledAt: doc.data().createdAt?.toDate().toLocaleDateString() || 'N/A'
                    }));
                    setEmployees(fetchedEmployees);
                } else {
                    setEmployees([]);
                }
            } else {
                // Not a manager? 
            }

            if (companyDocSnap && companyDocSnap.exists()) {
                // ... (Existing Company Logic) ...

                // 3. Fetch Registration Codes
                try {
                    const codesQ = query(collection(db, "registration_codes"), where("companyId", "==", companyDocSnap.id));
                    const codesSnap = await getDocs(codesQ);
                    const fetchedCodes: RegistrationCode[] = codesSnap.docs.map(doc => doc.data() as RegistrationCode);
                    // Sort by status (active first) then created
                    fetchedCodes.sort((a, b) => {
                        if (a.status === b.status) return 0;
                        return a.status === 'active' ? -1 : 1;
                    });
                    setCodes(fetchedCodes);
                } catch (err) {
                    console.error("Error fetching codes:", err);
                }
            }

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateCodes = async (quantity: number) => {
        if (!company) return;
        setGeneratingCodes(true);
        try {
            const res = await fetch("/api/corporate/generate-codes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    companyId: company.id,
                    quantity
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Refresh Data
            if (auth.currentUser) fetchData(auth.currentUser);
            alert(`Successfully generated ${quantity} new codes.`);

        } catch (error: any) {
            console.error("Failed to generate codes:", error);
            alert(error.message || "Failed to generate codes");
        } finally {
            setGeneratingCodes(false);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                fetchData(user);
            } else {
                // Redirect to login if not auth
                // router.push("/login?redirect=/corporate/dashboard");
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [adminOverrideId]);

    const seedMockEmployees = async () => {
        if (!company) return;
        if (!confirm(`Add mock employees to ${company.name}?`)) return;

        const mocks = [
            {
                displayName: "James Bond",
                email: "007@secret.service",
                progress: 100,
                examStatus: "passed",
                examScore: 98,
                linkedCompanyId: company.id,
                role: "student",
                enrolledCourses: ["f89-flsd"]
            },
            {
                displayName: "Jason Bourne",
                email: "jason@treadstone.ops",
                progress: 45,
                examStatus: "in-progress",
                linkedCompanyId: company.id,
                role: "student",
                enrolledCourses: ["f89-flsd"]
            },
            {
                displayName: "Jack Reacher",
                email: "reacher@investigations.mil",
                progress: 0,
                examStatus: "enrolled",
                linkedCompanyId: company.id,
                role: "student",
                enrolledCourses: ["f89-flsd"]
            },
            {
                displayName: "Ethan Hunt",
                email: "ethan@imf.gov",
                progress: 88,
                examStatus: "failed",
                examScore: 65,
                linkedCompanyId: company.id,
                role: "student",
                enrolledCourses: ["f89-flsd"]
            }
        ];

        try {
            setLoading(true);
            for (const mock of mocks) {
                await addDoc(collection(db, "users"), {
                    ...mock,
                    createdAt: serverTimestamp()
                });
            }
            // Refresh data
            if (auth.currentUser) fetchData(auth.currentUser);
            else window.location.reload(); // Fallback

            alert("Mock employees added!");
        } catch (e) {
            console.error("Error seeding employees:", e);
            setLoading(false);
        }
    };

    const copyCode = () => {
        if (company?.code) {
            navigator.clipboard.writeText(company.code);
            alert("Access code copied to clipboard!");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-navy-950 flex items-center justify-center">
                <Loader2 className="text-blue-500 animate-spin" size={32} />
            </div>
        );
    }

    if (!company) {
        return (
            <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center text-white p-8 text-center">
                <Building2 size={48} className="text-slate-600 mb-4" />
                <h1 className="text-2xl font-bold mb-2">No Corporate Account Found</h1>
                <p className="text-slate-400 mb-6">You don't appear to manage any corporate accounts.</p>
                <Button href="/corporate/enroll">Register Your Company</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-navy-950 text-white font-sans">
            {/* Navbar */}
            <header className="border-b border-white/5 bg-navy-900/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8 rounded overflow-hidden">
                            <Image src="/logo.png" alt="Skyline" fill className="object-cover" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">Skyline <span className="text-blue-500">Corporate Portal</span></span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-medium text-white">{company.name}</p>
                            <p className="text-xs text-slate-400">Manager Access</p>
                        </div>
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                            {company.name.charAt(0)}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                {/* Stats Overview */}
                <div className="grid md:grid-cols-4 gap-4">
                    <div className="bg-navy-900 border border-white/10 rounded-xl p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-blue-600/10 rounded-lg text-blue-400"><Users size={20} /></div>
                            <span className="text-xs font-mono text-slate-500 bg-white/5 px-2 py-1 rounded">Total Seats</span>
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-1">{company.seatsTotal}</h3>
                        <p className="text-sm text-slate-500">Purchased Capacity</p>
                    </div>

                    <div className="bg-navy-900 border border-white/10 rounded-xl p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-green-600/10 rounded-lg text-green-400"><ShieldCheck size={20} /></div>
                            <span className="text-xs font-mono text-slate-500 bg-white/5 px-2 py-1 rounded">Active</span>
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-1">{company.seatsUsed}</h3>
                        <p className="text-sm text-slate-500">{Math.round((company.seatsUsed / company.seatsTotal) * 100)}% Utilization</p>
                    </div>

                    <div className="bg-navy-900 border border-white/10 rounded-xl p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-purple-600/10 rounded-lg text-purple-400"><Award size={20} /></div>
                            <span className="text-xs font-mono text-slate-500 bg-white/5 px-2 py-1 rounded">Certified</span>
                        </div>
                        {/* Mock Calculation for Demo */}
                        <h3 className="text-3xl font-bold text-white mb-1">{employees.filter(e => e.status === 'passed').length}</h3>
                        <p className="text-sm text-slate-500">Officers Graduated</p>
                    </div>

                    {/* Invite Card */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 text-white shadow-lg overflow-hidden relative">
                        <div className="relative z-10">
                            <h4 className="font-bold text-lg mb-2">Invite Officers</h4>
                            <p className="text-blue-100 text-sm mb-4">Share this code to enroll staff instantly.</p>
                            <div className="flex gap-2">
                                <code className="bg-black/20 px-3 py-1.5 rounded font-mono font-bold text-lg">{company.code}</code>
                                <button onClick={copyCode} className="p-2 hover:bg-white/10 rounded transition-colors"><Copy size={18} /></button>
                            </div>
                        </div>
                        <div className="absolute -bottom-4 -right-4 text-white/10 rotate-12">
                            <ShieldCheck size={100} />
                        </div>
                    </div>
                </div>

                {/* Registration Codes Section */}
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left: Generate Tools */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-navy-900 border border-white/10 rounded-xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Database size={18} className="text-blue-500" /> Generate Codes
                            </h3>
                            <p className="text-sm text-slate-400 mb-6">
                                Generate unique one-time use codes for your students. Each student needs one code.
                            </p>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <Button
                                    variant="outline"
                                    onClick={() => handleGenerateCodes(1)}
                                    disabled={generatingCodes}
                                    className="border-white/10 hover:bg-white/5"
                                >
                                    + 1 Code
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleGenerateCodes(5)}
                                    disabled={generatingCodes}
                                    className="border-white/10 hover:bg-white/5"
                                >
                                    + 5 Codes
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleGenerateCodes(10)}
                                    disabled={generatingCodes}
                                    className="border-white/10 hover:bg-white/5"
                                >
                                    + 10 Codes
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleGenerateCodes(25)}
                                    disabled={generatingCodes}
                                    className="border-white/10 hover:bg-white/5"
                                >
                                    + 25 Codes
                                </Button>
                            </div>

                            {generatingCodes && (
                                <p className="text-xs text-center text-blue-400 animate-pulse">Generating codes...</p>
                            )}
                        </div>

                        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 text-white shadow-lg overflow-hidden relative">
                            <div className="relative z-10">
                                <h4 className="font-bold text-lg mb-2">Legacy Shared Code</h4>
                                <p className="text-blue-100 text-sm mb-4">This code can still be used by anyone to join your organization.</p>
                                <div className="flex gap-2">
                                    <code className="bg-black/20 px-3 py-1.5 rounded font-mono font-bold text-lg">{company.code}</code>
                                    <button onClick={copyCode} className="p-2 hover:bg-white/10 rounded transition-colors"><Copy size={18} /></button>
                                </div>
                            </div>
                            <div className="absolute -bottom-4 -right-4 text-white/10 rotate-12">
                                <ShieldCheck size={100} />
                            </div>
                        </div>
                    </div>

                    {/* Right: Codes List */}
                    <div className="lg:col-span-2">
                        <div className="bg-navy-900 border border-white/10 rounded-2xl overflow-hidden shadow-xl h-full flex flex-col">
                            <div className="p-6 border-b border-white/5">
                                <h3 className="text-xl font-bold text-white">Active Registration Codes</h3>
                                <p className="text-slate-400 text-sm">Distribute these codes to your students.</p>
                            </div>
                            <div className="flex-1 overflow-y-auto max-h-[500px] p-0">
                                {codes.length === 0 ? (
                                    <div className="p-12 text-center text-slate-500">
                                        No codes generated yet. Use the tools on the left to create codes.
                                    </div>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 bg-navy-900 z-10 shadow-sm">
                                            <tr className="border-b border-white/5">
                                                <th className="p-4 text-xs font-semibold text-slate-400 uppercase">Code</th>
                                                <th className="p-4 text-xs font-semibold text-slate-400 uppercase">Status</th>
                                                <th className="p-4 text-xs font-semibold text-slate-400 uppercase text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {codes.map((c) => (
                                                <tr key={c.code} className="group hover:bg-white/[0.02]">
                                                    <td className="p-4 font-mono text-sm text-white select-all">
                                                        {c.code}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${c.status === 'active'
                                                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                                : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                                                            }`}>
                                                            {c.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        {c.status === 'active' && (
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(c.code);
                                                                    alert("Code copied!");
                                                                }}
                                                                className="text-blue-400 hover:text-white text-xs font-medium"
                                                            >
                                                                Copy
                                                            </button>
                                                        )}
                                                        {c.status === 'used' && (
                                                            <span className="text-xs text-slate-600">Redeemed</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Employee Table */}
                <div className="bg-navy-900 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                    <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-white">Security Roster</h3>
                                <p className="text-slate-400 text-sm">Manage enrolled officers and certifications.</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={seedMockEmployees} className="hidden md:flex gap-2 border-white/10 text-slate-400 hover:text-white">
                                <Database size={14} /> Seed Mock
                            </Button>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-navy-950 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 w-full md:w-64"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Officer Name</th>
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Progress</th>
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Exam Score</th>
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {employees.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-500">
                                            No employees have enrolled yet. Share your code <strong>{company.code}</strong> to get started.
                                            <br className="mb-2" />
                                            <span onClick={seedMockEmployees} className="text-blue-500 hover:underline cursor-pointer text-xs">(Or click here to Seed Mock Data)</span>
                                        </td>
                                    </tr>
                                ) : (
                                    employees.map((emp) => (
                                        <tr key={emp.id} className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="p-4">
                                                <div className="font-medium text-white">{emp.name}</div>
                                                <div className="text-xs text-slate-500">{emp.email}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium border ${emp.status === 'passed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                    emp.status === 'in-progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                        emp.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                            'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                                    }`}>
                                                    {emp.status === 'passed' ? 'Certified' :
                                                        emp.status === 'in-progress' ? 'In Training' :
                                                            emp.status === 'failed' ? 'Failed' : 'Enrolled'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="w-24 h-1.5 bg-navy-800 rounded-full overflow-hidden mb-1">
                                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${emp.progress}%` }} />
                                                </div>
                                                <div className="text-xs text-slate-500">{emp.progress}%</div>
                                            </td>
                                            <td className="p-4">
                                                {emp.score ? (
                                                    <span className={`font-mono font-bold ${emp.score >= 70 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {emp.score}%
                                                    </span>
                                                ) : <span className="text-slate-600">-</span>}
                                            </td>
                                            <td className="p-4 text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 text-slate-400 hover:text-white"
                                                    disabled={emp.status !== 'passed'}
                                                >
                                                    <Download size={16} className="mr-2" /> Diploma
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function CorporateDashboard() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-navy-950 flex items-center justify-center">
                <Loader2 className="text-blue-500 animate-spin" size={32} />
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}
