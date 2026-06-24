import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

let dbInstance: any = null;

export function getFirebaseConfig() {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
  } catch (err) {
    console.warn("Failed to read firebase-applet-config.json:", err);
  }
  return null;
}

export function getFirestoreDb() {
  if (dbInstance) return dbInstance;

  // Prioritize environment variables for production environments (Vercel/Render/Railway)
  let projectId = process.env.FIREBASE_PROJECT_ID;
  let dbId = process.env.FIREBASE_DATABASE_ID;

  // Fallback to local config file if env vars are not set (local dev in AI Studio)
  const config = getFirebaseConfig();
  if (config) {
    if (!projectId && config.projectId) {
      projectId = config.projectId;
    }
    if (!dbId && config.firestoreDatabaseId) {
      dbId = config.firestoreDatabaseId;
    }
  }

  // If projectId is "remixed-project-id" or not set, check GOOGLE_CLOUD_PROJECT as fallback
  if (!projectId || projectId === "remixed-project-id") {
    if (process.env.GOOGLE_CLOUD_PROJECT) {
      console.log(`Overriding fallback/placeholder project ID with GOOGLE_CLOUD_PROJECT: ${process.env.GOOGLE_CLOUD_PROJECT}`);
      projectId = process.env.GOOGLE_CLOUD_PROJECT;
    }
  }

  // Final fallback to default for dbId
  if (!dbId) {
    dbId = "(default)";
  }

  if (!projectId) {
    console.warn("Firebase config is missing or incomplete (No FIREBASE_PROJECT_ID found in env or local file). Using in-memory fallback.");
    return null;
  }

  try {
    let app;
    if (getApps().length === 0) {
      const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (serviceAccountVar) {
        try {
          const serviceAccount = JSON.parse(serviceAccountVar);
          app = initializeApp({
            credential: cert(serviceAccount),
            projectId: projectId
          });
          console.log("Firebase App initialized using FIREBASE_SERVICE_ACCOUNT credential.");
        } catch (jsonErr) {
          console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON. Falling back to default initialization:", jsonErr);
          app = initializeApp({
            projectId: projectId,
          });
        }
      } else {
        app = initializeApp({
          projectId: projectId,
        });
      }
    } else {
      app = getApp();
    }
    
    dbInstance = getFirestore(app, dbId);
    console.log(`Firebase Firestore initialized successfully via firebase-admin with Project ID: ${projectId}, DB ID: ${dbId}`);
    return dbInstance;
  } catch (err) {
    console.error("Failed to initialize Firebase Firestore Admin SDK:", err);
    return null;
  }
}

export function getItemUniqueId(item: any): string {
  if (item.id) return String(item.id);
  if (item.date) return String(item.date);
  return "doc_" + Math.random().toString(36).substr(2, 9);
}

// Seeds or loads a collection
export async function syncCollection<T>(collectionName: string, memoryArray: T[]): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    const colRef = db.collection(collectionName);
    const snapshot = await colRef.get();
    if (snapshot.empty) {
      console.log(`Firestore collection "${collectionName}" is empty. Seeding with ${memoryArray.length} items...`);
      // Use batches for seeding efficiently
      const batch = db.batch();
      for (const item of memoryArray) {
        const id = getItemUniqueId(item);
        const docRef = colRef.doc(id);
        batch.set(docRef, item as any);
      }
      await batch.commit();
      console.log(`Successfully seeded collection "${collectionName}" in Firebase.`);
    } else {
      console.log(`Loaded "${collectionName}" from Firestore. Synced ${snapshot.size} items.`);
      // Clear current memory array
      memoryArray.length = 0;
      snapshot.forEach((docSnap: any) => {
        memoryArray.push(docSnap.data() as T);
      });
    }
  } catch (err) {
    console.error(`Error syncing collection "${collectionName}" with Firebase:`, err);
  }
}

// Specialized sync for a single settings object
export async function syncSettings(collectionName: string, docId: string, defaultSettings: any): Promise<any> {
  const db = getFirestoreDb();
  if (!db) return defaultSettings;

  try {
    const docRef = db.collection(collectionName).doc(docId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      console.log(`Settings document "${collectionName}/${docId}" was not found. Initializing...`);
      await docRef.set(defaultSettings);
      return defaultSettings;
    } else {
      console.log(`Loaded settings from Firestore document "${collectionName}/${docId}".`);
      return snapshot.data();
    }
  } catch (err) {
    console.error(`Error syncing settings "${collectionName}/${docId}":`, err);
    return defaultSettings;
  }
}

// Save a single document (add or update)
export async function saveDocument(collectionName: string, docId: string, data: any): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    const docRef = db.collection(collectionName).doc(docId);
    await docRef.set(data);
    console.log(`Saved document "${collectionName}/${docId}" to Firebase successfully.`);
  } catch (err) {
    console.error(`Error saving document "${collectionName}/${docId}":`, err);
  }
}

// Delete a single document
export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    const docRef = db.collection(collectionName).doc(docId);
    await docRef.delete();
    console.log(`Deleted document "${collectionName}/${docId}" from Firebase successfully.`);
  } catch (err) {
    console.error(`Error deleting document "${collectionName}/${docId}":`, err);
  }
}
