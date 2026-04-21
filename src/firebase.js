import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, set, get } from "firebase/database";

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
const itineraryKey =
  (process.env.REACT_APP_ITINERARY_KEY || "itinerary-vancouver").trim();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetryFirebaseError = (error) => {
  const code = error?.code || "";
  return (
    code === "auth/network-request-failed" ||
    code === "database/network-error" ||
    code === "auth/too-many-requests"
  );
};

const withRetry = async (operation, maxAttempts = 3) => {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!shouldRetryFirebaseError(error) || attempt === maxAttempts) {
        throw error;
      }
      await delay(500 * attempt);
    }
  }
  throw lastError;
};

let authModulePromise;

const getAuthModule = async () => {
  if (!authModulePromise) {
    authModulePromise = import("firebase/auth");
  }
  return authModulePromise;
};

const ensureAuthenticated = async () => {
  const { getAuth, signInAnonymously } = await getAuthModule();
  const auth = getAuth(app);

  if (auth.currentUser) {
    return auth.currentUser;
  }

  const credential = await withRetry(() => signInAnonymously(auth));
  return credential.user;
};

export const saveItinerary = async (activities, snapInterval, tripConfig) => {
  await ensureAuthenticated();
  const itineraryRef = ref(database, itineraryKey);
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
  return withRetry(() =>
    set(itineraryRef, {
      activities: activitiesObject,
      snapInterval,
      tripConfig: tripConfig || null,
      lastUpdated: new Date().toISOString(),
    })
  );
};

export const loadItinerary = async () => {
  await ensureAuthenticated();
  const itineraryRef = ref(database, itineraryKey);
  const snapshot = await withRetry(() => get(itineraryRef));
  const data = snapshot.val();
  if (data && data.activities) {
    data.activities = Object.values(data.activities).filter((a) => a && a.id);
  }
  return data;
};
