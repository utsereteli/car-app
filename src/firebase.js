import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot
} from 'firebase/firestore';

// ============================================================================
// Firebase Configuration
// ============================================================================

const firebaseConfig = {
    apiKey: 'AIzaSyAZmiUfer36w6hHR6LF5uiYR7V9ohbih34',
    authDomain: 'auto-home-7d43f.firebaseapp.com',
    projectId: 'auto-home-7d43f',
    storageBucket: 'auto-home-7d43f.firebasestorage.app',
    messagingSenderId: '261570226754',
    appId: '1:261570226754:web:4dbcaa6a6ead4947491bdb',
    measurementId: 'G-G8JTLHX76C'
};

// ============================================================================
// Firebase Initialization
// ============================================================================

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// ============================================================================
// Exports
// ============================================================================

export {
    db,
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot
};

