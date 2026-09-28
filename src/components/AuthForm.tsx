"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Mark } from "@/components/Mark";
import { IconUser } from "@/components/Icons";
import { friendlyError, signInWithGoogle, signInWithPassword } from "@/lib/firebase";

/**
 * Entrada al panel.
 *
 * Ya no hay registro: crear una cuenta en la web no daba nada. Los conductores se registran en la
 * app, y a los administradores los nombra otro administrador desde el panel.
 *
 * El control de acceso de verdad no vive acá: está en las reglas de Firestore y en la
 * verificación de rol que hace cada Cloud Function del lado del servidor. Esto es la puerta,
 * no la cerradura, y conviene tenerlo presente al leerlo.
 */
export function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();

  // A dónde volver después de entrar. Se acepta solo una ruta interna: si se confiara en el
  // parámetro tal cual, un enlace preparado podría mandar a alguien a un sitio ajeno después de
  // escribir su contraseña, que es el redirect abierto de manual.
  const volver = params.get("volver") ?? "";
  const destino = volver.startsWith("/") && !volver.startsWith("//") ? volver : "/panel";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [withEmail, setWithEmail] = useState(false);

  /**
   * Autentica y cambia el token por una cookie de sesión.
   *
   * Los dos pasos son necesarios y en este orden. Firebase autentica en el navegador y devuelve
   * un token; ese token se manda **una sola vez** al servidor, que lo verifica y responde con una
   * cookie `httpOnly` que ningún script puede leer. A partir de ahí el panel se protege con la
   * cookie y el token no vuelve a hacer falta.
   *
   * Si el segundo paso falla, no se navega: dejar entrar con la sesión a medias produciría un
   * panel que se ve pero cuyas peticiones fallan todas.
   */
  async function run(action: () => Promise<{ user: { getIdToken: () => Promise<string> } }>) {
    setBusy(true);
    setError(null);
    try {
      const credential = await action();
      const idToken = await credential.user.getIdToken();

      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo abrir la sesión.");
      }

      router.replace(destino);
      // Sin esto, el layout del servidor se sirve desde caché sin la cookie nueva.
      router.refresh();
    } catch (e) {
      // Cerrar la ventana de Google no es un error y no merece un cartel rojo.
      const message = friendlyError(e);
      if (message) setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col bg-surface">
      <div className="mx-auto w-full max-w-6xl px-6 py-5">
        <Link href="/" aria-label="Inicio">
          <Mark />
        </Link>
      </div>

      <div className="flex flex-1 items-start justify-center px-6 pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="card w-full max-w-[420px] p-8">
          <p className="eyebrow text-volt-ink">Administración</p>
          <h1 className="title-lg mt-2 text-ink">Entra al panel</h1>
          <p className="body mt-3 text-ink-muted">
            Aquí se asignan y renuevan las licencias. Si manejas, lo tuyo es la app: ahí entras con
            tu cuenta de Google y la prueba se activa sola.
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={() => run(signInWithGoogle)}
            className="btn-primary mt-8 w-full"
          >
            <IconUser size={20} />
            {busy ? "Un momento…" : "Continuar con Google"}
          </button>

          {error && (
            <p role="alert" className="body mt-4 text-danger-ink">
              {error}
            </p>
          )}

          {/* Correo y contraseña quedan para administradores sin Google. Plegado: casi nadie lo
              usa y, abierto, competia con el boton principal. */}
          {!withEmail ? (
            <button
              type="button"
              onClick={() => setWithEmail(true)}
              className="label mt-6 w-full text-center text-ink-muted underline-offset-4 hover:text-ink hover:underline"
            >
              Entrar con correo y contraseña
            </button>
          ) : (
            <form
              className="mt-7 space-y-4 border-t border-line pt-6"
              onSubmit={(event) => {
                event.preventDefault();
                run(() => signInWithPassword(email, password));
              }}
            >
              <Field label="Correo" type="email" value={email} onChange={setEmail} autoComplete="email" />
              <Field
                label="Contraseña"
                type="password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
              />
              <button type="submit" disabled={busy || !email || password.length < 6} className="btn-secondary w-full">
                {busy ? "Un momento…" : "Entrar"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  return (
    <label className="block">
      <span className="label mb-2 block text-ink">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="field"
      />
    </label>
  );
}
