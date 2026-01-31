
import { seedClassSessions } from "@/lib/db";

// Run this script once to populate the database
async function main() {
    console.log("Seeding Database...");
    await seedClassSessions();
    console.log("Done!");
}

main();
