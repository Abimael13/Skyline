import { db } from "@/lib/firebase";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    setDoc,
    getDoc,
    arrayUnion
} from "firebase/firestore";
import { COURSES, Course } from "@/lib/courses";
import { User } from "firebase/auth";

// Collection References
const COURSES_COLLECTION = "courses";
const SESSIONS_COLLECTION = "sessions";

export interface ClassSession {
    id: string; // e.g., 'flsd-feb-10-2026'
    startDate: string; // ISO String
    endDate: string; // ISO String
    daySchedule: string; // e.g., "Mon-Fri"
    globalCapacity: number; // 25
    enrolledCount: number;
    productIds: string[]; // ['f89-flsd', 'n85', 'z89']
    isLiveSessionLocked?: boolean; // New field for gating
    courseId?: string; // Foreign key to Course ID
    status?: 'open' | 'full' | 'completed' | 'cancelled';
}

// Initial Seed Data for Sessions
const INITIAL_SESSIONS: ClassSession[] = [
    {
        id: "flsd-feb-10-2026",
        startDate: "2026-02-10T09:00:00.000Z",
        endDate: "2026-02-14T16:00:00.000Z",
        daySchedule: "Mon-Fri, 9:00 AM - 4:00 PM",
        globalCapacity: 25,
        enrolledCount: 0,
        productIds: ["f89-flsd", "n85", "z89"],
        isLiveSessionLocked: true
    },
    {
        id: "flsd-feb-24-2026",
        startDate: "2026-02-24T09:00:00.000Z",
        endDate: "2026-02-28T16:00:00.000Z",
        daySchedule: "Mon-Fri, 9:00 AM - 4:00 PM",
        globalCapacity: 25,
        enrolledCount: 12, // Partially filled for demo
        productIds: ["f89-flsd", "n85", "z89"],
        isLiveSessionLocked: true
    },
    {
        id: "flsd-mar-10-2026",
        startDate: "2026-03-10T09:00:00.000Z",
        endDate: "2026-03-14T16:00:00.000Z",
        daySchedule: "Mon-Fri, 9:00 AM - 4:00 PM",
        globalCapacity: 25,
        enrolledCount: 23, // Almost full for demo
        productIds: ["f89-flsd", "n85", "z89"],
        isLiveSessionLocked: true
    }
];

// Fetch all courses (Fallback to static if DB is empty)
export async function getAllCourses(): Promise<Course[]> {
    try {
        const querySnapshot = await getDocs(collection(db, COURSES_COLLECTION));
        const courses: Course[] = [];
        querySnapshot.forEach((doc) => {
            courses.push(doc.data() as Course);
        });

        if (courses.length === 0) {
            console.log("No courses found in DB. Returning static data.");
            return COURSES;
        }

        return courses;
    } catch (error) {
        console.warn("Error fetching courses:", error);
        return COURSES; // Fallback
    }
}

// Fetch single course
export async function getCourseById(courseId: string): Promise<Course | undefined> {
    try {
        const docRef = doc(db, COURSES_COLLECTION, courseId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as Course;
        } else {
            return COURSES.find(c => c.id === courseId);
        }
    } catch (error) {
        console.warn("Error fetching course:", error);
        return COURSES.find(c => c.id === courseId);
    }
}

// Update Upcoming Dates
export async function updateCourseDates(courseId: string, dates: string[]) {
    try {
        const docRef = doc(db, COURSES_COLLECTION, courseId);
        await updateDoc(docRef, {
            upcomingDates: dates
        });
        return true;
    } catch (error) {
        console.error("Error updating dates:", error);
        return false;
    }
}

// Seed the Database (One-time use)
export async function seedCourses() {
    try {
        for (const course of COURSES) {
            await setDoc(doc(db, COURSES_COLLECTION, course.id), course);
        }
        console.log("Database seeded successfully.");
        return true;
    } catch (error) {
        console.error("Error seeding database:", error);
        return false;
    }
}

// Seed Class Sessions
export async function seedClassSessions() {
    try {
        for (const session of INITIAL_SESSIONS) {
            await setDoc(doc(db, SESSIONS_COLLECTION, session.id), session);
        }
        console.log("Class sessions seeded successfully.");
        return true;
    } catch (error) {
        console.error("Error seeding class sessions:", error);
        return false;
    }
}

// ------------------------------------------------------------------
// SERVICES (Service Editor)
// ------------------------------------------------------------------
const SERVICES_COLLECTION = "services";

export interface Service {
    slug: string;
    title: string;
    description: string;
    fullDescription: string;
    image: string;
    iconName?: string; // Storing the icon name (e.g. "FileText")
}

// Fetch all services
export async function getAllServices(): Promise<Service[]> {
    try {
        const snapshot = await getDocs(collection(db, SERVICES_COLLECTION));
        const services: Service[] = [];
        snapshot.forEach((doc) => {
            services.push(doc.data() as Service);
        });

        // If empty, return static data mapped to Service interface (fallback)
        if (services.length === 0) {
            return []; // Caller handles fallback or we seed
        }
        return services;
    } catch (error) {
        console.error("Error fetching services:", error);
        return [];
    }
}

// Fetch service by slug
export async function getServiceBySlug(slug: string): Promise<Service | undefined> {
    try {
        const docRef = doc(db, SERVICES_COLLECTION, slug);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as Service;
        }
        return undefined;
    } catch (error) {
        console.error("Error fetching service by slug:", error);
        return undefined;
    }
}

// Update service
export async function updateService(slug: string, data: Partial<Service>) {
    try {
        const docRef = doc(db, SERVICES_COLLECTION, slug);
        await updateDoc(docRef, data);
        return true;
    } catch (error) {
        console.error("Error updating service:", error);
        return false;
    }
}

// Seed Services Helper
// Note: This expects an array of Service objects (converted from static data)
export async function seedServices(services: Service[]) {
    try {
        for (const service of services) {
            await setDoc(doc(db, SERVICES_COLLECTION, service.slug), service);
        }
        console.log("Services seeded successfully.");
        return true;
    } catch (error) {
        console.error("Error seeding services:", error);
        return false;
    }
}

// ------------------------------------------------------------------
// PROGRESS TRACKING
// ------------------------------------------------------------------
export async function markModuleCompleted(userId: string, courseId: string, moduleId: string | number) {
    try {
        const userRef = doc(db, "users", userId);
        const progressPath = `courseProgress.${courseId}.completedModules`;

        // Use updateDoc for arrayUnion to work correctly on existing paths
        // We assume the user document exists.
        // If courseProgress map doesn't exist, updateDoc might fail with some SDKs, but dot notation usually handles "intermediate" map creation if the doc exists.
        // SAFE BET: Use setDoc with merge for the deep structure.

        await setDoc(userRef, {
            courseProgress: {
                [courseId]: {
                    completedModules: arrayUnion(moduleId)
                }
            }
        }, { merge: true });

        return true;
    } catch (error) {
        console.error("Error marking module complete:", error);
        return false;
    }
}
