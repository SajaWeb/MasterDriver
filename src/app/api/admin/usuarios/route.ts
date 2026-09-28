import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { BadRequest, withAdmin } from "@/lib/admin-api";
import { pickCurrent, type LicenseDoc, type LicenseEntry } from "@/lib/licenses";

/**
 * Cuentas con el estado de su licencia.
 *
 * El estado sale de la coleccion de licencias con la misma regla que usa la app para decidir, no
 * de los claims del token: los claims se borran al revocar y no distinguen una prueba de una
 * licencia paga, y el panel mostraba "Sin licencia" a quien estaba en su semana gratis.
 */
export const GET = withAdmin(async () => {
  const [{ users }, activas] = await Promise.all([
    adminAuth().listUsers(1000),
    adminDb().collection("licenses").where("status", "==", "active").get(),
  ]);

  const porCuenta = new Map<string, LicenseEntry[]>();
  for (const doc of activas.docs) {
    const data = doc.data() as LicenseDoc;
    if (!data.uid) continue;
    const list = porCuenta.get(data.uid) ?? [];
    list.push({ id: doc.id, data });
    porCuenta.set(data.uid, list);
  }

  const now = Date.now();
  return {
    usuarios: users.map((user) => {
      const { current, valid } = pickCurrent(porCuenta.get(user.uid) ?? [], now);
      return {
        uid: user.uid,
        email: user.email ?? null,
        role: (user.customClaims?.role as string) ?? "user",
        disabled: user.disabled,
        createdAt: user.metadata.creationTime ?? null,
        lastSignIn: user.metadata.lastSignInTime ?? null,
        licencia: current
          ? {
              code: current.id,
              plan: current.data.plan,
              expiresAt: current.data.expiresAt,
              vigente: valid,
              deviceBound: !!current.data.deviceId,
              notes: current.data.notes ?? null,
            }
          : null,
      };
    }),
  };
});

export const PATCH = withAdmin(async (session, request) => {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const uid = String(body.uid ?? "");
  const role = String(body.role ?? "");

  if (!uid) throw new BadRequest("Falta el usuario.");
  if (role !== "user" && role !== "admin") {
    throw new BadRequest("El rol debe ser 'user' o 'admin'.");
  }

  // Quitarse el propio rol deja el sistema sin nadie que pueda devolverlo. Se bloquea acá y no
  // solo en la interfaz: un botón deshabilitado no es una restricción.
  if (uid === session.uid && role !== "admin") {
    throw new BadRequest("No puedes quitarte tu propio rol de administrador.");
  }

  const user = await adminAuth().getUser(uid);
  await adminAuth().setCustomUserClaims(uid, { ...(user.customClaims ?? {}), role });
  await adminDb().collection("users").doc(uid).set({ role }, { merge: true });

  // Los claims viajan dentro del token: sin revocar, el usuario conserva el rol viejo hasta que
  // su token venza. Al degradar a alguien, esa espera es justo lo que no se quiere.
  await adminAuth().revokeRefreshTokens(uid);

  return { ok: true, aviso: role === "admin" ? "Ahora es administrador." : "Ya no es administrador." };
});
