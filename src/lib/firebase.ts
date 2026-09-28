"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  type Auth,
} from "firebase/auth";

/**
 * Credenciales públicas del proyecto.
 *
 * Que estén en el bundle del navegador es normal y no es una filtración: identifican al proyecto,
 * no autorizan nada. Quien protege los datos son las reglas de Firestore y la verificación de rol
 * que hace cada Cloud Function.
 */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;

export function firebaseApp(): FirebaseApp | null {
  if (!config.apiKey || !config.projectId) return null;
  if (!app) app = getApps()[0] ?? initializeApp(config);
  return app;
}

export function firebaseAuth(): Auth | null {
  const instance = firebaseApp();
  return instance ? getAuth(instance) : null;
}

export async function signInWithGoogle() {
  const auth = firebaseAuth();
  if (!auth) throw new Error("Falta configurar Firebase en este sitio.");
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signInWithPassword(email: string, password: string) {
  const auth = firebaseAuth();
  if (!auth) throw new Error("Falta configurar Firebase en este sitio.");
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

/** Traduce los errores de Firebase a algo accionable. */
export function friendlyError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Correo o contraseña incorrectos.";
    case "auth/invalid-email":
      return "Ese correo no tiene un formato válido.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/popup-blocked":
      return "El navegador bloqueó la ventana de Google. Permite ventanas emergentes para este sitio.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera unos minutos.";
    case "auth/network-request-failed":
      return "Sin conexión. Inténtalo de nuevo.";
    default:
      // El mensaje del servidor de sesion ya viene en español; el de Firebase, en ingles y en jerga.
      return (error as Error)?.message && !code
        ? (error as Error).message
        : "No se pudo completar. Inténtalo de nuevo.";
  }
}
