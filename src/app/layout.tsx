import type { Metadata } from "next";
import { DM_Sans, Sora } from "next/font/google";
import "./globals.css";

/**
 * Las dos familias del sistema de diseño: Sora para titulos y **todas** las cifras, DM Sans
 * para el texto. `next/font` las sirve desde el propio sitio, sin pedirle nada a Google en cada
 * visita.
 */
const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const description =
  "Lee la oferta de DiDi y Uber y te dice en voz alta, en el momento, si cumple lo que quieres " +
  "ganar. Y al final del día te muestra cuánto te quedó de verdad. 7 días gratis.";

export const metadata: Metadata = {
  title: "MasterDriver — sabe cuánto te queda de cada viaje",
  description,
  // La vista previa cuando el enlace se comparte por WhatsApp, que es por donde se reparte.
  openGraph: {
    title: "MasterDriver: DiDi y Uber te dicen cuánto te pagan. No cuánto te queda.",
    description,
    locale: "es_CO",
    type: "website",
  },
};

export const viewport = { themeColor: "#0b0d0e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={`${sora.variable} ${dmSans.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
