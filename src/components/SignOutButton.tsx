"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";

/**
 * Cierra la sesión en los dos lados.
 *
 * Borrar solo la cookie dejaría al navegador con un token de Firebase todavía válido; cerrar solo
 * Firebase dejaría la cookie viva. El servidor además revoca los tokens del usuario, así que la
 * sesión muere también en cualquier otro dispositivo, que es lo que alguien espera cuando cierra
 * sesión porque sospecha que le entraron a la cuenta.
 */
export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/session", { method: "DELETE" }).catch(() => undefined);
        const auth = firebaseAuth();
        if (auth) await signOut(auth).catch(() => undefined);
        router.replace("/entrar");
        router.refresh();
      }}
      className="btn-secondary min-h-[44px] px-5 text-[14px]"
    >
      {busy ? "Saliendo…" : "Salir"}
    </button>
  );
}
