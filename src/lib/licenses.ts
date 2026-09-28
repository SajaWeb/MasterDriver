import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "./firebase-admin";

/**
 * Reglas de licencias del lado del panel.
 *
 * Son las mismas que aplican las Cloud Functions en `functions/src/licenseSelection.ts`: cual
 * licencia vale cuando una cuenta tiene varias, y desde cuando cuentan los dias de una nueva. Si
 * el panel y la app decidieran distinto, el administrador veria "activa" una cuenta a la que la
 * app le dice "vencida". Cambiar una sin la otra es exactamente ese error.
 */

export const TRIAL_PLAN = "trial";
export const DAY_MS = 86_400_000;

export type LicenseStatus = "available" | "active" | "revoked";

export interface LicenseDoc {
  code: string;
  status: LicenseStatus;
  plan: string;
  days: number;
  uid: string | null;
  deviceId: string | null;
  createdAt: number;
  activatedAt: number | null;
  expiresAt: number | null;
  createdBy: string;
  notes?: string | null;
}

export type LicenseEntry = { id: string; data: LicenseDoc };

/** La licencia que vale hoy: la activa que vence mas tarde. */
export function pickCurrent(entries: LicenseEntry[], now: number) {
  const active = entries
    .filter((e) => e.data.status === "active")
    .sort((a, b) => (b.data.expiresAt ?? 0) - (a.data.expiresAt ?? 0));
  const current = active[0] ?? null;
  return { current, valid: current ? (current.data.expiresAt ?? 0) > now : false };
}

/** Los dias nuevos se suman al final de la licencia paga vigente. La prueba no cuenta. */
export function stackBase(entries: LicenseEntry[], now: number, excludeCode?: string): number {
  let base = now;
  for (const e of entries) {
    if (e.id === excludeCode) continue;
    if (e.data.status !== "active" || e.data.plan === TRIAL_PLAN) continue;
    if ((e.data.expiresAt ?? 0) > base) base = e.data.expiresAt as number;
  }
  return base;
}

export async function licensesOf(uid: string): Promise<LicenseEntry[]> {
  const snap = await adminDb().collection("licenses").where("uid", "==", uid).get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as LicenseDoc }));
}

/**
 * Deja los claims y el documento del usuario al dia con sus licencias.
 *
 * Las reglas de Firestore leen el vencimiento de los claims, asi que despues de asignar,
 * extender o revocar hay que reescribirlos. Si no queda ninguna vigente, se borran.
 */
export async function syncAccount(uid: string): Promise<void> {
  const { current, valid } = pickCurrent(await licensesOf(uid), Date.now());
  const user = await adminAuth().getUser(uid);
  const claims = { ...(user.customClaims ?? {}) } as Record<string, unknown>;

  if (current && valid) {
    claims.licenseId = current.id;
    claims.licenseExpiresAt = current.data.expiresAt;
  } else {
    delete claims.licenseId;
    delete claims.licenseExpiresAt;
  }
  await adminAuth().setCustomUserClaims(uid, claims);
  await adminDb()
    .collection("users")
    .doc(uid)
    .set(
      {
        licenseId: current && valid ? current.id : null,
        licenseExpiresAt: current && valid ? current.data.expiresAt : null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}
