import Link from "next/link";
import { redirect } from "next/navigation";
import { Mark } from "@/components/Mark";
import { SignOutButton } from "@/components/SignOutButton";
import { readSession } from "@/lib/session";

export const metadata = { title: "Panel — MasterDriver" };

/**
 * La guarda de verdad del panel.
 *
 * Corre en el servidor **antes de enviar una sola línea de HTML**. La comprobación anterior vivía
 * en JavaScript del navegador, donde cualquiera con las herramientas de desarrollo la saltaba en
 * diez segundos: no protegía nada, solo escondía la pantalla.
 *
 * El rol sale de los custom claims del token de sesión, que solo firma el servidor. Verificar con
 * `checkRevoked` hace que cerrar una sesión o degradar a alguien surta efecto en la petición
 * siguiente, no dentro de cinco días.
 *
 * Aun así, **esto no es lo único que protege los datos**: cada ruta de la API vuelve a verificar
 * por su cuenta. Un layout no puede defender lo que se pide por `fetch` directo.
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect("/entrar?volver=/panel");

  const isAdmin = session.role === "admin";

  return (
    <div className="min-h-dvh bg-surface">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="Inicio">
              <Mark size={32} />
            </Link>
            <span className="eyebrow hidden rounded-full bg-volt-soft px-3 py-1.5 text-volt-ink sm:inline">
              Panel
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="label hidden text-ink-muted md:inline">{session.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {isAdmin ? children : <NoAccess email={session.email ?? ""} />}
      </main>
    </div>
  );
}

function NoAccess({ email }: { email: string }) {
  return (
    <div className="card max-w-[56ch] p-8">
      <p className="eyebrow text-flare-ink">Sin acceso</p>
      <h1 className="title-lg mt-2 text-ink">Tu cuenta no administra MasterDriver</h1>
      <p className="body-lg mt-3 text-ink-muted">
        Entraste como <span className="text-ink">{email}</span>, pero esta cuenta no es de
        administrador. Pídele a quien administra MasterDriver que te dé acceso desde el panel.
      </p>
      <p className="body mt-4 text-ink-muted">
        Si manejas, lo tuyo es la app: ahí están tus viajes, tu licencia y la cuenta del día.
      </p>
    </div>
  );
}
