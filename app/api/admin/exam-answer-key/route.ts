import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/firebaseAdmin";
import { getExamAnswerKey } from "@/lib/examAnswerKeys";

// ---------------------------------------------------------------------------
// Admin-only: read the graduation exam's correct-answer key for a course.
//
// This is the ONLY sanctioned way for client ("use client") admin UI to see
// the exam answer key. It exists because two admin screens legitimately need
// to show a student's exam submission alongside the correct answers:
//   - app/admin/students/[studentId]/page.tsx ("View Answers" panel)
//   - components/admin/ReviewCallAdminView.tsx ("What They Missed" panel,
//     used during 1:1 post-exam review calls)
//
// Before this route existed, both of those components imported the answer
// key straight off `COURSES` (lib/courses.ts), which - being a "use client"
// component's dependency - shipped the entire graduation exam answer key
// into that page's JS bundle for anyone who loaded it, admin or not. This
// route fixes that: the answer key now lives only in lib/examAnswerKeys.ts
// (server-only, never imported by a client component) and is only ever
// returned over the network to a caller who presents a valid Firebase ID
// token with the `admin` custom claim (see requireAdmin() in
// lib/firebaseAdmin.ts - the same server-side check every other admin API
// route in this app uses; the client-side "role" check in app/admin/layout.tsx
// is UI-only and is not a security boundary).
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
    try {
        await requireAdmin(req);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
        return NextResponse.json({ error: "Missing courseId query parameter." }, { status: 400 });
    }

    const answerKey = getExamAnswerKey(courseId);

    if (!answerKey) {
        return NextResponse.json({ error: "No answer key found for this course." }, { status: 404 });
    }

    return NextResponse.json({ courseId, answerKey });
}
