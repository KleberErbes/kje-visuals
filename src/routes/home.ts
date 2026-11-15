import { readContent, isOwner, noCache } from "../cms";
import { render } from "../render";
export async function GET(req: Request) {
  const owner=await isOwner(req);
  const preview=new URL(req.url).searchParams.get("rascunho")==="1";
  if (preview && !owner) return new Response("Acesso restrito.",{status:403,headers:noCache});
  const state=await readContent();
  return new Response(render(preview ? state.draft : state.live,owner,preview,new URL(req.url).origin),{
    headers:{...noCache,"Content-Type":"text/html; charset=utf-8"}
  });
}
