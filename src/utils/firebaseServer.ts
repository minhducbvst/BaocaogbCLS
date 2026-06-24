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

  // If GOOGLE_CLOUD_PROJECT is set, we MUST prioritize it over any config file value to prevent PERMISSION_DENIED
  // because the container's service account only has access to its own hosting project.
  if (process.env.GOOGLE_CLOUD_PROJECT) {
    console.log(`Using GOOGLE_CLOUD_PROJECT for Firestore initialization: ${process.env.GOOGLE_CLOUD_PROJECT}`);
    projectId = process.env.GOOGLE_CLOUD_PROJECT;
  } else if (!projectId || projectId === "remixed-project-id") {
    console.warn("No GOOGLE_CLOUD_PROJECT found, using fallback or config projectId.");
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

const LOCAL_DB_DIR = path.join(process.cwd(), "local_db");

function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

function saveLocalDocument(collectionName: string, docId: string, data: any) {
  try {
    const filePath = path.join(LOCAL_DB_DIR, collectionName, `${docId}.json`);
    ensureDirectoryExistence(filePath);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`Failed to save local document "${collectionName}/${docId}":`, err);
  }
}

function deleteLocalDocument(collectionName: string, docId: string) {
  try {
    const filePath = path.join(LOCAL_DB_DIR, collectionName, `${docId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error(`Failed to delete local document "${collectionName}/${docId}":`, err);
  }
}

function loadLocalCollection(collectionName: string): any[] {
  const collectionDir = path.join(LOCAL_DB_DIR, collectionName);
  const items: any[] = [];
  try {
    if (fs.existsSync(collectionDir)) {
      const files = fs.readdirSync(collectionDir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          const content = fs.readFileSync(path.join(collectionDir, file), "utf-8");
          items.push(JSON.parse(content));
        }
      }
    }
  } catch (err) {
    console.error(`Failed to load local collection "${collectionName}":`, err);
  }
  return items;
}

function loadLocalDocument(collectionName: string, docId: string): any {
  try {
    const filePath = path.join(LOCAL_DB_DIR, collectionName, `${docId}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch (err) {
    console.error(`Failed to load local document "${collectionName}/${docId}":`, err);
  }
  return null;
}

export function getItemUniqueId(item: any): string {
  if (item.id) return String(item.id);
  if (item.date) return String(item.date);
  return "doc_" + Math.random().toString(36).substr(2, 9);
}

// Seeds or loads a collection
export async function syncCollection<T>(collectionName: string, memoryArray: T[]): Promise<void> {
  const db = getFirestoreDb();
  let useLocalFallback = !db;

  if (db) {
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
          // Backup locally
          saveLocalDocument(collectionName, id, item);
        }
        await batch.commit();
        console.log(`Successfully seeded collection "${collectionName}" in Firebase.`);
      } else {
        console.log(`Loaded "${collectionName}" from Firestore. Synced ${snapshot.size} items.`);
        // Clear current memory array
        memoryArray.length = 0;
        snapshot.forEach((docSnap: any) => {
          const data = docSnap.data() as T;
          memoryArray.push(data);
          const id = getItemUniqueId(data);
          // Backup locally
          saveLocalDocument(collectionName, id, data);
        });
      }
    } catch (err: any) {
      console.warn(`Error syncing collection "${collectionName}" with Firebase, falling back to local storage:`, err.message || err);
      useLocalFallback = true;
    }
  }

  if (useLocalFallback) {
    const localItems = loadLocalCollection(collectionName);
    if (localItems.length > 0) {
      console.log(`Loaded ${localItems.length} items for "${collectionName}" from local JSON backup fallback.`);
      memoryArray.length = 0;
      memoryArray.push(...(localItems as T[]));
    } else {
      console.log(`No local backup found for "${collectionName}". Initializing with default seeded ${memoryArray.length} items.`);
      // Save the default seeded items to local backup so they persist for next time
      for (const item of memoryArray) {
        const id = getItemUniqueId(item);
        saveLocalDocument(collectionName, id, item);
      }
    }
  }
}

// Specialized sync for a single settings object
export async function syncSettings(collectionName: string, docId: string, defaultSettings: any): Promise<any> {
  const db = getFirestoreDb();
  let useLocalFallback = !db;

  if (db) {
    try {
      const docRef = db.collection(collectionName).doc(docId);
      const snapshot = await docRef.get();
      if (!snapshot.exists) {
        console.log(`Settings document "${collectionName}/${docId}" was not found. Initializing...`);
        await docRef.set(defaultSettings);
        saveLocalDocument(collectionName, docId, defaultSettings);
        return defaultSettings;
      } else {
        console.log(`Loaded settings from Firestore document "${collectionName}/${docId}".`);
        const data = snapshot.data();
        saveLocalDocument(collectionName, docId, data);
        return data;
      }
    } catch (err: any) {
      console.warn(`Error syncing settings "${collectionName}/${docId}" with Firebase, falling back to local storage:`, err.message || err);
      useLocalFallback = true;
    }
  }

  if (useLocalFallback) {
    const localData = loadLocalDocument(collectionName, docId);
    if (localData) {
      console.log(`Loaded settings "${collectionName}/${docId}" from local JSON backup fallback.`);
      return localData;
    } else {
      console.log(`No local backup found for settings "${collectionName}/${docId}". Initializing with defaults.`);
      saveLocalDocument(collectionName, docId, defaultSettings);
      return defaultSettings;
    }
  }
}

// Save a single document (add or update)
export async function saveDocument(collectionName: string, docId: string, data: any): Promise<void> {
  // Always save locally first
  saveLocalDocument(collectionName, docId, data);

  const db = getFirestoreDb();
  if (!db) return;

  try {
    const docRef = db.collection(collectionName).doc(docId);
    await docRef.set(data);
    console.log(`Saved document "${collectionName}/${docId}" to Firebase successfully.`);
  } catch (err: any) {
    console.warn(`Failed to save document "${collectionName}/${docId}" to Firebase, using local storage backup:`, err.message || err);
  }
}

// Delete a single document
export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  // Always delete locally first
  deleteLocalDocument(collectionName, docId);

  const db = getFirestoreDb();
  if (!db) return;

  try {
    const docRef = db.collection(collectionName).doc(docId);
    await docRef.delete();
    console.log(`Deleted document "${collectionName}/${docId}" from Firebase successfully.`);
  } catch (err: any) {
    console.warn(`Failed to delete document "${collectionName}/${docId}" from Firebase:`, err.message || err);
  }
}
