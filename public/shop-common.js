export const $=id=>document.getElementById(id);
export const money=cents=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export const bytes=n=>n>=1048576?(n/1048576).toFixed(1)+' MB':Math.ceil(n/1024)+' KB';
export const date=value=>new Date(value).toLocaleString('pt-BR');
export const statusName={pending:'Aguardando pagamento',paid:'Download liberado',cancelled:'Cancelado',expired:'Pedido expirado',revoked:'Acesso revogado'};
export function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
export function button(text,action,cls='btn'){const b=el('button',text,cls);b.type='button';b.onclick=action;return b;}
export async function api(path,method='GET',body,token){const r=await fetch(path,{method,cache:'no-store',credentials:'same-origin',headers:{'Content-Type':'application/json','X-KJE-Shop':'1','X-KJE-Editor':'1',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'Não foi possível concluir. Atualize a página e tente novamente.');return data;}
export function getStored(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
export function store(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function notice(text,error=false,id='notice'){const n=$(id);n.textContent=text;n.hidden=!text;n.classList.toggle('error',error);}
export async function copy(value,target){try{await navigator.clipboard.writeText(value);if(target){const old=target.textContent;target.textContent='Copiado!';setTimeout(()=>target.textContent=old,1800);}}catch{window.prompt('Copie o texto abaixo:',value);}}
export function secret(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');}
export function contactLink(phone,label){const a=el('a',label,'btn');a.href='https://wa.me/'+phone;a.target='_blank';a.rel='noopener noreferrer';return a;}
