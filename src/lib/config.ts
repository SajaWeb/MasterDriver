/**
 * Datos del producto que cambian sin tocar el diseño.
 *
 * El precio vive acá y en ningún otro lado. Si aparece en dos sitios, tarde o temprano uno de
 * los dos queda viejo y el que ve el cliente es el equivocado.
 */

/**
 * PRECIO PROVISIONAL — hay que confirmarlo antes de publicar.
 *
 * Es el único valor de este repositorio que no salió de una fuente real: está puesto dentro del
 * rango de lo que cobran las apps de asistencia a conductores en Colombia, pero nadie lo decidió.
 */
export const PRICE = {
  amount: 25_000,
  currency: "COP",
  period: "mes",
  trialDays: 7,
} as const;

export const APP = {
  name: "MasterDriver",
  /** Siempre la última versión: la publica scripts/publicar-version.sh en Firebase Hosting. */
  downloadUrl: "https://masterdriver.site/descargas/masterdriver.apk",
  /** Página de descarga con los pasos de instalación, en el mismo Hosting. */
  installUrl: "https://masterdriver.site/",
  minAndroid: "Android 8 o superior",
  platforms: ["Uber", "DiDi"],
} as const;

/** Ventas y soporte de licencias. Vive solo acá, igual que el precio. */
export const SUPPORT = {
  whatsapp: "573239249986",
  whatsappDisplay: "+57 323 924 9986",
} as const;

export function whatsappUrl(text: string): string {
  return `https://wa.me/${SUPPORT.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function formatCOP(amount: number): string {
  return "$" + new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(amount);
}
