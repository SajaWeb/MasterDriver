import { redirect } from "next/navigation";

/**
 * El registro en la web se quito: los conductores crean su cuenta en la app y a los
 * administradores los nombra otro administrador. Se deja la ruta para que los enlaces viejos
 * lleguen a algun lado.
 */
export default function Page() {
  redirect("/entrar");
}
