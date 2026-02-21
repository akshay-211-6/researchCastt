import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp,
    orderBy,
    limit
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * Get top documents (e.g. leaderboard scores)
 * @param {string} collectionName 
 * @param {number} limitNum 
 */
export const getTopScores = async (collectionName, limitNum = 10) => {
    try {
        const q = query(collection(db, collectionName), orderBy("score", "desc"), limit(limitNum));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error(`Error fetching leaderboard from ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Add a new document to a collection
 * @param {string} collectionName 
 * @param {object} data 
 */
export const addDocument = async (collectionName, data) => {
    try {
        const docRef = await addDoc(collection(db, collectionName), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return { id: docRef.id, ...data };
    } catch (error) {
        console.error(`Error adding document to ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Get all documents from a collection for a specific user
 * @param {string} collectionName 
 * @param {string} uid 
 */
export const getUserDocuments = async (collectionName, uid) => {
    try {
        const q = query(collection(db, collectionName), where("userId", "==", uid));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error(`Error fetching documents from ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Get a single document by ID
 * @param {string} collectionName 
 * @param {string} id 
 */
export const getDocumentById = async (collectionName, id) => {
    try {
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            throw new Error("Document not found");
        }
    } catch (error) {
        console.error(`Error fetching document ${id} from ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Update an existing document
 * @param {string} collectionName 
 * @param {string} id 
 * @param {object} data 
 */
export const updateDocument = async (collectionName, id, data) => {
    try {
        const docRef = doc(db, collectionName, id);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp(),
        });
        return { id, ...data };
    } catch (error) {
        console.error(`Error updating document ${id} in ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Delete a document by ID
 * @param {string} collectionName 
 * @param {string} id 
 */
export const deleteDocument = async (collectionName, id) => {
    try {
        const docRef = doc(db, collectionName, id);
        await deleteDoc(docRef);
        return id;
    } catch (error) {
        console.error(`Error deleting document ${id} from ${collectionName}:`, error);
        throw error;
    }
};
