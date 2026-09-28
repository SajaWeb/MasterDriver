import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { BadRequest, generateCode, withAdmin } from "@/lib/admin-api";
import {
  DAY_MS,
  licensesOf,
  stackBase,
  syncAccount,
  type LicenseDoc,
} from "@/lib/licenses";

/**
 * Licencias, con el correo del dueño ya resuelto.
 *
 * El panel mostraba el uid, que no le dice nada a quien atiende a un conductor por WhatsApp. El
 * correo se busca aca, en lote, y no uno por uno desde el navegador.
 */
export const GET = withAdmin(async () => {
  const snapshot = await adminDb()
    .collection("licenses")
    .orderBy("createdAt", "desc")
    .limit(500)
    .get();

  const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as LicenseDoc) }));
  const emails = await emailsOf(docs.map((d) => d.uid).filter((u): u is string => !!u));

  return {
    licencias: docs.map((d) => ({ ...d, email: d.uid ? (emails.get(d.uid) ?? null) : null })),
  };
});

/**
 * Crea licencias. Dos formas, porque son dos maneras reales de vender:
 *
 *  - **Codigos sueltos** (`count`): para vender por adelantado o dejar a un distribuidor. El
 *    conductor lo escribe en la app.
 *  - **Directo a una cuenta** (`email`): el conductor ya pago y ya tiene la app. No hay codigo
 *    que dictar ni que se pueda equivocar al teclear: la licencia queda en su cuenta y el
 *    telefono la toma la proxima vez que se conecte.
 */
export const POST = withAdmin(async (session, request) => {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const days = Number(body.days ?? 30);
  const plan = cleanText(body.plan, 40) || "mensual";
  const notes = cleanText(body.notes, 200) || null;

  if (!Number.isInteger(days) || days < 1 || days > 3650) {
    throw new BadRequest("Los días deben estar entre 1 y 3650.");
  }

  const now = Date.now();

  if (typeof body.email === "string" && body.email.trim()) {
    const email = body.email.trim().toLowerCase();
    const user = await adminAuth().getUserByEmail(email).catch(() => null);
    if (!user) {
      throw new BadRequest(
        `No hay ninguna cuenta con el correo ${email}. El conductor tiene que registrarse primero en la app.`,
      );
    }

    const code = generateCode();
    const expiresAt = stackBase(await licensesOf(user.uid), now) + days * DAY_MS;
    const doc: LicenseDoc = {
      code,
      status: "active",
      plan,
      days,
      uid: user.uid,
      // Sin telefono: queda amarrada al primero que la use, que es el del conductor.
      deviceId: null,
      createdAt: now,
      activatedAt: now,
      expiresAt,
      createdBy: session.uid,
      notes,
    };
    await adminDb().collection("licenses").doc(code).set(doc);
    await syncAccount(user.uid);

    return { codes: [code], asignada: { email, expiresAt } };
  }

  const count = Number(body.count ?? 1);
  if (!Number.isInteger(count) || count < 1 || count > 200) {
    throw new BadRequest("La cantidad debe estar entre 1 y 200.");
  }

  const batch = adminDb().batch();
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = generateCode();
    codes.push(code);
    const doc: LicenseDoc = {
      code,
      status: "available",
      plan,
      days,
      uid: null,
      deviceId: null,
      createdAt: now,
      activatedAt: null,
      expiresAt: null,
      createdBy: session.uid,
      notes,
    };
    batch.set(adminDb().collection("licenses").doc(code), doc);
  }
  await batch.commit();
  return { codes };
});

export const PATCH = withAdmin(async (_session, request) => {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const code = String(body.code ?? "").toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const action = String(body.action ?? "");

  if (!code) throw new BadRequest("Falta el código.");

  const ref = adminDb().collection("licenses").doc(code);
  const snap = await ref.get();
  if (!snap.exists) throw new BadRequest("Esa licencia no existe.");
  const license = snap.data() as LicenseDoc;

  if (action === "revocar") {
    if (license.status === "revoked") throw new BadRequest("Esa licencia ya estaba revocada.");
    await ref.update({ status: "revoked" });
    // Las reglas de Firestore cortan en la peticion siguiente. El telefono conserva un token
    // firmado hasta que se agota su margen de 7 dias: es el precio de funcionar sin señal.
    if (license.uid) await syncAccount(license.uid);
    return { ok: true, aviso: "Revocada. El teléfono puede seguir funcionando hasta 7 días sin conexión." };
  }

  if (action === "liberar") {
    await ref.update({ deviceId: null });
    return {
      ok: true,
      aviso: "Teléfono liberado. La licencia queda amarrada al próximo teléfono donde el conductor entre.",
    };
  }

  if (action === "extender") {
    if (license.status === "revoked") throw new BadRequest("No se puede extender una licencia revocada.");
    const days = Number(body.days ?? 0);
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      throw new BadRequest("Los días deben estar entre 1 y 3650.");
    }

    // Sin activar todavia: se agranda lo que va a dar cuando la activen.
    if (license.status === "available") {
      await ref.update({ days: license.days + days });
      return { ok: true, aviso: `El código ahora da ${license.days + days} días al activarse.` };
    }

    // Activa: se suma desde su vencimiento, o desde hoy si ya vencio. Quien renueva tarde no
    // tiene por que pagar los dias en que estuvo sin licencia.
    const base = Math.max(license.expiresAt ?? 0, Date.now());
    const expiresAt = base + days * DAY_MS;
    await ref.update({ expiresAt, days: license.days + days });
    if (license.uid) await syncAccount(license.uid);
    return {
      ok: true,
      aviso: `Extendida hasta el ${new Date(expiresAt).toLocaleDateString("es-CO")}. El teléfono la toma al conectarse.`,
    };
  }

  if (action === "nota") {
    await ref.update({ notes: cleanText(body.notes, 200) || null });
    return { ok: true };
  }

  throw new BadRequest("Acción desconocida.");
});

function cleanText(raw: unknown, max: number): string {
  return typeof raw === "string" ? raw.trim().slice(0, max) : "";
}

/** Correos de varios usuarios en lotes de 100, que es el maximo de `getUsers`. */
async function emailsOf(uids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(uids)];
  const out = new Map<string, string>();
  for (let i = 0; i < unique.length; i += 100) {
    const { users } = await adminAuth().getUsers(unique.slice(i, i + 100).map((uid) => ({ uid })));
    for (const u of users) if (u.email) out.set(u.uid, u.email);
  }
  return out;
}
