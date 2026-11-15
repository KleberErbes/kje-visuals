import * as shop from "./shop";
import * as home from "./routes/home";
import * as editor from "./routes/editor";
import * as upload from "./routes/upload";
import * as media from "./routes/media";
import { admin, signIn, signOut } from "./routes/admin";

type Handler = (request: Request) => Promise<Response>;
const routes: Record<string, Record<string, Handler>> = {
  "/": { GET: home.GET },
  "/loja": { GET: shop.storePage },
  "/pedido": { GET: shop.orderPage },
  "/admin/loja": { GET: shop.adminPage },
  "/api/loja": { GET: shop.catalog },
  "/api/loja/pedidos": { POST: shop.createOrder },
  "/api/loja/pedido": { GET: shop.getOrder },
  "/api/loja/download": { POST: shop.download },
  "/api/admin/loja": { GET: shop.adminData },
  "/api/admin/loja/config": { PUT: shop.saveSettings },
  "/api/admin/loja/produtos": { PUT: shop.saveProduct },
  "/api/admin/loja/upload": { POST: shop.upload },
  "/api/admin/loja/pedido": { POST: shop.updateOrder },
  "/admin": { GET: admin },
  "/admin/entrar": { POST: signIn },
  "/admin/sair": { POST: signOut },
  "/api/editor": { GET: editor.GET, PUT: editor.PUT, POST: editor.POST },
  "/api/upload": { POST: upload.POST }
};
export default {
  async fetch(req: Request): Promise<Response> {
    const path = new URL(req.url).pathname.replace(/\/$/, "") || "/";
    const methods = path.startsWith("/loja-previa/") ? { GET: shop.preview, HEAD: shop.preview } : path.startsWith("/media/") ? { GET: media.GET, HEAD: media.HEAD } : Object.hasOwn(routes,path) ? routes[path] : undefined;
    if (!methods) return new Response("Página não encontrada.", { status:404 });
    const handler = Object.hasOwn(methods,req.method) ? methods[req.method] : undefined;
    if (!handler) return new Response(null, { status:405, headers:{ Allow:Object.keys(methods).join(", ") } });
    try { return await handler(req); } catch (e) { console.error(e); return new Response("Erro interno. Confira as variáveis de ambiente e o Supabase.", { status:500 }); }
  }
};
