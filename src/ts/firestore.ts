import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

try {
  initializeApp({
    credential: cert(require("../../key.json")),
  });
} catch (e) {
  throw new Error("Provide credentials of your firestore database");
}

const db = getFirestore();

export { db };
