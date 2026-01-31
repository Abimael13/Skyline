import { Button } from "@/components/ui/Button";
import { Video } from "lucide-react";
import Link from "next/link";

interface LiveClassButtonProps {
    zoomLink?: string;
    sessionId?: string;
}

export function LiveClassButton({ zoomLink, sessionId }: LiveClassButtonProps) {
    // Prefer internal flow if sessionId is provided
    if (sessionId) {
        return (
            <Link href={`/portal/live-class/${sessionId}/verify`}>
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
