import "server-only";

import { NextResponse } from "next/server";
import { readAdminSession, type Session } from "./session";

/**
 * Envuelve una ruta de la API del panel con la comprobación de administrador.
 *
 * Existe para que **ninguna ruta pueda olvidarse de verificar**. Si la comprobación se escribiera
 * a mano en cada archivo, tarde o temprano alguien agrega una ruta nueva y la omite, y esa sola
 * ruta abre todo el panel. Acá la única forma de escribir un manejador es pasando por aquí.
 *
 * El rol sale de los custom claims del token, que solo firma el servidor. Un campo en Firestore
 * lo podría escribir el propio cliente.
 */
export function withAdmin<T>(
  handler: (session: Session, request: Request) => Promise<T>,
) {
  return async (request: Request): Promise<Response> => {
    const session = await readAdminSession();
    if (!session) {
      // Mismo 403 tanto para "no hay sesión" como para "no es administrador": distinguirlos le
      // confirma a un curioso que la cuenta existe.
      return NextResponse.json({ error: "Sin acceso." }, { status: 403 });
    }

    try {
      return NextResponse.json(await handler(session, request));
    } catch (error) {
      console.error("Error en la API del panel", error);
      const message = error instanceof BadRequest ? error.message : "No se pudo completar la operación.";
      return NextResponse.json({ error: message }, { status: error instanceof BadRequest ? 400 : 500 });
    }
  };
}

/** Error cuyo mensaje sí se le puede mostrar al administrador. */
export class BadRequest extends Error {}

/** Alfabeto sin caracteres que se confundan al dictarse: sin O, 0, I, 1 ni L. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateCode(): string {
  // `crypto.getRandomValues` y no `Math.random`: estos códigos valen dinero, y un generador
  // predecible permitiría adivinar licencias ajenas.
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
