import { NextResponse } from "next/server";
import { createSession, destroySession } from "@/lib/session";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/**
 * Cambia un token de Firebase por una cookie de sesión.
 *
 * El navegador se autentica con Firebase del lado del cliente y manda el token aquí **una sola
 * vez**. A partir de ahí la sesión vive en una cookie que ningún script puede leer, y el token
 * no vuelve a tocar el navegador.
 */
export async function POST(request: Request) {
  const limit = rateLimit(`session:${clientKey(request.headers)}`);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Esperá un momento." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  // Defensa contra CSRF que no depende de un token: una petición cruzada de verdad no puede
  // poner `application/json` sin un preflight, y el preflight lo corta la política de origen.
  // Va además de `sameSite: strict`, no en su lugar.
  if (request.headers.get("content-type") !== "application/json") {
    return NextResponse.json({ error: "Petición no válida." }, { status: 400 });
  }

  let idToken: unknown;
  try {
    idToken = (await request.json())?.idToken;
  } catch {
    return NextResponse.json({ error: "Petición no válida." }, { status: 400 });
  }

  if (typeof idToken !== "string" || idToken.length < 20) {
    return NextResponse.json({ error: "Petición no válida." }, { status: 400 });
  }

  try {
    await createSession(idToken);
    return NextResponse.json({ ok: true });
  } catch (error) {
    // El motivo exacto no se devuelve: distinguir "token vencido" de "token de otro proyecto"
    // le confirma información a quien está probando.
    console.error("No se pudo abrir la sesión", error);
    return NextResponse.json({ error: "No se pudo abrir la sesión." }, { status: 401 });
  }
}

export async function DELETE() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
