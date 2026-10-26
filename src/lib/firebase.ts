import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  projectId: "homesoqure",
  appId: "1:9436949408:web:9b0f6e6105fa3f987812c5",
  storageBucket: "homesoqure.firebasestorage.app",
  apiKey: "AIzaSyAyklP2BP59WydIkSDtQTk-fW4k0qKECNI",
  authDomain: "homesoqure.firebaseapp.com",
  messagingSenderId: "9436949408",
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

