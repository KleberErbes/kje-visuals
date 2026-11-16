import {api,el,money} from './shop-common.js';
const root=document.getElementById('home-products');
const note=document.getElementById('home-store-note');
// A vitrine utiliza apenas produtos públicos e nunca recebe caminhos de originais.
async function load(){
 try{const data=await api('/api/loja');
  if(!data.enabled){note.textContent='Acervo em preparação. Novos arquivos em breve.';return;}
  const products=data.products.slice(0,3);
  if(!products.length){note.textContent='Novos arquivos em breve.';return;}
  const fragment=document.createDocumentFragment();
  for(const product of products){
   const a=el('a',undefined,'home-product');a.href='/loja?produto='+encodeURIComponent(product.id);
   const media=el('div',undefined,'home-product-image');const img=el('img');img.src='/loja-previa/'+product.cover_key;img.alt=product.title;img.loading='lazy';media.append(img);
   const label=el('div',undefined,'home-product-label');label.append(el('h3',product.title),el('span',money(product.price_cents)));a.append(media,label);fragment.append(a);
  }
  root.replaceChildren(fragment);root.hidden=false;
 }catch{note.textContent='Fotos e vídeos no acervo digital.';}
}
// O conteúdo comercial carrega ao se aproximar da seção, sem atrasar o vídeo inicial.
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();load();}},{rootMargin:'350px'});observer.observe(root.parentElement);}else load();
