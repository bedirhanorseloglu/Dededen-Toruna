import { initializeApp } from "firebase/app";
import { 
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot, 
    query, 
    where, 
    orderBy, 
    limit,
    serverTimestamp, 
    increment, 
    runTransaction,
    writeBatch
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAI7rGoDkzWw07dlcfHnv1HiBZA051D95Q",
  authDomain: "dededen-toruna.firebaseapp.com",
  projectId: "dededen-toruna",
  storageBucket: "dededen-toruna.firebasestorage.app",
  messagingSenderId: "423617609086",
  appId: "1:423617609086:web:82052d8c63c1fc559d872f",
  measurementId: "G-QDJYMNCLYX"
};

const app = initializeApp(firebaseConfig);

// Spark Plan Optimizasyonu: Kalıcı IndexedDB önbelleği sayesinde tekrarlı okumalar kotadan düşmez
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

export { 
    app, 
    db, 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot, 
    query, 
    where, 
    orderBy, 
    limit,
    serverTimestamp, 
    increment, 
    runTransaction,
    writeBatch
};
