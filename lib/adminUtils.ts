import { Course, Module } from "@/lib/courses";

/**
 * Recursively strips `correctIndex` off any `content.questions` belonging to
 * an "exam" type module (and any exam-type subModules, e.g. class-session
 * containers). This is a defense-in-depth safety net, not the primary fix:
 * lib/courses.ts's static graduation exam data no longer carries
 * `correctIndex` at all (see lib/examAnswerKeys.ts for where the real answer
 * key lives), and the admin course editor's QuizEditor UI refuses to let an
 * admin set `correctIndex` on an exam-type module in the first place (see
 * components/admin/QuizEditor.tsx's `lockAnswerKey` prop). This function
 * exists as a last line of defense so that even a stale Firestore document,
 * a bug, or a future code change can never cause the exam answer key to be
 * written back into the `courses` collection, which is publicly readable
 * (see firestore.rules: `allow read: if true` on /courses/{courseId}).
 */
function stripExamAnswerKeysFromModules(modules: Module[] | undefined): Module[] | undefined {
    if (!modules) return modules;
    return modules.map((m) => {
        const next: Module = { ...m };
        if (next.type === "exam" && next.content?.questions) {
            next.content = {
                ...next.content,
                questions: next.content.questions.map(({ correctIndex, ...rest }) => rest),
            };
        }
        if (next.subModules) {
            next.subModules = stripExamAnswerKeysFromModules(next.subModules);
        }
        return next;
    });
}

/**
 * Strips any exam answer-key data (see stripExamAnswerKeysFromModules above)
 * out of a course before it's written to Firestore. Use this on every path
 * that writes a Course document to the public `courses` collection - today
 * that's prepareCourseForSave (admin course editor) and the course-seeding
 * flows (lib/db.ts's seedCourses, app/admin/courses/page.tsx's "Seed
 * Database" action).
 */
export function stripExamAnswerKeys(course: Course): Course {
    return {
        ...course,
        modules: stripExamAnswerKeysFromModules(course.modules) || [],
    };
}

/**
 * Recursively removes undefined values from an object or replaces them with null,
 * making the object safe for Firestore consumption.
 */
export const sanitizeForFirestore = (obj: any): any => {
    if (obj === undefined) return null; // or could be removed depending on strictness
    if (obj === null) return null;

    if (Array.isArray(obj)) {
        return obj.map(sanitizeForFirestore);
    }

    if (typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
            const value = obj[key];
            if (value === undefined) {
                // Skip or set to null? 
                // Setting to null is safer to avoid "missing field" issues if expected.
                // But typically clean removal is cleaner. 
                // Let's use clean removal for undefined, but if it's a known required field, it should be handled upstream.
                // For nested structures, removing undefined keys is standard.
                continue;
            }
            newObj[key] = sanitizeForFirestore(value);
        }
        return newObj;
    }

    return obj;
};

// Also export a specific function for strict typing if needed
export const prepareCourseForSave = (courseData: any) => {
    // Strip exam answer-key data BEFORE sanitizing/writing - see
    // stripExamAnswerKeys above for why this must never reach the public
    // `courses` collection.
    const withoutAnswerKeys = stripExamAnswerKeys(courseData as Course);
    const clean = sanitizeForFirestore(withoutAnswerKeys);
    // Ensure critical fields exist
    return {
        ...clean,
        updatedAt: new Date()
    };
};
