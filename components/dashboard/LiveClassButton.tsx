import { Button } from "@/components/ui/Button";
import { Video } from "lucide-react";
import Link from "next/link";

interface LiveClassButtonProps {
    zoomLink?: string;
    courseId?: string;
}

export function LiveClassButton({ zoomLink, courseId }: LiveClassButtonProps) {
    // Prefer the real, ID-verified in-app flow when we have a matched course.
    // This opens the course's curriculum so the student can enter the specific
    // live-class module, which renders the real Firestore-backed
    // LiveClassPlayer (webcam ID capture -> session_attendance queue ->
    // instructor approval -> embedded video), not a standalone placeholder.
    if (courseId) {
        return (
            <Link href={`/portal/courses?expand=${courseId}`}>
                <Button className="bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20 text-white border-none animate-pulse">
                    <Video size={18} className="mr-2" />
                    Join Live Class
                </Button>
            </Link>
        );
    }

    if (!zoomLink) return null;

    return (
        <a href={zoomLink} target="_blank" rel="noopener noreferrer">
            <Button className="bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20 text-white border-none animate-pulse">
                <Video size={18} className="mr-2" />
                Join Live Class
            </Button>
        </a>
    );
}
