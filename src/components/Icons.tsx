/**
 * Iconos de linea del sistema de diseño (docs/design-system): 24 px, trazo 2, extremos redondos,
 * teñidos con el color del texto (`currentColor`).
 */
type Props = { size?: number; className?: string };

function Svg({ size = 18, className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export const IconCheck = (p: Props) => <Svg {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
export const IconAlert = (p: Props) => <Svg {...p}><path d="M12 7v6M12 17h.01" /></Svg>;
export const IconX = (p: Props) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const IconCar = (p: Props) => (
  <Svg {...p}>
    <path d="M3 17v-4l2.2-5.2A2 2 0 0 1 7 6.5h10a2 2 0 0 1 1.8 1.3L21 13v4z" />
    <path d="M3 13h18" />
    <path d="M6 17v2M18 17v2" />
  </Svg>
);
export const IconVolume = (p: Props) => (
  <Svg {...p}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    <path d="M15.5 9a4 4 0 0 1 0 6" />
    <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
  </Svg>
);
export const IconDownload = (p: Props) => (
  <Svg {...p}>
    <path d="M12 4v11M7 10.5l5 5 5-5" />
    <path d="M5 20h14" />
  </Svg>
);
export const IconUser = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
  </Svg>
);
