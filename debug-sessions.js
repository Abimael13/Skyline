
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

// Config
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "PLACEHOLDER_KEY",
    authDomain: "skyline-safety-services.firebaseapp.com",
    projectId: "skyline-safety-services",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listSessions() {
    console.log("Listing Sessions...");
    const snapshot = await getDocs(collection(db, "sessions"));
    if (snapshot.empty) {
        console.log("No sessions found.");
    } else {
        snapshot.forEach(doc => {
            console.log(doc.id, "=>", doc.data());
        });
    }
}

listSessions();
