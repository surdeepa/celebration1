
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Note: In a production environment, these values should be in environment variables.
// Since this is a demo/preview, we use a generic config structure.
// You will need to replace these with your actual Firebase project configuration.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSy-placeholder",
  authDomain: "vpp-celebration.firebaseapp.com",
  projectId: "vpp-celebration",
  storageBucket: "vpp-celebration.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
