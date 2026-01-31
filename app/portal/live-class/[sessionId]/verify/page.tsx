"use client";

import { useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Camera, Upload, CheckCircle } from "lucide-react";
import Image from "next/image";

// Placeholder for ID Verification Page
export default function IDVerificationPage(props: { params: Promise<{ sessionId: string }> }) {
    const params = use(props.params);
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        // Simulate upload to Firestore
        setTimeout(() => {
            setLoading(false);
            router.push(`/portal/live-class/${params.sessionId}/waiting`);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-6 text-white">
            <div className="max-w-md w-full text-center space-y-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Verify Your Identity</h1>
                    <p className="text-slate-400">
                        Please upload a clear photo of your government-issued ID to join the class.
                    </p>
                </div>

                <div className="bg-navy-900 border-2 border-dashed border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 transition-colors hover:border-blue-500/50">
                    {image ? (
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                            <Image src={image} alt="ID Preview" fill className="object-cover" />
                            <button
                                onClick={() => setImage(null)}
                                className="absolute top-2 right-2 bg-black/50 p-2 rounded-full hover:bg-black/70 transition-colors"
                            >
                                <span className="text-xs font-bold">Retake</span>
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400">
                                <span className="relative">
                                    <Upload size={32} />
                                </span>
                            </div>
                            <div className="text-center">
                                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                    Upload Photo
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                            </div>
                            <p className="text-xs text-slate-500">
                                JPG, PNG up to 5MB
                            </p>
                        </>
                    )}
                </div>

                <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={!image || loading}
                    onClick={handleSubmit}
                    isLoading={loading}
                >
                    Submit & Join Class
                </Button>
            </div>
        </div>
    );
}
