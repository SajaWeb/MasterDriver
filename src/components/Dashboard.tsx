"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconAlert, IconCheck, IconX } from "@/components/Icons";

/**
 * El panel de licencias.
 *
 * Esta organizado alrededor de lo que el administrador hace de verdad, que casi siempre es una de
 * dos cosas: un conductor pago y hay que darle su licencia, o alguien escribe porque "la app dice
 * que esta vencida" y hay que ver por que. Por eso la pestaña principal son los conductores, con
 * busqueda por correo y la accion al lado; los codigos sueltos son la segunda forma de vender.
 *
 * Toda accion destructiva pide confirmacion en el mismo lugar del boton. Un clic equivocado en
 * "Revocar" deja a un conductor sin avisos en mitad del turno.
 */

type Status = "available" | "active" | "revoked";

interface Licencia {
  id: string;
  status: Status;
  plan: string;
  days: number;
  uid: string | null;
  email: string | null;
  deviceId: string | null;
  expiresAt: number | null;
  createdAt: number;
  notes?: string | null;
}

interface Usuario {
  uid: string;
  email: string | null;
  role: string;
  disabled: boolean;
  createdAt: string | null;
  lastSignIn: string | null;
  licencia: {
    code: string;
    plan: string;
    expiresAt: number | null;
    vigente: boolean;
    deviceBound: boolean;
    notes: string | null;
  } | null;
}

type Tab = "conductores" | "codigos";

const DAY = 86_400_000;
const PRESETS = [30, 90, 180, 365];

export function Dashboard() {
  const [tab, setTab] = useState<Tab>("conductores");
  const [licencias, setLicencias] = useState<Licencia[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const [l, u] = await Promise.all([
        fetch("/api/admin/licencias").then((r) => r.json()),
        fetch("/api/admin/usuarios").then((r) => r.json()),
      ]);
      if (l.error || u.error) throw new Error(l.error ?? u.error);
      setLicencias(l.licencias ?? []);
      setUsuarios(u.usuarios ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /** Llama a la API, muestra el resultado y recarga. Devuelve la respuesta por si hace falta. */
  const enviar = useCallback(
    async (url: string, method: "POST" | "PATCH", body: unknown) => {
      setError(null);
      setAviso(null);
      try {
        const response = await fetch(url, {
          method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await response.json();
        if (data.error) {
          setError(data.error);
          return null;
        }
        if (data.aviso) setAviso(data.aviso);
        await cargar();
        return data as Record<string, unknown>;
      } catch {
        setError("No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
        return null;
      }
    },
    [cargar],
  );

  const now = Date.now();
  const stats = useMemo(() => {
    const conLicencia = usuarios.filter((u) => u.licencia?.vigente);
    return {
      vigentes: conLicencia.filter((u) => u.licencia?.plan !== "trial").length,
      prueba: conLicencia.filter((u) => u.licencia?.plan === "trial").length,
      vencenPronto: conLicencia.filter(
        (u) => u.licencia?.expiresAt && u.licencia.expiresAt - now < 7 * DAY,
      ).length,
      sinUsar: licencias.filter((l) => l.status === "available").length,
    };
  }, [usuarios, licencias, now]);

  return (
    <div>
      <h1 className="title-lg text-ink">Licencias</h1>
      <p className="body mt-1 text-ink-muted">Asigna, extiende y revisa las licencias de los conductores.</p>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Licencias pagas vigentes" value={stats.vigentes} />
        <Stat label="En prueba gratis" value={stats.prueba} />
        <Stat label="Vencen en 7 días" value={stats.vencenPronto} tone={stats.vencenPronto ? "warn" : undefined} />
        <Stat label="Códigos sin usar" value={stats.sinUsar} />
      </div>

      <div className="mt-10 inline-flex rounded-full bg-surface-sunken p-1" role="tablist">
        {(
          [
            ["conductores", "Conductores"],
            ["codigos", "Códigos"],
          ] as [Tab, string][]
        ).map(([entry, label]) => (
          <button
            key={entry}
            type="button"
            role="tab"
            aria-selected={tab === entry}
            onClick={() => setTab(entry)}
            className={`min-h-[44px] rounded-full px-6 text-[14px] transition-colors ${
              tab === entry ? "bg-ink font-bold text-surface" : "font-medium text-ink-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <Banner tone="error" onClose={() => setError(null)}>
          {error}
        </Banner>
      )}
      {aviso && (
        <Banner tone="info" onClose={() => setAviso(null)}>
          {aviso}
        </Banner>
      )}

      <div className="mt-6">
        {cargando ? (
          <p className="body text-ink-muted">Cargando…</p>
        ) : tab === "conductores" ? (
          <Conductores usuarios={usuarios} enviar={enviar} />
        ) : (
          <Codigos licencias={licencias} enviar={enviar} />
        )}
      </div>
    </div>
  );
}

type Enviar = (url: string, method: "POST" | "PATCH", body: unknown) => Promise<Record<string, unknown> | null>;

// --- Conductores -------------------------------------------------------------------------------

type FiltroConductor = "todos" | "pagas" | "prueba" | "vencidas" | "sin";

function Conductores({ usuarios, enviar }: { usuarios: Usuario[]; enviar: Enviar }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroConductor>("todos");
  const [abierto, setAbierto] = useState<string | null>(null);

  const visibles = usuarios
    .filter((u) => {
      const l = u.licencia;
      switch (filtro) {
        case "pagas":
          return l?.vigente && l.plan !== "trial";
        case "prueba":
          return l?.vigente && l.plan === "trial";
        case "vencidas":
          return l && !l.vigente;
        case "sin":
          return !l;
        default:
          return true;
      }
    })
    .filter((u) => (u.email ?? u.uid).toLowerCase().includes(busqueda.trim().toLowerCase()))
    // Lo que necesita atencion primero: vencidas y por vencer arriba.
    .sort((a, b) => urgencia(a) - urgencia(b));

  return (
    <div className="space-y-5">
      <p className="body max-w-[70ch] text-ink-muted">
        Para darle una licencia a un conductor que ya pagó, búscalo por su correo y toca{" "}
        <span className="text-ink">Asignar</span>. No hace falta dictarle ningún código: la app la
        toma sola la próxima vez que se conecte. Si todavía no aparece, tiene que registrarse primero
        en la app.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por correo"
          type="search"
          className="field max-w-sm"
        />
        <Chips
          value={filtro}
          onChange={setFiltro}
          options={[
            ["todos", "Todos"],
            ["pagas", "Licencia paga"],
            ["prueba", "En prueba"],
            ["vencidas", "Vencidas"],
            ["sin", "Sin licencia"],
          ]}
        />
      </div>

      {visibles.length === 0 ? (
        <p className="text-[15px] text-ink-muted">
          {usuarios.length === 0 ? "Todavía no hay cuentas." : "Nadie coincide con esa búsqueda."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[22px] border border-line">
          <table className="w-full min-w-[760px] text-left text-[14px]">
            <thead className="bg-surface-sunken text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Conductor</th>
                <th className="px-4 py-3 font-medium">Licencia</th>
                <th className="px-4 py-3 font-medium">Teléfono</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-ink">
              {visibles.map((u) => (
                <FilaConductor
                  key={u.uid}
                  usuario={u}
                  abierto={abierto === u.uid}
                  onAbrir={() => setAbierto(abierto === u.uid ? null : u.uid)}
                  enviar={enviar}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function urgencia(u: Usuario): number {
  const l = u.licencia;
  if (!l) return 3;
  if (!l.vigente) return 0;
  if (l.expiresAt && l.expiresAt - Date.now() < 7 * DAY) return 1;
  return 2;
}

function FilaConductor({
  usuario,
  abierto,
  onAbrir,
  enviar,
}: {
  usuario: Usuario;
  abierto: boolean;
  onAbrir: () => void;
  enviar: Enviar;
}) {
  const l = usuario.licencia;
  const paga = l?.vigente && l.plan !== "trial";

  return (
    <>
      <tr className="border-t border-line align-top">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="break-all">{usuario.email ?? usuario.uid}</span>
            {usuario.role === "admin" && (
              <span className="eyebrow rounded-full bg-volt-soft px-2 py-1 text-volt-ink">admin</span>
            )}
          </div>
          {usuario.createdAt && (
            <p className="mt-0.5 text-[12.5px] text-ink-muted">Registrado el {fecha(Date.parse(usuario.createdAt))}</p>
          )}
        </td>
        <td className="px-4 py-3">
          <EstadoLicencia licencia={l} />
          {l?.notes && <p className="mt-0.5 text-[12.5px] text-ink-muted">{l.notes}</p>}
        </td>
        <td className="px-4 py-3 text-ink-muted">
          {l ? (l.deviceBound ? "Vinculado" : "Se vincula al entrar") : "—"}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap justify-end gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={onAbrir}
              className="label min-h-[40px] rounded-full bg-volt px-4 font-bold text-on-volt"
            >
              {abierto ? "Cerrar" : paga ? "Extender" : "Asignar licencia"}
            </button>
            {l?.deviceBound && (
              <Accion
                onClick={() => enviar("/api/admin/licencias", "PATCH", { code: l.code, action: "liberar" })}
                confirmar="¿Liberar el teléfono? Hazlo solo si el conductor cambió de celular."
              >
                Liberar teléfono
              </Accion>
            )}
            {l && (
              <Accion
                destructiva
                onClick={() => enviar("/api/admin/licencias", "PATCH", { code: l.code, action: "revocar" })}
                confirmar="¿Revocar? Deja de recibir avisos cuando su teléfono se conecte (máximo 7 días)."
              >
                Revocar
              </Accion>
            )}
            <Accion
              onClick={() =>
                enviar("/api/admin/usuarios", "PATCH", {
                  uid: usuario.uid,
                  role: usuario.role === "admin" ? "user" : "admin",
                })
              }
              confirmar={
                usuario.role === "admin"
                  ? "¿Quitarle el acceso al panel?"
                  : "¿Darle acceso completo a este panel? Podrá emitir y revocar licencias."
              }
            >
              {usuario.role === "admin" ? "Quitar admin" : "Hacer admin"}
            </Accion>
          </div>
        </td>
      </tr>
      {abierto && (
        <tr className="bg-surface-sunken">
          <td colSpan={4} className="px-4 py-4">
            {paga && l ? (
              <FormDias
                titulo={`Extender la licencia de ${usuario.email}`}
                detalle={`Los días se suman desde el ${fecha(Math.max(l.expiresAt ?? 0, Date.now()))}.`}
                accion="Extender"
                conNota={false}
                onEnviar={async ({ days }) =>
                  !!(await enviar("/api/admin/licencias", "PATCH", { code: l.code, action: "extender", days }))
                }
              />
            ) : (
              <FormDias
                titulo={`Asignar licencia a ${usuario.email}`}
                detalle={
                  l?.vigente
                    ? "Reemplaza la prueba gratis desde hoy."
                    : "Empieza a contar desde hoy. La app la toma al conectarse."
                }
                accion="Asignar"
                conNota
                onEnviar={async ({ days, plan, notes }) =>
                  !!(await enviar("/api/admin/licencias", "POST", { email: usuario.email, days, plan, notes }))
                }
              />
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// --- Codigos -----------------------------------------------------------------------------------

type FiltroCodigo = "todos" | "sin" | "activas" | "vencidas" | "revocadas";

function Codigos({ licencias, enviar }: { licencias: Licencia[]; enviar: Enviar }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroCodigo>("todos");
  const [nuevos, setNuevos] = useState<string[]>([]);
  const [extendiendo, setExtendiendo] = useState<string | null>(null);
  const now = Date.now();

  const q = busqueda.trim().toLowerCase();
  const visibles = licencias
    .filter((l) => {
      const vencida = l.status === "active" && (l.expiresAt ?? 0) <= now;
      switch (filtro) {
        case "sin":
          return l.status === "available";
        case "activas":
          return l.status === "active" && !vencida;
        case "vencidas":
          return vencida;
        case "revocadas":
          return l.status === "revoked";
        default:
          return true;
      }
    })
    .filter(
      (l) =>
        !q ||
        l.id.toLowerCase().includes(q) ||
        (l.email ?? "").toLowerCase().includes(q) ||
        (l.notes ?? "").toLowerCase().includes(q),
    );

  return (
    <div className="space-y-8">
      <section className="rounded-[22px] border border-line bg-surface-raised p-6">
        <h2 className="title text-ink">Generar códigos</h2>
        <p className="body mt-1.5 max-w-[66ch] text-ink-muted">
          Para vender por adelantado o entregar a un distribuidor. El conductor lo escribe en la app,
          en Cuenta. Si ya sabes a quién va, es más fácil asignarla directo desde Conductores. Los
          códigos no llevan letras ni números que se confundan al dictarse: sin O, 0, I, 1 ni L.
        </p>
        <div className="mt-5">
          <FormDias
            accion="Generar"
            conCantidad
            conNota
            onEnviar={async ({ days, plan, notes, count }) => {
              const data = await enviar("/api/admin/licencias", "POST", { count, days, plan, notes });
              if (data?.codes) setNuevos(data.codes as string[]);
              return !!data;
            }}
          />
        </div>

        {nuevos.length > 0 && (
          <div className="mt-5 rounded-[14px] bg-surface-sunken p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] text-ink-muted">
                {nuevos.length === 1 ? "Código generado:" : `${nuevos.length} códigos generados:`}
              </p>
              <Copiar texto={nuevos.join("\n")}>Copiar {nuevos.length === 1 ? "código" : "todos"}</Copiar>
            </div>
            <ul className="num mt-3 grid gap-x-6 gap-y-1.5 text-[15px] text-ink sm:grid-cols-2 lg:grid-cols-3">
              {nuevos.map((c) => (
                <li key={c} className="select-all">
                  {formatoCodigo(c)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar código, correo o nota"
          type="search"
          className="field max-w-sm"
        />
        <Chips
          value={filtro}
          onChange={setFiltro}
          options={[
            ["todos", "Todos"],
            ["sin", "Sin usar"],
            ["activas", "Activas"],
            ["vencidas", "Vencidas"],
            ["revocadas", "Revocadas"],
          ]}
        />
      </div>

      {visibles.length === 0 ? (
        <p className="text-[15px] text-ink-muted">
          {licencias.length === 0 ? "Todavía no has emitido ninguna licencia." : "Ningún código coincide."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[22px] border border-line">
          <table className="w-full min-w-[860px] text-left text-[14px]">
            <thead className="bg-surface-sunken text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Conductor</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Teléfono</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-ink">
              {visibles.map((l) => (
                <FilaCodigo
                  key={l.id}
                  licencia={l}
                  extendiendo={extendiendo === l.id}
                  onExtender={() => setExtendiendo(extendiendo === l.id ? null : l.id)}
                  enviar={enviar}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilaCodigo({
  licencia: l,
  extendiendo,
  onExtender,
  enviar,
}: {
  licencia: Licencia;
  extendiendo: boolean;
  onExtender: () => void;
  enviar: Enviar;
}) {
  const esPrueba = l.plan === "trial";
  return (
    <>
      <tr className="border-t border-line align-top">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="num select-all">{esPrueba ? "Prueba gratis" : formatoCodigo(l.id)}</span>
            {!esPrueba && <Copiar texto={l.id}>Copiar</Copiar>}
          </div>
          {l.notes && <p className="mt-0.5 text-[12.5px] text-ink-muted">{l.notes}</p>}
        </td>
        <td className="px-4 py-3">
          <EstadoCodigo licencia={l} />
        </td>
        <td className="px-4 py-3 break-all text-ink-muted">{l.email ?? "—"}</td>
        <td className="px-4 py-3 text-ink-muted">
          {esPrueba ? "Prueba" : l.plan} · {l.days} días
        </td>
        <td className="px-4 py-3 text-ink-muted">{l.status === "active" ? (l.deviceId ? "Vinculado" : "Sin vincular") : "—"}</td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap justify-end gap-x-4 gap-y-2">
            {l.status !== "revoked" && (
              <button type="button" onClick={onExtender} className="label min-h-[40px] rounded-full border border-line-strong px-4 font-bold text-ink hover:bg-surface-sunken">
                {extendiendo ? "Cerrar" : "Extender"}
              </button>
            )}
            {l.deviceId && l.status === "active" && (
              <Accion
                onClick={() => enviar("/api/admin/licencias", "PATCH", { code: l.id, action: "liberar" })}
                confirmar="¿Liberar el teléfono? Hazlo solo si el conductor cambió de celular."
              >
                Liberar
              </Accion>
            )}
            {l.status !== "revoked" && (
              <Accion
                destructiva
                onClick={() => enviar("/api/admin/licencias", "PATCH", { code: l.id, action: "revocar" })}
                confirmar={
                  l.status === "available"
                    ? "¿Anular este código? Nadie va a poder activarlo."
                    : "¿Revocar? El conductor deja de recibir avisos cuando su teléfono se conecte (máximo 7 días)."
                }
              >
                {l.status === "available" ? "Anular" : "Revocar"}
              </Accion>
            )}
          </div>
        </td>
      </tr>
      {extendiendo && (
        <tr className="bg-surface-sunken">
          <td colSpan={6} className="px-4 py-4">
            <FormDias
              titulo={l.status === "available" ? "Agregar días al código" : "Extender la licencia"}
              detalle={
                l.status === "available"
                  ? `Hoy da ${l.days} días al activarse.`
                  : `Los días se suman desde el ${fecha(Math.max(l.expiresAt ?? 0, Date.now()))}.`
              }
              accion="Extender"
              conNota={false}
              onEnviar={async ({ days }) =>
                !!(await enviar("/api/admin/licencias", "PATCH", { code: l.id, action: "extender", days }))
              }
            />
          </td>
        </tr>
      )}
    </>
  );
}

// --- Piezas ------------------------------------------------------------------------------------

/**
 * Dias, plan y nota, con los plazos que se venden como atajos.
 *
 * Teclear "30" en un campo libre es donde aparecia "300" por un cero de mas: los atajos cubren
 * casi todos los casos y el campo queda para lo raro.
 */
function FormDias({
  titulo,
  detalle,
  accion,
  conNota,
  conCantidad = false,
  onEnviar,
}: {
  titulo?: string;
  detalle?: string;
  accion: string;
  conNota: boolean;
  conCantidad?: boolean;
  onEnviar: (v: { days: number; plan: string; notes: string; count: number }) => Promise<boolean>;
}) {
  const [dias, setDias] = useState("30");
  const [plan, setPlan] = useState("mensual");
  const [notes, setNotes] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [enviando, setEnviando] = useState(false);

  const days = Number(dias);
  const count = Number(cantidad);
  const diasOk = Number.isInteger(days) && days >= 1 && days <= 3650;
  const cantidadOk = !conCantidad || (Number.isInteger(count) && count >= 1 && count <= 200);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!diasOk || !cantidadOk || enviando) return;
        setEnviando(true);
        const ok = await onEnviar({ days, plan: plan.trim() || "mensual", notes: notes.trim(), count });
        setEnviando(false);
        if (ok) setNotes("");
      }}
    >
      {titulo && <p className="title text-ink">{titulo}</p>}
      {detalle && <p className="body -mt-2 text-ink-muted">{detalle}</p>}

      <div className="flex flex-wrap items-end gap-3">
        {conCantidad && (
          <Campo label="Cuántos" error={!cantidadOk ? "Entre 1 y 200" : undefined}>
            <input
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              className={inputClass("w-20")}
            />
          </Campo>
        )}

        <Campo label="Días" error={!diasOk ? "Entre 1 y 3650" : undefined}>
          <div className="flex items-center gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setDias(String(p));
                  setPlan(planDe(p));
                }}
                className={`min-h-[44px] rounded-full px-4 text-[14px] transition-colors ${
                  dias === String(p) ? "bg-volt font-semibold text-on-volt" : "bg-surface-sunken text-ink hover:bg-line"
                }`}
              >
                {p}
              </button>
            ))}
            <input
              value={dias}
              onChange={(e) => setDias(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              aria-label="Días personalizados"
              className={inputClass("w-20")}
            />
          </div>
        </Campo>

        {conNota && (
          <>
            <Campo label="Plan">
              <input value={plan} onChange={(e) => setPlan(e.target.value)} className={inputClass("w-32")} />
            </Campo>
            <Campo label="Nota (opcional)">
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: pagó por Nequi el 27/09"
                maxLength={200}
                className={inputClass("w-64")}
              />
            </Campo>
          </>
        )}

        <button
          type="submit"
          disabled={!diasOk || !cantidadOk || enviando}
          className="btn-primary min-h-[52px]"
        >
          {enviando ? "Guardando…" : accion}
        </button>
      </div>
    </form>
  );
}

function planDe(days: number): string {
  if (days === 30) return "mensual";
  if (days === 90) return "trimestral";
  if (days === 180) return "semestral";
  if (days === 365) return "anual";
  return "personalizado";
}

type Tono = "volt" | "flare" | "danger" | "neutral";

/** Chip de estado: fondo tintado, texto *-ink e icono. El color nunca va solo. */
function Estado({ tono, children }: { tono: Tono; children: React.ReactNode }) {
  const cls = {
    volt: "bg-volt-soft text-volt-ink",
    flare: "bg-flare-soft text-flare-ink",
    danger: "bg-danger-soft text-danger-ink",
    neutral: "bg-surface-sunken text-ink-muted",
  }[tono];
  const Icon = tono === "volt" ? IconCheck : tono === "neutral" ? null : tono === "flare" ? IconAlert : IconX;
  return (
    <span className={`label inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-bold ${cls}`}>
      {Icon && <Icon size={14} />}
      {children}
    </span>
  );
}

function EstadoLicencia({ licencia: l }: { licencia: Usuario["licencia"] }) {
  if (!l) return <Estado tono="neutral">Sin licencia</Estado>;
  const vence = l.expiresAt ?? 0;
  const dias = Math.ceil((vence - Date.now()) / DAY);

  if (!l.vigente) {
    return (
      <div className="space-y-1">
        <Estado tono="danger">{l.plan === "trial" ? "Prueba terminada" : "Vencida"}</Estado>
        <p className="caption text-[13px] text-ink-muted">El {fecha(vence)}</p>
      </div>
    );
  }
  const pronto = dias <= 7;
  return (
    <div className="space-y-1">
      <Estado tono={pronto ? "flare" : l.plan === "trial" ? "neutral" : "volt"}>
        {l.plan === "trial" ? "Prueba gratis" : `Activa · ${l.plan}`}
      </Estado>
      <p className="caption text-[13px] text-ink-muted">
        {dias === 1 ? "Queda 1 día" : `Quedan ${dias} días`} · vence el {fecha(vence)}
      </p>
    </div>
  );
}

function EstadoCodigo({ licencia: l }: { licencia: Licencia }) {
  if (l.status === "revoked") return <Estado tono="danger">Revocada</Estado>;
  if (l.status === "available") return <Estado tono="neutral">Sin usar</Estado>;
  const vence = l.expiresAt ?? 0;
  if (vence <= Date.now()) return <Estado tono="danger">Vencida · {fecha(vence)}</Estado>;
  const pronto = vence - Date.now() < 7 * DAY;
  return <Estado tono={pronto ? "flare" : "volt"}>Activa hasta {fecha(vence)}</Estado>;
}

/**
 * Boton con confirmacion en el mismo lugar: el primer toque pregunta, el segundo hace.
 *
 * No es un `confirm()` del navegador porque esos se aceptan por reflejo sin leerlos. Aca la
 * pregunta dice que va a pasar, al lado de lo que se esta tocando.
 */
function Accion({
  children,
  onClick,
  confirmar,
  destructiva = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  confirmar?: string;
  destructiva?: boolean;
}) {
  const [preguntando, setPreguntando] = useState(false);
  const color = destructiva ? "text-danger-ink hover:text-ink" : "text-ink-muted hover:text-ink";

  if (preguntando && confirmar) {
    return (
      <span className="flex max-w-[34ch] flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[13px]">
        <span className="text-right text-ink">{confirmar}</span>
        <button
          type="button"
          onClick={() => {
            setPreguntando(false);
            onClick();
          }}
          className={`font-semibold ${destructiva ? "text-danger-ink" : "text-volt-ink"}`}
        >
          Sí
        </button>
        <button type="button" onClick={() => setPreguntando(false)} className="text-ink-muted hover:text-ink">
          No
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => (confirmar ? setPreguntando(true) : onClick())}
      className={`text-[13.5px] transition-colors ${color}`}
    >
      {children}
    </button>
  );
}

function Copiar({ texto, children }: { texto: string; children: React.ReactNode }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1600);
        } catch {
          // Sin permiso de portapapeles el texto sigue seleccionable a mano.
        }
      }}
      className="text-[12.5px] text-ink-muted underline-offset-2 hover:text-ink hover:underline"
    >
      {copiado ? "Copiado" : children}
    </button>
  );
}

function Chips<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={value === key}
          className={`min-h-[40px] rounded-full border px-4 text-[13.5px] transition-colors ${
            value === key ? "border-ink bg-ink font-bold text-surface" : "border-line-strong text-ink hover:bg-surface-sunken"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Campo({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label mb-2 block text-ink">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[12px] text-danger-ink">{error}</span>}
    </label>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" }) {
  return (
    <div className="rounded-[14px] border border-line bg-surface-raised p-5">
      <p className="eyebrow text-ink-muted">{label}</p>
      <p className={`metric mt-2 ${tone === "warn" ? "text-flare-ink" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function Banner({
  tone,
  children,
  onClose,
}: {
  tone: "error" | "info";
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`body mt-5 flex items-start justify-between gap-4 rounded-[14px] border px-4 py-3 ${
        tone === "error" ? "border-danger/40 bg-danger-soft text-ink" : "border-line bg-surface-sunken text-ink"
      }`}
    >
      <span>{children}</span>
      <button type="button" onClick={onClose} className="-my-1 flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink" aria-label="Cerrar aviso">
        ×
      </button>
    </div>
  );
}

function inputClass(width: string) {
  return `field ${width}`;
}

/** En grupos de cuatro, como se dicta: "ABCD-EFGH-JKMN". Se guarda sin guiones. */
function formatoCodigo(code: string): string {
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}

function fecha(ms: number): string {
  return new Date(ms).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}
