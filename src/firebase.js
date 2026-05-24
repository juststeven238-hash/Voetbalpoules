import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { getDatabase, ref, set, get, update, onValue, off } from "firebase/database";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from "firebase/storage";

// ── Vervang met jouw eigen Firebase project config ────────────────────────────
const firebaseConfig = {
  apiKey: "JOUW_API_KEY",
  authDomain: "JOUW_PROJECT.firebaseapp.com",
  databaseURL: "https://JOUW_PROJECT-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "JOUW_PROJECT",
  storageBucket: "JOUW_PROJECT.appspot.com",
  messagingSenderId: "JOUW_SENDER_ID",
  appId: "JOUW_APP_ID",
};

const app = initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getDatabase(app);
export const storage = getStorage(app);

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function registerUser(email, password, username) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: username });
  await set(ref(db, `vp_users/${cred.user.uid}`), {
    username, email, photoURL: null,
    punten: {}, aangemaakt: Date.now(),
  });
  return cred.user;
}

export async function loginUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logoutUser() {
  return signOut(auth);
}

export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

// ── Profielfoto ───────────────────────────────────────────────────────────────
export async function uploadProfilePhoto(uid, file) {
  const r = sRef(storage, `profielfoto/${uid}`);
  await uploadBytes(r, file);
  const url = await getDownloadURL(r);
  await updateProfile(auth.currentUser, { photoURL: url });
  await update(ref(db, `vp_users/${uid}`), { photoURL: url });
  return url;
}

// ── Users ─────────────────────────────────────────────────────────────────────
export async function getUser(uid) {
  const s = await get(ref(db, `vp_users/${uid}`));
  return s.exists() ? s.val() : null;
}

export async function updateUser(uid, data) {
  return update(ref(db, `vp_users/${uid}`), data);
}

// ── Voorspellingen ────────────────────────────────────────────────────────────
export async function saveVoorspelling(uid, divisieId, wedstrijdId, thuis, uit) {
  return set(ref(db, `vp_voorspellingen/${uid}/${divisieId}/${wedstrijdId}`), { thuis, uit, tijd: Date.now() });
}

export async function getVoorspellingen(uid, divisieId) {
  const s = await get(ref(db, `vp_voorspellingen/${uid}/${divisieId}`));
  return s.exists() ? s.val() : {};
}

export async function getAlleVoorspellingenDivisie(divisieId) {
  const s = await get(ref(db, `vp_voorspellingen`));
  if (!s.exists()) return {};
  const result = {};
  Object.entries(s.val()).forEach(([uid, divs]) => {
    if (divs[divisieId]) result[uid] = divs[divisieId];
  });
  return result;
}

// ── Poules ────────────────────────────────────────────────────────────────────
export async function createPoule(naam, divisieId, aanmakerUid) {
  const code = Math.random().toString(36).substring(2, 7).toUpperCase();
  await set(ref(db, `vp_poules/${code}`), {
    naam, divisieId, aanmaker: aanmakerUid,
    leden: { [aanmakerUid]: true },
    code, aangemaakt: Date.now(),
  });
  return code;
}

export async function joinPoule(code, uid) {
  const s = await get(ref(db, `vp_poules/${code}`));
  if (!s.exists()) throw new Error("Poule niet gevonden");
  await update(ref(db, `vp_poules/${code}/leden`), { [uid]: true });
  return s.val();
}

export async function getUserPoules(uid) {
  const s = await get(ref(db, `vp_poules`));
  if (!s.exists()) return [];
  return Object.entries(s.val())
    .filter(([, p]) => p.leden?.[uid])
    .map(([code, p]) => ({ code, ...p }));
}

// ── Ranglijst ─────────────────────────────────────────────────────────────────
export async function getRanglijst(divisieId) {
  const s = await get(ref(db, `vp_users`));
  if (!s.exists()) return [];
  return Object.entries(s.val())
    .map(([uid, u]) => ({ uid, username: u.username, photoURL: u.photoURL, punten: u.punten?.[divisieId] || 0 }))
    .sort((a, b) => b.punten - a.punten);
}

export async function savePunten(uid, divisieId, punten) {
  return update(ref(db, `vp_users/${uid}/punten`), { [divisieId]: punten });
}

// ── Uitslagen (admin) ─────────────────────────────────────────────────────────
export async function saveUitslagen(divisieId, wedstrijdId, thuis, uit) {
  return set(ref(db, `vp_uitslagen/${divisieId}/${wedstrijdId}`), { thuis, uit, tijd: Date.now() });
}

export async function getUitslagen(divisieId) {
  const s = await get(ref(db, `vp_uitslagen/${divisieId}`));
  return s.exists() ? s.val() : {};
}
