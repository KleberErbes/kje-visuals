import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { supa } from "./supa";

const cookieName = "__Host-kje_editor";
const sessionSeconds = 60 * 60 * 8;
const cookieOptions = "Path=/; HttpOnly; Secure; SameSite=Strict";
const adminKey = () => process.env.ADMIN_KEY ?? "";

export function configured() { return /^[a-f0-9]{64}$/.test(adminKey()); }

function cookieValue(req: Request) {
  const value = (req.headers.get("Cookie") || "").split(";").map(v => v.trim())
    .find(v => v.startsWith(cookieName + "="))?.slice(cookieName.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}
const sessionHash = (token: string) => createHash("sha256").update(adminKey() + ":" + token).digest("hex");

export async function isOwner(req: Request) {
  const token = cookieValue(req);
  if (!configured() || !token) return false;
  const { data } = await supa().from("editor_sessions").select("token_hash")
    .eq("token_hash", sessionHash(token)).gt("expires_at", Date.now()).maybeSingle();
  return !!data;
}

export async function createSession(key: string) {
  if (!configured() || !/^[a-f0-9]{64}$/.test(key)) return null;
  if (!timingSafeEqual(Buffer.from(key), Buffer.from(adminKey()))) return null;
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  await supa().from("editor_sessions").delete().lte("expires_at", now);
  const { error } = await supa().from("editor_sessions").insert({ token_hash: sessionHash(token), expires_at: now + sessionSeconds * 1000 });
  if (error) throw error;
  return cookieName + "=" + token + "; " + cookieOptions + "; Max-Age=" + sessionSeconds;
}

export async function endSession(req: Request) {
  const token = cookieValue(req);
  if (token && configured()) await supa().from("editor_sessions").delete().eq("token_hash", sessionHash(token));
  return cookieName + "=; " + cookieOptions + "; Max-Age=0";
}
