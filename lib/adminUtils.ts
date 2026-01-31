
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
    const clean = sanitizeForFirestore(courseData);
    // Ensure critical fields exist
    return {
        ...clean,
        updatedAt: new Date()
    };
};
