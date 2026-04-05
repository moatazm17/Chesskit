import type { FirebaseApp } from "firebase/app";

const firebaseConfig = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  ? {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    }
  : undefined;

let _app: FirebaseApp | undefined;

async function getApp(): Promise<FirebaseApp | undefined> {
  if (_app) return _app;
  if (!firebaseConfig) return undefined;
  const { initializeApp } = await import("firebase/app");
  _app = initializeApp(firebaseConfig);
  return _app;
}

export const logAnalyticsEvent = async (
  eventName: string,
  eventParams?: Record<string, unknown>
) => {
  if (typeof window === "undefined") return;
  if (window.location.hostname === "localhost") return;

  const app = await getApp();
  if (!app) return;

  const { getAnalytics, isSupported, logEvent } = await import("firebase/analytics");
  const supported = await isSupported();
  if (!supported) return;

  const analytics = getAnalytics(app);
  logEvent(analytics, eventName, eventParams);
};

export const submitFeedback = async (message: string, trigger: string) => {
  const app = await getApp();
  if (!app) return;
  try {
    const { getFirestore, collection, addDoc } = await import("firebase/firestore");
    const db = getFirestore(app);
    await addDoc(collection(db, "feedback"), {
      message,
      trigger,
      timestamp: new Date().toISOString(),
      platform: navigator.userAgent,
    });
  } catch {
    // silent fail
  }
};
