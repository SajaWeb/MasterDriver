import "server-only";

/**
 * Freno de intentos, en memoria del proceso.
 *
 * **Esto no reemplaza un limitador de verdad.** Vive en memoria, así que no sirve entre varias
 * instancias ni sobrevive a un reinicio, y en un despliegue sin servidor cada función fría
 * arranca con el contador en cero. Lo que sí hace es encarecer el ataque más común, que es
 * probar contraseñas desde una sola máquina, y eso ya vale.
 *
 * Para producción con tráfico real hay que pasarlo a un almacén compartido (Redis, Firestore) o
 * ponerle un WAF adelante. Queda anotado a propósito: una defensa que se cree más fuerte de lo
 * que es resulta peor que no tenerla, porque nadie la revisa.
 */
type Attempt = { count: number; resetAt: number };

const attempts = new Map<string, Attempt>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  { limit = 8, windowSeconds = 300 } = {},
): RateLimitResult {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  current.count += 1;
  if (current.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * De dónde viene la petición.
 *
 * Detrás de un proxy, `x-forwarded-for` trae la cadena completa y el primero es el cliente. Se
 * confía en esa cabecera solo porque el despliegue está detrás de un proxy que la reescribe; en
 * un servidor expuesto directo, un atacante la falsea y el freno no sirve de nada.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "desconocido";
}
