// Firebase SDK ve Veritabanı Yapılandırması
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
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
    serverTimestamp, 
    increment, 
    runTransaction,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const db = getFirestore(app);

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
    serverTimestamp, 
    increment, 
    runTransaction,
    writeBatch
};
