// Run with:
// node populate-blank-trip.js itinerary-finger-lakes-2026 "dan's bachelor trip - finger lakes" 2026-04-23 5

const { initializeApp, getApps, getApp } = require("firebase/app");
const { getDatabase, ref, set } = require("firebase/database");
const { getAuth, signInAnonymously } = require("firebase/auth");

const firebaseConfig = {
  apiKey: "AIzaSyAaD0SfuCz1YOeFl2wiXfOBQerLAGgOxfY",
  authDomain: "itinerary-planner-f85a6.firebaseapp.com",
  databaseURL: "https://itinerary-planner-f85a6-default-rtdb.firebaseio.com",
  projectId: "itinerary-planner-f85a6",
  storageBucket: "itinerary-planner-f85a6.firebasestorage.app",
  messagingSenderId: "750098443724",
  appId: "1:750098443724:web:50639a06b6f66d098f8169",
};

const [, , itineraryKey, tripName, startDate, numDaysArg] = process.argv;
const numDays = Number(numDaysArg);

if (!itineraryKey || !tripName || !startDate || !numDaysArg || Number.isNaN(numDays)) {
  console.error(
    'Usage: node populate-blank-trip.js <itinerary-key> "<trip-name>" <start-date YYYY-MM-DD> <num-days>'
  );
  process.exit(1);
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const database = getDatabase(app);
const auth = getAuth(app);

async function populateBlankTrip() {
  await signInAnonymously(auth);

  const itineraryRef = ref(database, itineraryKey);
  await set(itineraryRef, {
    activities: {},
    snapInterval: 15,
    tripConfig: {
      tripName,
      startDate,
      numDays,
    },
    lastUpdated: new Date().toISOString(),
  });

  console.log(`✅ Created blank trip at ${itineraryKey}`);
  console.log(
    JSON.stringify(
      {
        tripName,
        startDate,
        numDays,
      },
      null,
      2
    )
  );
}

populateBlankTrip().catch((err) => {
  console.error("Failed to create blank trip:", err);
  process.exit(1);
});
