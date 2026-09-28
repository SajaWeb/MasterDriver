import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Entrar — MasterDriver" };

/**
 * El formulario lee `?volver=` para saber a dónde ir después de entrar, y eso lo obliga a
 * suspenderse mientras Next resuelve los parámetros. Sin este límite, la página no se puede
 * prerenderizar y el build falla.
 */
export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-surface" />}>
      <AuthForm />
    </Suspense>
  );
}
