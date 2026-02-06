import admin from "firebase-admin";

const SERVICE_ACCOUNT_KEY = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!SERVICE_ACCOUNT_KEY) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set");
}

const serviceAccount = JSON.parse(SERVICE_ACCOUNT_KEY);

if (!admin.apps.length) {
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!storageBucket) {
    throw new Error("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`,
    storageBucket,
  });
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

export { auth, db, storage };
