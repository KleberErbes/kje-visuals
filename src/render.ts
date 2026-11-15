import { tpl } from "./templates";
const template = tpl("portfolio.html");
import type { Portfolio, Item } from "./cms";
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
const icon = (id: string) => `<svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-${id}"></use></svg>`;
const number = (n: number) => String(n).padStart(2,"0");
const group = (i: Item) => i.category === "eventos" ? "Eventos" : "Paisagens e viagens";
function card(item: Item, index: number) {
  const photo = item.kind === "photo";
  const seconds = Math.round(item.duration);
  const badge = photo ? "FOTO" : number(Math.floor(seconds/60))+":"+number(seconds%60);
  const action = photo ? "Ver foto" : "Assistir filme";
  return `<article class="film-card reveal ${item.portrait?"portrait-card":""}" data-category="${item.category}" data-film="${item.id}">
    <button class="film-open" type="button" aria-label="${action}: ${esc(item.title)}">
      <div class="film-image"><img src="${esc(item.cover)}" alt="${esc(item.alt || item.title)}" loading="lazy"><div class="image-shade"></div>
      <span class="film-index">${number(index+1)}</span><span class="duration">${badge}</span>
      <span class="play-circle" aria-hidden="true">${icon(photo?"arrow-up-right":"play")}</span>
      <span class="watch-label">${action.toUpperCase()} ${icon("arrow-up-right")}</span></div>
      <div class="film-info"><div><h3>${esc(item.title)}</h3><p>${esc([group(item),item.detail].filter(Boolean).join(" · ").toUpperCase())}</p></div><span class="film-info-arrow">${icon("arrow-up-right")}</span></div>
    </button></article>`;
}
export function render(data: Portfolio, owner: boolean, preview: boolean, origin: string) {
  const items=data.items.filter(i=>i.visible);
  const vars: Record<string,string> = {
    OG_IMAGE:esc(new URL(data.hero.cover,origin).href),
    CARDS:items.length?items.map(card).join(""):'<p>Novos trabalhos em breve.</p>',
    ADMIN_LINK:owner?'<a href="/admin">Editar conteúdo</a>':"",
    HERO_SRC:esc(data.hero.src),HERO_COVER:esc(data.hero.cover),HERO_TITLE:esc(data.hero.title.toUpperCase()),
    ABOUT_SRC:esc(data.about.src), ABOUT_ALT:esc(data.about.alt),
    TOTAL:number(items.length),LAND:number(items.filter(i=>i.category==="paisagens").length),
    EVENT:number(items.filter(i=>i.category==="eventos").length),
    COUNT:items.length + (items.length===1?" TRABALHO":" TRABALHOS"),
    ITEMS:JSON.stringify(items).replace(/</g,"\\u003c"),
    PREVIEW:preview?'<a class="draft-banner" href="/admin">Prévia do rascunho · Voltar ao painel</a>':""
  };
  return template.replace(/{{([A-Z_]+)}}/g,(_,key)=>vars[key]??"");
}
