import { guard, json } from "../cms";
import { supa, BUCKET } from "../supa";
const types = new Map([["image/jpeg","jpg"], ["image/png","png"], ["image/webp","webp"], ["video/mp4","mp4"]]);
// A Vercel limita o corpo das funções a 4,5 MB; por isso o arquivo vai direto do navegador para o Supabase.
// Aqui só validamos o pedido e entregamos um link de envio assinado, de uso único.
export async function POST(req: Request) {
  const denied = await guard(req); if (denied) return denied;
  const input = await req.json().catch(() => null);
  const ext = types.get(input?.type);
  if (!ext) return json({error:"Escolha JPG, PNG, WebP ou vídeo MP4."},415);
  const limit = (ext === "mp4" ? 50 : 15) * 1024 * 1024;
  if (!Number.isSafeInteger(input.size) || input.size < 12 || input.size > limit) return json({error:"Arquivo vazio ou acima do limite de envio."},413);
  const key = crypto.randomUUID() + "." + ext;
  const { data, error } = await supa().storage.from(BUCKET).createSignedUploadUrl(key);
  if (error || !data) throw error ?? Error("Sem link de envio");
  return json({ src:"/media/"+key, uploadUrl:data.signedUrl, apikey:process.env.SUPABASE_PUBLISHABLE_KEY || null },201);
}
