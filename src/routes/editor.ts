import { guard, json, readContent, documentSchema, validateRevision, conflict } from "../cms";
import { supa } from "../supa";
export async function GET(req: Request) {
  const denied = await guard(req); if (denied) return denied;
  const { draft, revision, publishedRevision } = await readContent();
  return json({ draft, revision, publishedRevision });
}
export async function PUT(req: Request) {
  const denied = await guard(req); if (denied) return denied;
  const input = await req.json().catch(() => null);
  const content = documentSchema.safeParse(input?.draft);
  if (!content.success || !validateRevision(input?.revision)) return json({error:"Confira os campos e os arquivos dos trabalhos."}, 400);
  const revision: number = input.revision;
  const table = supa().from("portfolio_content");
  const { data, error } = revision === 0
    ? await table.insert({ id: 1, draft: content.data, revision: 1, published_revision: 0 }).select("revision").maybeSingle()
    : await table.update({ draft: content.data, revision: revision + 1 }).eq("id", 1).eq("revision", revision).select("revision").maybeSingle();
  if (error && error.code !== "23505") throw error;
  return data ? json(data) : conflict();
}
export async function POST(req: Request) {
  const denied = await guard(req); if (denied) return denied;
  const input = await req.json().catch(() => null);
  if (!validateRevision(input?.revision)) return json({error:"Revisão inválida."},400);
  const { data, error } = await supa().rpc("publish_portfolio", { rev: input.revision });
  if (error) throw error;
  return data ? json({ revision: data }) : conflict();
}
