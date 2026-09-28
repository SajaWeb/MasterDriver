import { Dashboard } from "@/components/Dashboard";

/**
 * El panel.
 *
 * Los datos no se cargan acá sino desde el cliente contra `/api/admin/*`, y cada una de esas
 * rutas vuelve a verificar la sesión y el rol por su cuenta. Es intencional: si el panel se
 * apoyara solo en la comprobación del layout, bastaría con pedirle a la API directamente para
 * saltarla.
 */
export default function PanelPage() {
  return <Dashboard />;
}
