import { z } from 'zod';
import { createHash, randomBytes } from 'node:crypto';
import { supa } from './supa';
import { guard, json, noCache, isOwner } from './cms';
import { tpl } from './templates';
export const fileKey = z.string().regex(/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}\.(jpg|png|webp|mp4)$/);
const imageKey = fileKey.refine(v => !v.endsWith('.mp4'));
export const productSchema = z.object({
 id:z.string().uuid().optional(), title:z.string().trim().min(1).max(100),
 description:z.string().trim().max(1500),kind:z.enum(['photo','video']),
 category:z.string().trim().max(60),specifications:z.string().trim().max(160),
 price_cents:z.number().int().min(100).max(10000000), license:z.string().trim().min(10).max(3000),
 active:z.boolean(), preview_key:fileKey, cover_key:imageKey, original_key:fileKey,
 original_name:z.string().trim().min(1).max(200).regex(/^[^/\\\x00-\x1f]+$/),
 original_size:z.number().int().min(12).max(50*1024*1024)
}).refine(p => (p.kind==='video')===p.original_key.endsWith('.mp4') && (p.kind==='video')===p.preview_key.endsWith('.mp4'));
export const settingsSchema=z.object({enabled:z.boolean(),pix_key:z.string().trim().max(200),beneficiary:z.string().trim().max(100),instructions:z.string().trim().max(1000),contact:z.string().regex(/^$|^[0-9]{10,15}$/)}).refine(s=>!s.enabled||(s.pix_key.length>=3&&s.beneficiary.length>=2));
export const checkoutSchema=z.object({token:z.string().regex(/^[a-f0-9]{64}$/),ids:z.array(z.string().uuid()).min(1).max(20),name:z.string().trim().min(2).max(100),email:z.string().trim().email().max(254),phone:z.string().trim().max(25),accept:z.literal(true),expected_total:z.number().int().min(100).max(200000000)}).refine(v=>new Set(v.ids).size===v.ids.length);
export const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const publicFields='id,title,description,kind,category,specifications,price_cents,license,preview_key,cover_key';
const fail=(error:unknown)=>{if(error) throw error;};
async function input(req:Request) {
 if(!req.headers.get('Content-Type')?.startsWith('application/json')) return null;
 const text=await req.text();if(text.length>20000)return null;
 try{return JSON.parse(text);}catch{return null;}
}
const sameOrigin=(req:Request)=>req.headers.get('Origin')===new URL(req.url).origin&&req.headers.get('X-KJE-Shop')==='1';
export function orderStatus(order:{status:string;expires_at:string}) {return order.status==='pending'&&Date.parse(order.expires_at)<=Date.now()?'expired':order.status;}
export function publicOrder(order:any) {
 return {id:order.id,status:orderStatus(order),created_at:order.created_at,expires_at:order.expires_at,paid_at:order.paid_at,
 total_cents:order.total_cents,payment:order.payment,items:order.items.map((i:any)=>({id:i.id,title:i.title,kind:i.kind,price_cents:i.price_cents,license:i.license,specifications:i.specifications,original_size:i.original_size}))};
}
async function authenticatedOrder(req:Request) {
 const token=req.headers.get('Authorization')?.replace(/^Bearer /,'');
 if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
 const {data,error}=await supa().from('shop_orders').select('*').eq('token_hash',hash(token)).maybeSingle();fail(error);return data;
}
function page(name:string) {return new Response(tpl(name),{headers:{...noCache,'Content-Type':'text/html; charset=utf-8','Referrer-Policy':'no-referrer','Content-Security-Policy':"frame-ancestors 'none'; base-uri 'none'; form-action 'self'",'X-Robots-Tag':'noindex'}});}
export async function storePage(){return page('shop.html');}
export async function orderPage(){return page('order.html');}
export async function adminPage(req:Request){if(!await isOwner(req))return new Response(null,{status:303,headers:{Location:'/admin',...noCache}});return page('shop-admin.html');}
export async function catalog(){
 const {data:settings,error}=await supa().from('shop_settings').select('enabled,contact').eq('id',1).single();fail(error);
 if(!settings?.enabled)return json({enabled:false,contact:settings?.contact,products:[]});
 const {data,error:err}=await supa().from('shop_products').select(publicFields).eq('active',true).order('created_at',{ascending:false}).limit(500);fail(err);
 return json({enabled:true,contact:settings?.contact,products:data});
}
export async function createOrder(req:Request){
 if(!sameOrigin(req))return json({error:'Origem inválida.'},403);
 const parsed=checkoutSchema.safeParse(await input(req));if(!parsed.success)return json({error:'Confira seus dados, os itens e a aceitação das licenças.'},400);
 const p=parsed.data;
 const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
 const rate=hash((process.env.ADMIN_KEY||'')+':'+(ip==='unknown'?p.email.toLowerCase():ip));
 const {error}=await supa().rpc('shop_create_order',{p_hash:hash(p.token),p_ids:p.ids,p_name:p.name,p_email:p.email,p_phone:p.phone,p_rate:rate,p_total:p.expected_total});
 if(error){const m=error.message||'';if(m.includes('RATE_LIMIT'))return json({error:'Muitos pedidos recentes. Tente novamente em uma hora.'},429);
 if(m.includes('SHOP_CLOSED'))return json({error:'A loja está pausada. Tente mais tarde.'},409);
 if(m.includes('PRICE_CHANGED'))return json({error:'O preço mudou. Feche a seleção, atualize a página e confira o novo total antes de continuar.'},409);
 if(m.includes('UNAVAILABLE_PRODUCT'))return json({error:'Um item saiu de venda. Atualize o catálogo antes de continuar.'},409);throw error;}
 const order=await authenticatedOrder(new Request(req.url,{headers:{Authorization:'Bearer '+p.token}}));
 return json(publicOrder(order),201);
}
export async function getOrder(req:Request){const order=await authenticatedOrder(req);return order?json(publicOrder(order)):json({error:'Pedido não encontrado. Abra o link completo recebido ao fazer o pedido.'},404);}
export async function download(req:Request){
 if(!sameOrigin(req))return json({error:'Origem inválida.'},403);
 const order=await authenticatedOrder(req);if(!order||order.status!=='paid')return json({error:'Download disponível somente após a confirmação do pagamento.'},403);
 const payload=await input(req);const item=order.items.find((i:any)=>i.id===payload?.item_id);
 if(!item)return json({error:'Este arquivo não pertence ao pedido.'},404);
 const {data,error}=await supa().storage.from('shop-originals').createSignedUrl(item.original_key,60,{download:item.original_name});fail(error);
 return json({url:data?.signedUrl});
}
export async function preview(req:Request){
 const key=new URL(req.url).pathname.split('/').pop()||'';
 if(!fileKey.safeParse(key).success)return new Response(null,{status:404});
 if(!await isOwner(req)){
  const {data:settings,error:se}=await supa().from('shop_settings').select('enabled').eq('id',1).single();fail(se);
  if(!settings?.enabled)return new Response(null,{status:404});
  const {data,error}=await supa().from('shop_products').select('id').eq('active',true).or(`preview_key.eq.${key},cover_key.eq.${key}`).limit(1);fail(error);
  if(!data?.length)return new Response(null,{status:404});
 }
 const {data,error}=await supa().storage.from('shop-previews').createSignedUrl(key,300);fail(error);
 return new Response(null,{status:302,headers:{...noCache,Location:data!.signedUrl,'Referrer-Policy':'no-referrer'}});
}
export async function adminData(req:Request){
 const denied=await guard(req);if(denied)return denied;
 const url=new URL(req.url), pageIndex=Math.max(0,Math.min(10000,parseInt(url.searchParams.get('page')||'0')||0));
 const status=url.searchParams.get('status')||'';
 let query=supa().from('shop_orders').select('id,customer_name,customer_email,customer_phone,status,total_cents,items,payment,created_at,expires_at,paid_at',{count:'exact'});
 if(['pending','paid','cancelled','revoked'].includes(status))query=query.eq('status',status);
 const [{data:products,error:p},{data:settings,error:s},{data:orders,error:o,count}]=await Promise.all([
 supa().from('shop_products').select('*').order('created_at',{ascending:false}).limit(500),
 supa().from('shop_settings').select('*').eq('id',1).single(),query.order('created_at',{ascending:false}).range(pageIndex*25,pageIndex*25+24)]);
 fail(p);fail(s);fail(o);return json({products,settings,orders:orders?.map(o=>({...o,status:orderStatus(o)})),count,page:pageIndex});
}
export async function saveSettings(req:Request){const denied=await guard(req);if(denied)return denied;
 const parsed=settingsSchema.safeParse(await input(req));if(!parsed.success)return json({error:'Preencha a chave Pix, o favorecido e um WhatsApp com DDI e DDD (ou deixe o WhatsApp vazio).'},400);
 const {error}=await supa().from('shop_settings').update({...parsed.data,updated_at:new Date().toISOString()}).eq('id',1);fail(error);return json({ok:true});}
export async function saveProduct(req:Request){const denied=await guard(req);if(denied)return denied;
 const parsed=productSchema.safeParse(await input(req));if(!parsed.success)return json({error:'Confira título, preço, licença, prévias e arquivo original.'},400);
 const p=parsed.data;
 // Confirma uploads concluídos; chaves assinadas que ainda não receberam bytes não viram produtos.
 for(const [bucket,key,size] of [['shop-originals',p.original_key,p.original_size],['shop-previews',p.preview_key,0],['shop-previews',p.cover_key,0]] as const){
 const {data,error}=await supa().storage.from(bucket).info(key);
 if(error||!data||!data.size||data.size>50*1024*1024||(size&&data.size!==size))return json({error:'Um arquivo ainda não foi enviado corretamente. Envie os arquivos novamente.'},400);
 }
 const now=new Date().toISOString();let result;
 if(p.id)result=await supa().from('shop_products').update({...p,updated_at:now}).eq('id',p.id).select('id').maybeSingle();
 else result=await supa().from('shop_products').insert({...p,updated_at:now}).select('id').single();
 fail(result.error);return result.data?json({id:result.data.id}):json({error:'Produto não encontrado.'},404);
}
export async function upload(req:Request){const denied=await guard(req);if(denied)return denied;
 const p=await input(req),types:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4'};
 if(!p||!['original','preview'].includes(p.purpose)||!Object.hasOwn(types,p.type)||!Number.isSafeInteger(p.size)||p.size<12||p.size>50*1024*1024)return json({error:'Use JPG, PNG, WebP ou MP4 até 50 MB.'},400);
 const key=randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/,'$1-$2-$3-$4-$5')+'.'+types[p.type];
 const {data,error}=await supa().storage.from(p.purpose==='original'?'shop-originals':'shop-previews').createSignedUploadUrl(key);fail(error);
 return json({key,uploadUrl:data!.signedUrl},201);
}
export async function updateOrder(req:Request){const denied=await guard(req);if(denied)return denied;
 const p=await input(req);if(!z.string().uuid().safeParse(p?.id).success||!['paid','cancelled','revoked','access'].includes(p?.action))return json({error:'Ação inválida.'},400);
 const now=new Date().toISOString();
 if(p.action==='access'){
  const token=randomBytes(32).toString('hex');const {data,error}=await supa().from('shop_orders').update({token_hash:hash(token),updated_at:now}).eq('id',p.id).select('id').maybeSingle();fail(error);
  return data?json({token}):json({error:'Pedido não encontrado.'},404);
 }
 let query=supa().from('shop_orders').update({status:p.action,updated_at:now,...(p.action==='paid'?{paid_at:now}:{})}).eq('id',p.id).eq('status',p.action==='revoked'?'paid':'pending');
 if(p.action==='paid')query=query.gt('expires_at',now);
 const {data,error}=await query.select('id').maybeSingle();fail(error);
 return data?json({ok:true}):json({error:'O pedido mudou ou expirou. Atualize a lista antes de continuar.'},409);
}
