import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBhCsCnF2L1a3tDxhMo3RzNymoPaoV5P7I",
  authDomain: "skoftanet-lt.firebaseapp.com",
  projectId: "skoftanet-lt",
  storageBucket: "skoftanet-lt.firebasestorage.app",
  messagingSenderId: "897029807592",
  appId: "1:897029807592:web:58e1728b0c9e464de2585d",
  measurementId: "G-NT2RMHRWH8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };