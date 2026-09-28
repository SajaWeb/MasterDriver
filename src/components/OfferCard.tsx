import { IconCar, IconCheck } from "@/components/Icons";
import { formatCOP } from "@/lib/config";

/**
 * Lo que el conductor ve en su teléfono: la oferta de la app y, encima, el aviso de MasterDriver.
 *
 * El aviso es una réplica del overlay real (VerdictOverlay.kt): pildora de veredicto con icono y
 * palabra, cifras en Sora y el boton en pildora. Si el overlay cambia, este tambien.
 *
 * La tarjeta de atras no lleva logos ni colores de Uber ni de DiDi: es una ilustracion del
 * momento, no una copia de la interfaz de nadie. Las cifras salen del motor de la app y las
 * verifica LandingNumbersTest.
 */
export function OfferCard() {
  return (
    <div className="relative mx-auto w-full max-w-[400px]">
      {/* El aviso, flotando sobre la oferta como lo hace de verdad */}
      <div className="card relative z-10 ml-auto -mb-10 w-[74%] p-5 shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line-strong" aria-hidden />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-volt px-3 py-1.5 text-on-volt">
          <IconCheck size={14} />
          <span className="eyebrow">Acepta</span>
        </span>
        <p className="metric mt-3 text-ink">{formatCOP(19300)}</p>
        <p className="metric-sm mt-2 text-ink">
          {formatCOP(34059)} <span className="label text-ink-muted">/h</span>
        </p>
        <p className="metric-sm text-ink">
          {formatCOP(1650)} <span className="label text-ink-muted">/km</span>
        </p>
        <p className="caption mt-2 text-ink-muted">34 min · 11,7 km</p>
        <div className="btn-secondary mt-4 min-h-[44px] w-full text-[14px]">Tomé este viaje</div>
      </div>

      {/* La oferta de la app, atras */}
      <div className="card p-6 pt-14">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1 text-[13px] text-ink">
            <IconCar size={14} /> Oferta de viaje
          </span>
          <span className="caption text-ink-muted">0 % de tarifa de servicio</span>
        </div>

        <p className="metric-xl mt-4 text-ink">{formatCOP(19300)}</p>

        <div className="mt-5 space-y-3 border-t border-line pt-4">
          <TripLeg dot="bg-volt" time="9 min (2,7 km)" place="Autopista Regional, Envigado" />
          <TripLeg dot="bg-flare" time="25 min (9 km)" place="Urbanización Felicity, La Estrella" />
        </div>
      </div>

      <p className="caption mt-3 text-center text-ink-muted">Así se ve sobre tu pantalla mientras manejas</p>
    </div>
  );
}

function TripLeg({ dot, time, place }: { dot: string; time: string; place: string }) {
  return (
    <div className="flex gap-3">
      <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0">
        <p className="metric-sm text-[15px] text-ink">{time}</p>
        <p className="caption truncate text-[13px] text-ink-muted">{place}</p>
      </div>
    </div>
  );
}
