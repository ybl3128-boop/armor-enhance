import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBrANfqNFZfcuIFQxmOqAwfOatuPClCh4A',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'armor-enhance.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'armor-enhance',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'armor-enhance.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '433425827481',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:433425827481:web:bfbed6c1bb0f523ddf9a08'
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Firestore 인스턴스
export const db = getFirestore(app);

export default app;
