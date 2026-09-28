/**
 * La marca: la baldosa volt con la M (logo_tile.svg) y el nombre, "Master" en tinta y "Driver"
 * en volt. Es la misma que lleva el icono de la app, para que el sitio y el telefono se
 * reconozcan como una sola cosa.
 */
export function Mark({ size = 36 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-3">
      <LogoTile size={size} />
      <span className="font-[family-name:var(--font-display)] text-[20px] font-bold tracking-[-0.01em]">
        <span className="text-ink">Master</span>
        <span className="text-volt-ink">Driver</span>
      </span>
    </span>
  );
}

export function LogoTile({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      <rect width="36" height="36" rx="10" fill="#C8F031" />
      <g transform="translate(6 6)" fill="none">
        <path d="M5 18V7l7 7 7-7v11" stroke="#0B0D0E" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="7.6" r="1.9" fill="#0B0D0E" />
      </g>
    </svg>
  );
}
