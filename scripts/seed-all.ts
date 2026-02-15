
import { seedCourses, seedClassSessions, seedServices, Service } from "@/lib/db";
import { servicesData } from "@/lib/services-data";

// Run this script to populate the database
async function main() {
    console.log("🌱 Starting Database Seed...");

    console.log("1. Seeding Courses...");
    await seedCourses();

    console.log("2. Seeding Sessions...");
    await seedClassSessions();

    console.log("3. Seeding Services...");
    // Map servicesData to match Service interface (remove component, ensure purely JSON data)
    const sanitizedServices: Service[] = servicesData.map(s => ({
        slug: s.slug,
        title: s.title,
        description: s.description,
        fullDescription: s.fullDescription,
        image: s.image,
        iconName: (s as any).icon?.displayName || (s as any).icon?.name || "FileText" // Fallback or extraction
    }));

    await seedServices(sanitizedServices);

    console.log("✅ Basic Seeding Complete!");
    console.log("Check your Firestore Verification now.");
}

main();
