// ---------------------------------------------------------------------------
// SERVER-ONLY. Do not import this file from any "use client" component.
//
// This is the single source of truth for the FDNY F-89 graduation exam's
// correct answers. It is deliberately kept out of lib/courses.ts (which
// holds the exam QUESTION TEXT/OPTIONS) because lib/courses.ts is imported
// directly by client components (e.g. components/learning/ExamPortal.tsx, to
// render the exam) and gets seeded into the publicly-readable Firestore
// `courses` collection (see firestore.rules: `allow read: if true` on
// /courses/{courseId}, and lib/db.ts's seedCourses()). Anything in
// lib/courses.ts ships to every visitor's browser and is queryable by
// anyone, regardless of auth state or which page they're on. This file does
// not, and must not, end up in either of those places.
//
// Only import this from:
//   - app/api/exam/submit/route.ts (server-side grading - the only place
//     that should ever compute a real, authoritative exam score)
//   - Admin-only API routes that are themselves gated by requireAdmin()
//     (see lib/firebaseAdmin.ts), e.g. app/api/admin/exam-answer-key/route.ts,
//     which lets already-verified admin client UI (the student detail page,
//     the review-call panel) show "what a student got wrong" without ever
//     shipping this file's contents to a browser bundle.
//
// Each answer key is a plain array of correct option indexes, matched BY
// ARRAY INDEX (not by an id) to the corresponding course's exam-type
// module's `content.questions` array in lib/courses.ts. Question 0's answer
// is answerKey[0], question 1's is answerKey[1], and so on. If you edit the
// question order, or add/remove a question, in lib/courses.ts, you MUST
// update the matching array here in the same order - the submit route
// checks the lengths match and will refuse to grade (returning a 500)
// rather than silently mis-grade a mismatched exam.
// ---------------------------------------------------------------------------

export const EXAM_ANSWER_KEYS: Record<string, number[]> = {
    // F-89: Fire and Life Safety Director - Graduation Exam (10 questions).
    // Order matches COURSES["f89-flsd"].modules[...].content.questions
    // (the module with id "graduation-exam", type "exam") in lib/courses.ts.
    "f89-flsd": [1, 2, 2, 2, 1, 1, 1, 2, 0, 2],
};

/**
 * Returns the correct-answer key (array of option indexes, in question
 * order) for a given course's graduation exam, or undefined if this course
 * has no answer key on file. Server-only - see file header.
 */
export function getExamAnswerKey(courseId: string): number[] | undefined {
    return EXAM_ANSWER_KEYS[courseId];
}
