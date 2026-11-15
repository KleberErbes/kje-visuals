import { isOwner } from "./session";
export { isOwner };
import { supa } from "./supa";
import { z } from "zod";
import defaults from "./defaults.json";

export const noCache = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const builtin = new Set([defaults.hero.src, defaults.hero.cover, defaults.about.src,
  ...defaults.items.flatMap(i => [i.src, i.cover])]);
const uploadPath = /^\/media\/[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}\.(?:mp4|jpe?g|png|webp)$/;
const media = z.string().max(120).refine(v => builtin.has(v) || uploadPath.test(v));
const photo = media.refine(v => /\.(?:jpe?g|png|webp)$/.test(v));
const video = media.refine(v => v.endsWith(".mp4"));
const title = z.string().trim().min(1).max(100);
export const documentSchema = z.object({
  hero: z.object({ src: video, cover: photo, title }),
  about: z.object({ src: photo, alt: z.string().trim().min(1).max(220) }),
  items: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]{1,80}$/), kind: z.enum(["photo","video"]), title,
    category: z.enum(["paisagens","eventos"]), detail: z.string().trim().max(100),
    description: z.string().trim().max(700), alt: z.string().trim().max(220),
    src: media, cover: photo, portrait: z.boolean(), visible: z.boolean(),
    duration: z.number().finite().min(0).max(86400)
  }).refine(i => (i.kind === "video") === i.src.endsWith(".mp4"))).max(100)
}).refine(d => new Set(d.items.map(i => i.id)).size === d.items.length);
export type Portfolio = z.infer<typeof documentSchema>;
export type Item = Portfolio["items"][number];
export const baseline = documentSchema.parse(defaults);
export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: noCache });
export async function guard(request: Request) {
  if (!await isOwner(request)) return json({ error: "Entre no painel para continuar." }, 403);
  if (request.method !== "GET" && (request.headers.get("Origin") !== new URL(request.url).origin ||
      request.headers.get("X-KJE-Editor") !== "1")) return json({ error: "Origem inválida." }, 403);
  return null;
}
export async function readContent() {
  const { data, error } = await supa().from("portfolio_content").select("draft,published,revision,published_revision").eq("id", 1).maybeSingle();
  if (error) throw error;
  return {
    draft: data ? data.draft as Portfolio : baseline,
    live: data?.published ? data.published as Portfolio : baseline,
    revision: (data?.revision ?? 0) as number,
    publishedRevision: (data?.published_revision ?? 0) as number
  };
}
export const conflict = () => json({ error: "O rascunho mudou em outra aba. Recarregue o painel para ver a versão mais recente." }, 409);
export function validateRevision(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
