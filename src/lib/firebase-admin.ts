import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * SDK de administración, solo en el servidor.
 *
 * El import de `server-only` no es decorativo: si alguien importa este módulo desde un componente
 * de cliente, el build falla en vez de empaquetar la llave privada del proyecto dentro del
 * JavaScript que se descarga el navegador. Es el tipo de error que no se nota hasta que ya pasó.
 *
 * Las credenciales llegan por variable de entorno y nunca por archivo en el repositorio.
 */
let app: App | null = null;

function credentials() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      "Falta FIREBASE_SERVICE_ACCOUNT. Generá una clave de cuenta de servicio en la consola de " +
        "Firebase y ponela en .env.local como una sola línea de JSON.",
    );
  }
  const parsed = JSON.parse(raw) as {
    project_id: string;
    client_email: string;
    private_key: string;
  };
  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    // Los saltos de línea sobreviven mal a las variables de entorno: se normalizan siempre.
    privateKey: parsed.private_key.replace(/\\n/g, "\n"),
  };
}

export function adminApp(): App {
  if (!app) {
    app = getApps()[0] ?? initializeApp({ credential: cert(credentials()) });
  }
  return app;
}

export const adminAuth = () => getAuth(adminApp());
export const adminDb = () => getFirestore(adminApp());
