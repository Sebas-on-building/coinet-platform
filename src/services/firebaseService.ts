import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

class FirebaseService {
  private static instance: FirebaseService;
  private app;
  private messaging;

  private constructor() {
    this.app = initializeApp(firebaseConfig);
    this.messaging = getMessaging(this.app);
  }

  static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  async requestNotificationPermission(): Promise<string | null> {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const token = await getToken(this.messaging, {
          vapidKey: process.env.FIREBASE_VAPID_KEY,
        });
        return token;
      }
      return null;
    } catch (error) {
      console.error("Failed to get notification permission:", error);
      return null;
    }
  }

  onMessage(callback: (payload: any) => void) {
    return onMessage(this.messaging, callback);
  }
}

export const firebaseService = FirebaseService.getInstance();
