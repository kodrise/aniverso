import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBx_Aqo2n9hpN4gMionYnvCsMQUB9HPD30",
  authDomain: "aniverso-app.firebaseapp.com",
  projectId: "aniverso-app",
  storageBucket: "aniverso-app.firebasestorage.app",
  messagingSenderId: "113937368635",
  appId: "1:113937368635:web:bfc2d2ce71675d7df53e1e",
  measurementId: ""
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
