import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, set, get } from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAaD0SfuCz1YOeFl2wiXfOBQerLAGgOxfY",
  authDomain: "itinerary-planner-f85a6.firebaseapp.com",
  databaseURL: "https://itinerary-planner-f85a6-default-rtdb.firebaseio.com",
  projectId: "itinerary-planner-f85a6",
  storageBucket: "itinerary-planner-f85a6.firebasestorage.app",
  messagingSenderId: "750098443724",
  appId: "1:750098443724:web:50639a06b6f66d098f8169",
  measurementId: "G-BKNQZ5LFYX",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const database = getDatabase(app);
const auth = getAuth(app);

// Sign in anonymously once at module load; both save/load await this promise
const authReady = signInAnonymously(auth);

export const saveItinerary = async (activities, snapInterval, tripConfig) => {
  await authReady;
  const itineraryRef = ref(database, "itinerary-vancouver");
  if (!Array.isArray(activities)) {
    console.error("Activities is not an array!", activities);
    return;
  }
  const activitiesObject = {};
  activities.forEach((activity) => {
    if (activity && activity.id) {
      activitiesObject[activity.id] = activity;
    }
  });
  return set(itineraryRef, {
    activities: activitiesObject,
    snapInterval,
    tripConfig: tripConfig || null,
    lastUpdated: new Date().toISOString(),
  });
};

export const loadItinerary = async () => {
  await authReady;
  const itineraryRef = ref(database, "itinerary-vancouver");
  const snapshot = await get(itineraryRef);
  const data = snapshot.val();
  if (data && data.activities) {
    data.activities = Object.values(data.activities).filter((a) => a && a.id);
  }
  return data;
};
