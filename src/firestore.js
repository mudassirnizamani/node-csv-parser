const { cert, initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

try {
  initializeApp({
    credential: cert(require("../key.json")),
  });
} catch (e) {
  throw new Error("Provide credentials of your firestore database");
}

const db = getFirestore();

module.exports = { db };
