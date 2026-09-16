// Seit 16.09.2026 laeuft diese App im Firebase-Projekt des Ueberfuehrungsbuchs
// (abholung-hygienenachweise-qm). Grund: Das alte Projekt qm-reinigung-hygiene war
// ohne Anmeldung les- UND schreibbar. Hier greifen die Regeln: nur angemeldete
// Nutzer duerfen lesen und schreiben. Die Web-Konfiguration ist oeffentlich
// (Firebase-Prinzip) - die Sicherheit kommt aus Anmeldung + Regeln.
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBVDbuVLb2xGRz8WRQDHIywuW_eAXvyJuk",
  authDomain: "abholung-hygienenachweise-qm.firebaseapp.com",
  projectId: "abholung-hygienenachweise-qm",
  storageBucket: "abholung-hygienenachweise-qm.firebasestorage.app",
  messagingSenderId: "400251632866",
  appId: "1:400251632866:web:a9825da403d1ae513232bb",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
