import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad.
 *
 * Cada una cierra una puerta concreta; van juntas porque ninguna alcanza sola.
 */
const securityHeaders = [
  // Sin esto, el panel se puede cargar dentro de un iframe en un sitio ajeno y engañar a un
  // administrador para que haga clic donde no cree. Es la defensa contra clickjacking.
  { key: "X-Frame-Options", value: "DENY" },

  // Evita que el navegador adivine el tipo de un archivo: un .txt que "parece" JavaScript no se
  // ejecuta.
  { key: "X-Content-Type-Options", value: "nosniff" },

  // No filtra la ruta del panel a sitios externos. Una URL como /panel/usuarios/abc123 en el
  // Referer le cuenta a un tercero más de lo que debería.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // El panel no necesita cámara, micrófono ni ubicación. Declararlo impide que un script
  // inyectado los pida.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },

  // Obliga a HTTPS durante un año, incluidos los subdominios. La cookie de sesión lleva `secure`,
  // así que sin HTTPS no hay panel; esto evita además el primer salto en claro.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },

  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Firebase necesita 'unsafe-inline' para sus estilos; Next inyecta los suyos igual.
      "style-src 'self' 'unsafe-inline'",
      // 'unsafe-eval' hace falta para el SDK de Firebase en el navegador. Es la concesión más
      // grande de esta política y la razón de que el resto sea estricto.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com",
      "img-src 'self' data: https://*.googleusercontent.com",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://securetoken.googleapis.com",
      "frame-src https://*.firebaseapp.com https://accounts.google.com",
      // Nadie puede meter este sitio en un iframe. Es la versión moderna de X-Frame-Options.
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const config: NextConfig = {
  reactStrictMode: true,
  // firebase-admin carga módulos nativos y dependencias opcionales que el empaquetador no puede
  // resolver estáticamente. Declararlo externo hace que Node lo cargue en tiempo de ejecución,
  // que es como está pensado para usarse en el servidor.
  serverExternalPackages: ["firebase-admin"],
  // El panel maneja datos de personas: no anuncia con qué está hecho.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default config;
