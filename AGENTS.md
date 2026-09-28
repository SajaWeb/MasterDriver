<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## MasterDriver — convenciones de este sitio

**Las cifras del ejemplo no se editan a mano.** Los números de la landing (el viaje de $19.300)
salen del motor de la app y están verificados por `LandingNumbersTest` en
`android/core/engine`. Si hay que cambiarlos, se cambia allá primero y se copian acá: una
promesa publicada no puede quedar vieja en silencio.

**Colores y tipos salen del sistema de diseño** (`docs/design-system/tokens.json`, el mismo de
la app). Los tokens viven en `src/app/globals.css` con sus nombres: `surface`, `surface-raised`,
`ink`, `ink-muted`, `volt`, `volt-ink`, `flare-ink`, `danger-ink`… Nada de hex sueltos en los
componentes. Las secciones claras usan la clase `.theme-dia`, que redefine las mismas variables.

**Volt solo donde la app diría "acepta" o en la acción principal.** No tiñe títulos ni fondos.
Como texto va `text-volt-ink`, nunca `text-volt` (sobre Día no se lee).

**Botones siempre en píldora** (`btn-primary`, `btn-secondary`), tarjetas con `card`, campos con
`field`. Cifras en Sora con números tabulares (`metric-*`, `num`). Rotulos en mayuscula con `eyebrow` (no `overline`: esa es una utilidad de Tailwind que tacha por arriba).

**Textos en tú**, no en vos. Un veredicto nunca es solo color: icono y palabra
(Acepta / Evalúa / Rechaza).

**El precio vive solo en `src/lib/config.ts`.** Si aparece en dos lugares, uno queda viejo.

**El control de acceso del panel es la puerta, no la cerradura.** La seguridad real está en las
reglas de Firestore y en la verificación de rol de cada Cloud Function.
