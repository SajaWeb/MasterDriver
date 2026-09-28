import { NextResponse, type NextRequest } from "next/server";

/**
 * Primera barrera de `/panel`.
 *
 * Solo comprueba que **exista** la cookie, no que sea válida: aquí corre el runtime de Edge,
 * donde el SDK de administración de Firebase no funciona. La verificación de verdad —firma, rol
 * y revocación— ocurre en el layout del panel y en cada ruta de la API.
 *
 * Esto no es seguridad, es cortesía: evita cargar el panel entero para redirigir a quien
 * claramente no inició sesión. **Nada que dependa de esto para proteger datos es seguro.**
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("md_session");
  if (!hasSession) {
    const url = new URL("/entrar", request.url);
    url.searchParams.set("volver", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/panel/:path*",
};
