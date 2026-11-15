import { isOwner, readContent, noCache } from "../cms";
import { supa, BUCKET } from "../supa";
async function serve(req: Request) {
  const key = new URL(req.url).pathname.split("/").pop() || "";
  if (!/^[a-f0-9-]{36}\.(mp4|jpg|png|webp)$/.test(key)) return new Response(null,{status:404});
  if (!await isOwner(req)) {
    const {live} = await readContent();
    const visible = live.items.filter(i => i.visible).flatMap(i => [i.src,i.cover]);
    if (![live.hero.src,live.hero.cover,live.about.src,...visible].includes("/media/"+key)) return new Response(null,{status:404});
  }
  // Bucket privado: redireciona para um link assinado temporário (o Supabase serve o arquivo, com Range para vídeo).
  const { data } = await supa().storage.from(BUCKET).createSignedUrl(key, 3600);
  if (!data?.signedUrl) return new Response(null,{status:404});
  return new Response(null,{status:302,headers:{...noCache,"Cache-Control":"private, max-age=600",Location:data.signedUrl}});
}
export const GET=serve;
export const HEAD=serve;
