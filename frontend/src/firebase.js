import { initializeApp } from "firebase/app";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyB3Ua7U2FdEronNGjajHSEzQMTyNNl1BGQ",
    authDomain: "researchcast-1d8fc.firebaseapp.com",
    projectId: "researchcast-1d8fc",
    storageBucket: "researchcast-1d8fc.firebasestorage.app",
    messagingSenderId: "711801125174",
    appId: "1:711801125174:web:b6bbb075e7a2e6c4809b97",
    measurementId: "G-3MV7VFQ20Q"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Helpers
export const signUp = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const logIn = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logOut = () => signOut(auth);
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);