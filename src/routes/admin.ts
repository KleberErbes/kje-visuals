import { tpl } from "../templates";
const panel = tpl("panel.html"), login = tpl("login.html");
import { noCache } from "../cms";
import { configured, isOwner, createSession, endSession } from "../session";

function html(page: string, status = 200) {
  return new Response(page, { status, headers: { ...noCache, "Content-Type": "text/html; charset=utf-8",
    "X-Robots-Tag": "noindex, nofollow", "Content-Security-Policy": "frame-ancestors 'none'; form-action 'self'; base-uri 'none'" } });
}
function loginPage(message = "", status = 200) { return html(login.replace("{{MESSAGE}}",message),status); }
function redirect(cookie: string) {
  return new Response(null,{ status:303, headers:{ ...noCache, "Location":"/admin", "Set-Cookie":cookie } });
}
export async function admin(req: Request) {
  if (!configured()) return loginPage("A chave do painel precisa ser configurada na hospedagem.",503);
  return await isOwner(req) ? html(panel) : loginPage();
}
export async function signIn(req: Request) {
  if (req.headers.get("Origin") !== new URL(req.url).origin) return new Response(null,{status:403});
  if (!configured()) return loginPage("A chave do painel precisa ser configurada na hospedagem.",503);
  if (req.headers.get("Content-Type")?.split(";")[0] !== "application/x-www-form-urlencoded") return new Response(null,{status:415});
  const size=Number(req.headers.get("Content-Length"));
  if (!Number.isSafeInteger(size) || size<1 || size>512) return new Response(null,{status:413});
  const key = new URLSearchParams(await req.text()).get("key") || "";
  const cookie = await createSession(key);
  return cookie ? redirect(cookie) : loginPage("Chave incorreta. Tente novamente.",401);
}
export async function signOut(req: Request) {
  if (req.headers.get("Origin") !== new URL(req.url).origin) return new Response(null,{status:403});
  return redirect(await endSession(req));
}
