"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    User,
    signOut as firebaseSignOut
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

interface AuthContextType {
    user: User | null;
    role: "admin" | "student" | null;
    loading: boolean;
    enrolledCourses: string[];
    enrolledSessions: string[]; // New field
    courseProgress: Record<string, { completedModules: string[] }>; // Added courseProgress
    examResults: Record<string, any>; // [courseId]: { status, score, diplomaUrl }
    enrollInCourse: (courseId: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    loading: true,
    enrolledCourses: [],
    enrolledSessions: [],
    courseProgress: {}, // Default
    examResults: {},
    enrollInCourse: async () => { },
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<"admin" | "student" | null>(null);
    const [loading, setLoading] = useState(true);
    const [enrolledCourses, setEnrolledCourses] = useState<string[]>([]);
    const [enrolledSessions, setEnrolledSessions] = useState<string[]>([]);
    const [courseProgress, setCourseProgress] = useState<Record<string, { completedModules: string[] }>>({});
    const [examResults, setExamResults] = useState<Record<string, any>>({});
    const router = useRouter();


    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            setUser(user);

            if (user) {
                // Optimistic Load
                const demoEnrollments = JSON.parse(sessionStorage.getItem("demoEnrollments") || "[]");
                if (demoEnrollments.length > 0) setEnrolledCourses(demoEnrollments);

                // Real-time listener for User Profile
                const userDocRef = doc(db, "users", user.uid);

                // We use onSnapshot to handle race conditions during Signup
                const unsubscribeSnapshot = onSnapshot(userDocRef, async (docSnap: any) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();

                        // Set Role
                        setRole(data.role || "student");

                        // Merge session data with DB data
                        const dbCourses = data.enrolledCourses || [];
                        const merged = Array.from(new Set([...demoEnrollments, ...dbCourses]));
                        setEnrolledCourses(merged);

                        // Set Enrolled Sessions
                        setEnrolledSessions(data.enrolledSessions || []);

                        // Set Course Progress
                        setCourseProgress(data.courseProgress || {});

                        // Set Exam Results
                        setExamResults(data.examResults || {});

                        setLoading(false);
                    } else {
                        // Profile doesn't exist yet? 
                        // It might be being created by SignupPage, so we wait or create default.
                        // Let's create default ONLY if we are sure it's not a race (e.g., slight delay)
                        // OR: Just set default state without writing to DB, to avoid overwriting Signup's work
                        setRole("student");
                        setLoading(false);

                        // Safety: If it really doesn't exist after 2 sec, verify?
                        // For now, assume SignupPage or Login logic handles creation.
                    }
                }, (error: any) => {
                    console.warn("Auth Snapshot Error (Offline?):", error);
                    setLoading(false);
                });

                return () => unsubscribeSnapshot();
            } else {
                setEnrolledCourses([]);
                setEnrolledSessions([]);
                setCourseProgress({});
                setRole(null);
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    const enrollInCourse = async (courseId: string) => {
        if (!user) {
            console.error("Cannot enroll: No user logged in");
            return;
        }

        console.log("Enrolling in course:", courseId);

        // 1. OPTIMISTIC UPDATE: Update UI state immediately
        setEnrolledCourses(prev => {
            const newState = [...prev, courseId];
            return Array.from(new Set(newState));
        });

        // 2. PERSISTENCE: Save to session storage immediately (survives refresh)
        try {
            const currentSession = JSON.parse(sessionStorage.getItem("demoEnrollments") || "[]");
            const newSession = Array.from(new Set([...currentSession, courseId]));
            sessionStorage.setItem("demoEnrollments", JSON.stringify(newSession));
        } catch (e) {
            console.error("Session storage failed", e);
        }

        // 3. CLOUD SYNC: Attempt to save to Firestore in background
        try {
            const userDocRef = doc(db, "users", user.uid);
            await setDoc(userDocRef, {
                enrolledCourses: arrayUnion(courseId)
            }, { merge: true });
            console.log("Firestore updated successfully");
        } catch (error) {
            console.error("Firestore write failed (offline?), but local state is saved:", error);
            // No need to revert state because we want to keep the "enrolled" status for the session
        }
    };

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            setRole(null);
            router.push("/login");
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, role, loading, enrolledCourses, enrolledSessions, courseProgress, examResults, enrollInCourse, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
