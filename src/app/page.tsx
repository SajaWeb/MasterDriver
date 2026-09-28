import Link from "next/link";
import { IconAlert, IconCheck, IconDownload, IconVolume, IconX } from "@/components/Icons";
import { Mark } from "@/components/Mark";
import { OfferCard } from "@/components/OfferCard";
import { APP, PRICE, SUPPORT, formatCOP, whatsappUrl } from "@/lib/config";

/**
 * La página es un ejemplo trabajado, no un catálogo de funciones.
 *
 * Toma un viaje real —los números salen del motor de la app y los verifica LandingNumbersTest—
 * y lo sigue hasta el final. Noche donde se decide (el aviso), Día donde se cuenta (la cuenta del
 * viaje), igual que en la app.
 *
 * Lo que se promete tiene que ser lo que la app hace: el aviso decide con lo que el conductor
 * quiere ganar por hora y por kilómetro; los costos del carro van a la cuenta del día, no al aviso.
 */
export default function Home() {
  return (
    <>
      <header>
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Mark />
          <div className="flex items-center gap-6">
            <div className="label hidden items-center gap-6 text-ink-muted md:flex">
              <a href="#como-avisa" className="hover:text-ink">Cómo avisa</a>
              <a href="#instalar" className="hover:text-ink">Instalar</a>
              <a href="#descargar" className="hover:text-ink">Precio</a>
              <a href="#preguntas" className="hover:text-ink">Preguntas</a>
            </div>
            <a href="#descargar" className="btn-primary min-h-[44px] px-5 text-[14px]">
              Descargar
            </a>
          </div>
        </nav>
      </header>

      <Hero />
      <HowItWarns />
      <Ledger />
      <Hidden />
      <Install />
      <Pricing />
      <Faq />
      <Footer />
    </>
  );
}

function DownloadButton({ className = "" }: { className?: string }) {
  return (
    <a href={APP.downloadUrl} className={`btn-primary ${className}`}>
      <IconDownload size={20} />
      Descargar para Android
    </a>
  );
}

function Hero() {
  return (
    <section className="pb-20 pt-8 md:pb-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 md:grid-cols-[1.05fr_0.95fr] md:gap-10">
        <div className="rise">
          <h1 className="display-xl max-w-[15ch] text-ink">
            DiDi y Uber te dicen cuánto te pagan.{" "}
            <mark className="rounded-[10px] bg-volt px-2 text-on-volt [box-decoration-break:clone]">
              No cuánto te queda.
            </mark>
          </h1>

          <p className="body-lg mt-7 max-w-[50ch] text-ink-muted">
            MasterDriver lee cada oferta y te dice en voz alta, en el momento, si cumple lo que
            quieres ganar por hora y por kilómetro. Y al final del día te muestra cuánto te quedó
            de verdad, con la gasolina y el desgaste descontados.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <DownloadButton />
            <span className="label text-ink-muted">
              {PRICE.trialDays} días gratis · {APP.minAndroid}
            </span>
          </div>
        </div>

        <div className="rise [animation-delay:160ms]">
          <OfferCard />
        </div>
      </div>
    </section>
  );
}

/** Cómo avisa: la voz, los tres veredictos y la contraoferta. Lo que el conductor vive manejando. */
function HowItWarns() {
  const verdicts = [
    { word: "Acepta", body: "Cumple lo que quieres ganar por hora, por kilómetro y en recogida.", cls: "bg-volt text-on-volt", Icon: IconCheck },
    { word: "Evalúa", body: "Cumple una parte. La voz te dice qué falla: «Evalúa. 2.400 pesos el kilómetro».", cls: "bg-flare text-on-flare", Icon: IconAlert },
    { word: "Rechaza", body: "No cumple nada, o el viaje es muy corto, o la recogida no compensa.", cls: "bg-danger text-on-danger", Icon: IconX },
  ];

  return (
    <section id="como-avisa" className="scroll-mt-6 border-t border-line py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <p className="eyebrow text-volt-ink">Sin quitar los ojos de la vía</p>
        <h2 className="display mt-3 max-w-[20ch] text-ink">Te avisa por voz, con la palabra justa</h2>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {verdicts.map(({ word, body, cls, Icon }) => (
            <article key={word} className="card p-6">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${cls}`}>
                <Icon size={14} />
                <span className="eyebrow">{word}</span>
              </span>
              <p className="body mt-4 text-ink-muted">{body}</p>
            </article>
          ))}
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <article className="card flex gap-4 p-6">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-volt text-on-volt">
              <IconVolume size={22} />
            </span>
            <div>
              <h3 className="title text-ink">La voz baja la música, como el GPS</h3>
              <p className="body mt-2 text-ink-muted">
                Y si el teléfono va en el bolsillo, vibra distinto para cada veredicto.
              </p>
            </div>
          </article>
          <article className="card p-6">
            <h3 className="title text-ink">En «Pon Tu Precio», te dice cuánto pedir</h3>
            <p className="body mt-2 text-ink-muted">
              Si la oferta de DiDi no alcanza, calcula la tarifa que sí cumple tus números y la copia
              con un toque para que contraofertes.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

function Ledger() {
  // Estas cifras salen del motor de la app, no de una estimación: LandingNumbersTest en
  // core:engine las verifica contra el cálculo real y se cae si dejan de dar. Las filas suman
  // exactamente el total por reparto de resto mayor.
  const rows = [
    { label: "Gasolina de esos 11,7 km", amount: 5348 },
    { label: "Aceite, llantas y frenos", amount: 562 },
    { label: "Los 34 minutos de tu jornada", amount: 187 },
  ];

  return (
    <section className="theme-dia bg-surface py-20 text-ink md:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-[0.9fr_1.1fr] md:items-start">
        <div>
          <p className="eyebrow text-volt-ink">La cuenta del día</p>
          <h2 className="display mt-3 max-w-[16ch]">Qué queda de esos {formatCOP(19300)}</h2>
          <p className="body-lg mt-5 max-w-[46ch] text-ink-muted">
            El aviso decide con lo que tú quieres ganar. Esta es la otra mitad: al cerrar el día,
            la app descuenta lo que de verdad te costó rodar esos kilómetros, con tus números. Si
            no los sabes, empieza con el promedio de tu tipo de carro y los ajustas después.
          </p>
        </div>

        <div className="card p-6 md:p-8">
          <div className="flex items-baseline justify-between border-b border-line pb-4">
            <span className="body text-ink">Lo que ofrece el viaje</span>
            <span className="metric-sm text-[22px]">{formatCOP(19300)}</span>
          </div>
          <dl>
            {rows.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between border-b border-line py-3.5">
                <dt className="body text-ink-muted">{row.label}</dt>
                <dd className="metric-sm text-[16px] text-danger-ink">−{formatCOP(row.amount)}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex items-end justify-between">
            <span className="eyebrow text-ink-muted">Te queda</span>
            <span className="metric-xl text-volt-ink">{formatCOP(13203)}</span>
          </div>
          <p className="caption mt-4 text-[13px] text-ink-muted">
            Un 32 % menos de lo que dice la pantalla. Ninguna de las dos apps te hace esta cuenta.
          </p>
        </div>
      </div>
    </section>
  );
}

function Hidden() {
  const items = [
    {
      title: "Los kilómetros que nadie te paga",
      body:
        "Ir por el pasajero fueron 2,7 de los 11,7 kilómetros del viaje, con la gasolina puesta " +
        "por ti. MasterDriver los cuenta, y te avisa cuando la recogida es desproporcionada.",
    },
    {
      title: "El pase, que cada app informa distinto",
      body:
        "Uber no descuenta el Uber Pass de lo que te muestra; DiDi sí descuenta la Comisión 0. " +
        "La app lo resta una sola vez y donde hace falta, para no inventarte una pérdida.",
    },
    {
      title: "Lo que el carro se gasta callado",
      body:
        "Llantas, aceite, frenos y lo que el carro pierde de valor. Si anotas tus tanqueos, " +
        "la app mide tu rendimiento real y te avisa si el que creías tener es optimista.",
    },
  ];

  return (
    <section className="theme-dia border-t border-line bg-surface-sunken py-20 text-ink md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="display max-w-[16ch]">Lo que nadie te descuenta</h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {items.map((item) => (
            <article key={item.title} className="card p-6">
              <h3 className="title">{item.title}</h3>
              <p className="body mt-3 text-ink-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="descargar" className="scroll-mt-6 border-t border-line py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2">
        <div>
          <h2 className="display max-w-[14ch] text-ink">Pruébala {PRICE.trialDays} días sin pagar nada</h2>
          <p className="body-lg mt-5 max-w-[46ch] text-ink-muted">
            Entras con tu cuenta de Google y la prueba se activa sola. No pedimos tarjeta y no hay
            nada que cancelar: si al séptimo día no te sirvió, dejas de usarla y ya.
          </p>
          <p className="body mt-5 max-w-[46ch] text-ink-muted">
            Tu contabilidad y tus datos siguen siendo tuyos aunque no renueves. Lo que se apaga son
            los avisos mientras manejas.
          </p>
        </div>

        <div className="card p-8">
          <div className="flex items-baseline gap-2">
            <span className="metric-xl text-ink">{formatCOP(PRICE.amount)}</span>
            <span className="body-lg text-ink-muted">/ {PRICE.period}</span>
          </div>
          <p className="label mt-2 text-ink-muted">Un conductor, un teléfono.</p>

          <ul className="mt-7 space-y-3 border-t border-line pt-6">
            {[
              "Aviso por voz, vibración y en pantalla",
              "Funciona sin señal",
              "DiDi y Uber, incluido «Pon Tu Precio»",
              "Turnos, gastos y ganancia real del día",
            ].map((feature) => (
              <li key={feature} className="body flex items-center gap-3 text-ink">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-volt-soft text-volt-ink">
                  <IconCheck size={14} />
                </span>
                {feature}
              </li>
            ))}
          </ul>

          <DownloadButton className="mt-8 w-full" />
          <a
            href={whatsappUrl("Hola, quiero comprar una licencia de MasterDriver.")}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary mt-3 w-full"
          >
            Comprar licencia por WhatsApp
          </a>
          <p className="caption mt-3 text-center text-[13px] text-ink-muted">
            Descarga directa · {APP.minAndroid} · WhatsApp {SUPPORT.whatsappDisplay}
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Instalar sin Play Store. Es el paso donde mas gente se pierde: Android lo presenta como una
 * advertencia, y sin saber que viene, parece que algo anda mal.
 */
function Install() {
  const steps = [
    { title: "Descarga el archivo", body: "Toca «Descargar para Android» desde tu teléfono y permite que el navegador instale apps." },
    {
      title: "Si Play Protect la bloquea",
      body: "Play Store › tu foto › Play Protect › ⚙: apaga «Analizar apps con Play Protect», instala y vuelve a prenderlo.",
    },
    { title: "Entra con Google", body: "Abre MasterDriver y entra con tu cuenta. La prueba de 7 días se activa sola." },
    {
      title: "Activa la lectura de ofertas",
      body: "Si el ajuste sale gris: Ajustes › Aplicaciones › MasterDriver › ⋮ › «Permitir ajustes restringidos».",
    },
  ];
  return (
    <section id="instalar" className="scroll-mt-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <p className="eyebrow text-volt-ink">No está en la Play Store</p>
        <h2 className="display mt-3 max-w-[18ch] text-ink">Instálala en 4 pasos</h2>
        <ol className="mt-12 grid gap-5 md:grid-cols-4">
          {steps.map((step, i) => (
            <li key={step.title} className="card p-6">
              <span className="metric-sm flex size-9 items-center justify-center rounded-full bg-volt-soft text-volt-ink">
                {i + 1}
              </span>
              <h3 className="title mt-4 text-ink">{step.title}</h3>
              <p className="body mt-2 text-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>
        <p className="body mt-6 max-w-[80ch] text-ink-muted">
          Android frena las apps que leen la pantalla cuando no vienen de una tienda, porque es el
          permiso que usan las apps fraudulentas. MasterDriver solo mira DiDi y Uber. Después de
          instalarla no tienes que volver aquí: las versiones nuevas te llegan dentro de la app.
        </p>
      </div>
    </section>
  );
}

/** Lo que pregunta un conductor antes de instalar algo que lee su pantalla. Respuestas honestas. */
function Faq() {
  const faqs = [
    {
      q: "¿Por qué no está en la Play Store?",
      a: "Para poder leer las ofertas, la app usa el permiso de accesibilidad de Android, y la Play Store restringe ese permiso a herramientas para personas con discapacidad. Por eso se instala directo, como muchas apps de asistencia a conductores.",
    },
    {
      q: "¿Es seguro darle ese permiso?",
      a: "Solo mira DiDi y Uber: el permiso está limitado a esas dos apps y no ve tu banco, tus chats ni nada más. De cada oferta guarda solo números (tarifa, kilómetros, minutos), nunca nombres ni direcciones.",
    },
    {
      q: "¿Qué pasa cuando termina la prueba?",
      a: "La app deja de avisarte de las ofertas, pero tu contabilidad y tus datos siguen ahí. Si compras la licencia, se activa sola en tu cuenta sin tener que reinstalar nada.",
    },
    {
      q: "¿Funciona sin internet?",
      a: "Sí. Lee y evalúa las ofertas en el teléfono, sin conexión. Solo necesita internet de vez en cuando para confirmar tu licencia.",
    },
    {
      q: "¿Cómo pago la licencia?",
      a: `Escríbenos por WhatsApp al ${SUPPORT.whatsappDisplay}. Cuando pagues, te asignamos la licencia y la app la toma sola.`,
    },
    {
      q: "¿Uber o DiDi me pueden decir algo por usarla?",
      a: "MasterDriver no toca ni acepta ofertas por ti: solo lee lo que ya ves y te lo dice en voz alta. Aun así, sus términos pueden restringir apps de terceros, y es una decisión que tomas tú.",
    },
  ];
  return (
    <section id="preguntas" className="theme-dia scroll-mt-6 bg-surface py-20 text-ink md:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="display">Preguntas frecuentes</h2>
        <div className="mt-10 space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="card group p-6 [&_summary::-webkit-details-marker]:hidden">
              <summary className="title flex cursor-pointer list-none items-center justify-between gap-4 text-ink">
                {f.q}
                <span aria-hidden className="text-ink-muted transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="body mt-3 text-ink-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line py-10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-6">
        <Mark size={32} />
        <Link href="/entrar" className="label text-ink-muted transition-colors hover:text-ink">
          Panel de administración
        </Link>
      </div>
      <p className="caption mx-auto mt-6 max-w-6xl px-6 text-[13px] leading-relaxed text-ink-muted">
        MasterDriver no está afiliada a Uber ni a DiDi. Los nombres se usan solo para indicar con qué
        aplicaciones funciona.
      </p>
    </footer>
  );
}
