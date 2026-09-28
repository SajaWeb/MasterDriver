import "server-only";

import { cookies } from "next/headers";
import { adminAuth } from "./firebase-admin";
import type { DecodedIdToken } from "firebase-admin/auth";

/**
 * Sesión del panel, en una cookie que el navegador no puede leer.
 *
 * ## Por qué cookie de sesión y no el token de Firebase en JavaScript
 *
 * El token de Firebase vive en `localStorage`, al alcance de cualquier script de la página. Una
 * sola vulnerabilidad de XSS —una dependencia comprometida, un texto de usuario mal escapado—
 * alcanza para robarlo. Una cookie `httpOnly` no la puede leer ningún script, ni el nuestro.
 *
 * ## Las tres banderas y qué ataca cada una
 *
 *  - `httpOnly`: el script no la lee. Ataca el robo por XSS.
 *  - `secure`: solo viaja por HTTPS. Ataca la interceptación en redes abiertas.
 *  - `sameSite: "strict"`: no se envía en peticiones que vienen de otro sitio. Ataca el CSRF,
 *    que en un panel donde un clic revoca licencias no es un riesgo teórico.
 */
const COOKIE = "md_session";

/** Cinco días. Firebase no permite más de dos semanas. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 5;

export type Session = DecodedIdToken & { role?: string };

export async function createSession(idToken: string): Promise<void> {
  // Se verifica el token ANTES de cambiarlo por una cookie, y con `checkRevoked` para que una
  // sesión cerrada desde otro dispositivo no pueda reciclarse aquí.
  const decoded = await adminAuth().verifyIdToken(idToken, true);

  // Solo se acepta un token recién emitido. Uno viejo robado de un registro o de una caché no
  // sirve para abrir sesión: la ventana de cinco minutos es la que recomienda Firebase.
  const ageSeconds = Date.now() / 1000 - decoded.auth_time;
  if (ageSeconds > 5 * 60) {
    throw new Error("La sesión expiró. Vuelve a entrar.");
  }

  const sessionCookie = await adminAuth().createSessionCookie(idToken, {
    expiresIn: MAX_AGE_SECONDS * 1000,
  });

  const store = await cookies();
  store.set(COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/**
 * Lee y verifica la sesión.
 *
 * `checkRevoked: true` obliga a consultar el estado del usuario en cada petición. Cuesta una
 * llamada, y compra que revocar una sesión surta efecto de inmediato en vez de dentro de cinco
 * días. En un panel que emite y revoca licencias, ese intercambio vale la pena.
 */
export async function readSession(): Promise<Session | null> {
  const store = await cookies();
  const value = store.get(COOKIE)?.value;
  if (!value) return null;

  try {
    return await adminAuth().verifySessionCookie(value, true);
  } catch {
    // Cookie vencida, revocada o manipulada. Las tres significan lo mismo: no hay sesión.
    return null;
  }
}

/** Sesión con rol de administrador, o `null`. La usa todo lo que toca datos ajenos. */
export async function readAdminSession(): Promise<Session | null> {
  const session = await readSession();
  return session?.role === "admin" ? session : null;
}

export async function destroySession(): Promise<void> {
  const session = await readSession();

  // Revocar invalida TODAS las sesiones del usuario, no solo esta cookie. Es lo correcto al
  // cerrar sesión a propósito: si alguien sale porque sospecha que le robaron la cuenta, cerrar
  // solo la pestaña actual no le sirve de nada.
  if (session) {
    await adminAuth().revokeRefreshTokens(session.uid).catch(() => undefined);
  }

  const store = await cookies();
  store.delete(COOKIE);
}

export const SESSION_COOKIE = COOKIE;
