'use strict';
const $ = id => document.getElementById(id);
const dialog = $('edit-dialog');
const workForm = $('work-form');
const sections = $('sections-form');
const uploads = new WeakMap();
const categoryName = {paisagens:'Paisagens e viagens',eventos:'Eventos'};
let content, revision, publishedRevision, editingId;
let busy = false, formChanged = false, sectionsChanged = false, previewUrl;

function message(text, error = false) {
  const el = dialog.open ? $('form-message') : $('notice');
  el.textContent = text;
  el.hidden = !text;
  el.classList.toggle('error',error);
}
function lock(value) {
  busy=value;
  document.querySelector('main').inert=value;
  workForm.inert=value;
  workForm.setAttribute('aria-busy',String(value));
}
async function run(action) {
  if (busy) return;
  lock(true);
  try { await action(); }
  catch (error) { message(error.message || 'Não foi possível concluir. Tente novamente.',true); }
  finally { lock(false); }
}
async function api(method, payload) {
  const response = await fetch('/api/editor', {
    method, credentials:'same-origin',cache:'no-store',
    headers:{'X-KJE-Editor':'1','Content-Type':'application/json'},
    body:payload === undefined ? undefined : JSON.stringify(payload)
  });
  const result = await response.json().catch(()=>({}));
  if (!response.ok) throw Error(result.error || 'Falha ao acessar o painel. Atualize a página e tente novamente.');
  return result;
}
function validateFile(file, expected) {
  if (!file) return;
  const kind = file.type === 'video/mp4' ? 'video' : ['image/jpeg','image/png','image/webp'].includes(file.type) ? 'photo' : '';
  if (!kind || (expected && kind !== expected)) throw Error('Use um vídeo MP4 ou uma foto JPG, PNG ou WebP no campo correspondente.');
  const max=kind==='video'?50:15;
  if (!file.size || file.size>max*1024*1024) throw Error('Escolha um arquivo de até '+max+' MB.');
  return kind;
}
function upload(file) {
  if (uploads.has(file)) return Promise.resolve(uploads.get(file));
  const fail='O envio falhou. Confira sua conexão e o tamanho do arquivo.';
  return (async()=>{
    const res=await fetch('/api/upload',{method:'POST',headers:{'Content-Type':'application/json','X-KJE-Editor':'1'},body:JSON.stringify({type:file.type,size:file.size})});
    const sign=await res.json().catch(()=>null);
    if(!res.ok||!sign?.uploadUrl) throw Error(sign?.error||fail);
    await new Promise((resolve,reject)=>{
      const body=new FormData(); body.append('cacheControl','3600'); body.append('',file);
      const request=new XMLHttpRequest();
      request.open('PUT',sign.uploadUrl);
      request.setRequestHeader('x-upsert','false');
      if(sign.apikey) request.setRequestHeader('apikey',sign.apikey);
      request.upload.onprogress=e=>{
        if (e.lengthComputable) message('Enviando arquivo · '+Math.round(e.loaded/e.total*100)+'%');
      };
      request.onload=()=>request.status>=200&&request.status<300?resolve():reject(Error(fail));
      request.onerror=()=>reject(Error('O envio foi interrompido. Tente novamente.'));
      request.send(body);
    });
    uploads.set(file,sign.src); return sign.src;
  })();
}
async function inspectImage(file) {
  const url=URL.createObjectURL(file);
  const img=new Image();
  try { img.src=url; await img.decode(); return img.naturalHeight>img.naturalWidth; }
  catch { throw Error('Não foi possível abrir a imagem. Exporte em JPG, PNG ou WebP.'); }
  finally { URL.revokeObjectURL(url); }
}
function inspectVideo(file) {
  return new Promise((resolve,reject)=>{
    const video=document.createElement('video');
    const url=URL.createObjectURL(file);
    const finish=()=>{clearTimeout(timeout);video.onloadeddata=null;video.onseeked=null;video.onerror=null;video.removeAttribute('src');video.load();URL.revokeObjectURL(url);};
    const fail=()=>{finish();reject(Error('Não foi possível ler o vídeo. Exporte como MP4 com codec H.264 e tente novamente.'));};
    const timeout=setTimeout(fail,30000);
    function capture() {
      const {videoWidth:w,videoHeight:h,duration}=video;
      if(!w || !h || !Number.isFinite(duration) || duration<=0) { fail(); return; }
      const canvas=document.createElement('canvas');
      const scale=Math.min(1,1280/Math.max(w,h));
      canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
      canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
      canvas.toBlob(blob=>{if(!blob){fail();return;}finish();resolve({cover:blob,portrait:h>w,duration:Math.round(duration)});},'image/jpeg',.85);
    }
    video.muted=true;video.playsInline=true;video.preload='auto';
    video.onerror=fail;
    video.onloadeddata=()=>{video.onloadeddata=null;video.onseeked=capture;video.currentTime=Math.min(.3,video.duration/2);};
    video.src=url;
  });
}
function element(tag, text, className) {
  const node=document.createElement(tag);
  if(text !== undefined) node.textContent=text;
  if(className) node.className=className;
  return node;
}
function orderButton(item,index,step) {
  const label=step<0?'Subir':'Descer';
  const button=element('button',undefined,'round');
  button.type='button';button.title=label;button.setAttribute('aria-label',label+' '+item.title);
  const path=step<0?'M12 19V5m-6 6 6-6 6 6':'M12 5v14m-6-6 6 6 6-6';
  button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+path+'"/></svg>';
  button.disabled=index+step<0 || index+step>=content.items.length;
  button.onclick=()=>run(async()=>{
    const next=structuredClone(content);
    [next.items[index],next.items[index+step]]=[next.items[index+step],next.items[index]];
    await saveDraft(next);message('Ordem salva no rascunho.');
  });
  return button;
}
function render() {
  const root=$('items');root.replaceChildren();
  for (const [index,item] of content.items.entries()) {
    const row=element('article',undefined,'item'+(item.visible?'':' muted-item'));
    const img=element('img');img.src=item.cover;img.alt='';img.loading='lazy';
    const text=element('div');text.append(element('h3',item.title),element('p',[
      item.kind==='video'?'Vídeo':'Foto',categoryName[item.category],item.visible?'':'Oculto'
    ].filter(Boolean).join(' · '),'item-meta'));
    const actions=element('div',undefined,'row-actions');
    const edit=element('button','Editar','btn');edit.type='button';edit.setAttribute('aria-label','Editar '+item.title);edit.onclick=()=>openEdit(item);
    actions.append(orderButton(item,index,-1),orderButton(item,index,1),edit);
    row.append(img,text,actions);root.append(row);
  }
  if(!content.items.length) root.append(element('p','Adicione seu primeiro trabalho para montar a galeria.'));
  const visible=content.items.filter(i=>i.visible).length;
  $('total').textContent=visible+' de '+content.items.length+' na galeria';
  $('state').textContent=revision===publishedRevision?'Site atualizado':'Rascunho salvo · aguardando publicação';
  $('publish').disabled=revision===publishedRevision;
  $('add').disabled=false;
  if(!sectionsChanged) fillSections();
}
function fillSections() {
  sections.reset();
  $('hero-img').src=content.hero.cover;$('hero-title').value=content.hero.title;
  $('about-img').src=content.about.src;$('about-alt').value=content.about.alt;
}
async function saveDraft(next) {
  const result=await api('PUT',{draft:next,revision});
  revision=result.revision;content=next;render();
}
function setPreview(kind,src,cover) {
  const image=$('edit-img'),video=$('edit-video');
  video.pause();video.removeAttribute('src');video.load();image.removeAttribute('src');
  image.hidden=!src || kind==='video'; video.hidden=!src || kind!=='video';
  $('empty-preview').hidden=!!src;
  if(src && kind==='video'){video.poster=cover||'';video.src=src;}
  else if (src) image.src=src;
  $('cover-label').hidden=kind!=='video';
}
function openEdit(item) {
  message('');workForm.reset();formChanged=false;editingId=item?.id || null;
  $('editor-title').textContent=item?'Editar trabalho':'Adicionar trabalho';
  $('item-title').value=item?.title||'';$('category').value=item?.category||'paisagens';
  $('description').value=item?.description||'';$('alt').value=item?.alt||'';
  $('detail').value=item?.detail||'';$('visible').checked=item?.visible??true;
  $('asset-file').required=!item;$('remove').hidden=!item;
  $('form-message').textContent='';
  setPreview(item?.kind,item?.src,item?.cover);dialog.showModal();
}
function closeEdit() {
  if(busy) return;
  if(!formChanged || confirm('Descartar as mudanças desta edição?')) dialog.close();
}
dialog.addEventListener('cancel',e=>{e.preventDefault();closeEdit();});
dialog.addEventListener('close',()=>{setPreview(null,'','');if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;formChanged=false;});
$('close').onclick=closeEdit;
$('add').onclick=()=>openEdit(null);
workForm.oninput=()=>{formChanged=true;};
$('asset-file').onchange=()=>{
  const file=$('asset-file').files[0];if(!file)return;
  try {
    const kind=validateFile(file);if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(file);
    setPreview(kind,previewUrl,'');message('');
    if(!$('item-title').value) $('item-title').value=file.name.replace(/\.[^.]+$/,'').slice(0,100);
  } catch(error){$('asset-file').value='';const old=content.items.find(i=>i.id===editingId);setPreview(old?.kind,old?.src,old?.cover);message(error.message,true);}
};
workForm.onsubmit=e=>{e.preventDefault();run(async()=>{
  const file=$('asset-file').files[0],customCover=$('cover-file').files[0];
  const previous=content.items.find(i=>i.id===editingId);
  const item={...previous,id:editingId||crypto.randomUUID(),title:$('item-title').value.trim(),category:$('category').value,
    description:$('description').value.trim(),alt:$('alt').value.trim(),detail:$('detail').value.trim(),visible:$('visible').checked};
  if(!item.title) throw Error('Preencha o título do trabalho.');
  if(!previous && !file) throw Error('Escolha uma foto ou um vídeo.');
  if(customCover) {validateFile(customCover,'photo');await inspectImage(customCover);}
  if(file) {
    item.kind=validateFile(file);message('Preparando a prévia…');
    if(item.kind==='video') {
      const info=await inspectVideo(file);item.portrait=info.portrait;item.duration=info.duration;
      item.src=await upload(file);item.cover=await upload(customCover || info.cover);
    } else {
      item.portrait=await inspectImage(file);item.duration=0;item.src=await upload(file);item.cover=item.src;
    }
  } else if(customCover && item.kind==='video') item.cover=await upload(customCover);
  const next=structuredClone(content);
  if(previous) next.items[next.items.findIndex(i=>i.id===editingId)]=item;else next.items.push(item);
  await saveDraft(next);formChanged=false;dialog.close();message('Trabalho salvo no rascunho.');
});};
$('remove').onclick=()=>{
  const item=content.items.find(i=>i.id===editingId);
  if(!item || !confirm('Remover “'+item.title+'” do rascunho? O portfólio muda ao publicar.')) return;
  run(async()=>{const next=structuredClone(content);next.items=next.items.filter(i=>i.id!==editingId);
    await saveDraft(next);dialog.close();message('Trabalho removido do rascunho.');});
};
sections.oninput=()=>{sectionsChanged=true;};
sections.onsubmit=e=>{e.preventDefault();run(async()=>{
  const next=structuredClone(content),heroFile=$('hero-file').files[0],cover=$('hero-cover').files[0],about=$('about-file').files[0];
  if(heroFile) validateFile(heroFile,'video');
  if(cover){validateFile(cover,'photo');await inspectImage(cover);}
  if(about){validateFile(about,'photo');await inspectImage(about);}
  next.hero.title=$('hero-title').value.trim();next.about.alt=$('about-alt').value.trim();
  if(!next.hero.title || !next.about.alt) throw Error('Preencha o nome do vídeo e a descrição da foto.');
  if(heroFile){message('Preparando a abertura…');const info=await inspectVideo(heroFile);
    next.hero.src=await upload(heroFile);next.hero.cover=await upload(cover || info.cover);}
  else if(cover) next.hero.cover=await upload(cover);
  if(about) next.about.src=await upload(about);
  await saveDraft(next);sectionsChanged=false;fillSections();message('Abertura e foto salvas no rascunho.');
});};
function showTab(pages) {
  $('pages').hidden=!pages;$('works').hidden=pages;
  $('pages-tab').setAttribute('aria-pressed',String(pages));$('works-tab').setAttribute('aria-pressed',String(!pages));
  message('');
}
$('works-tab').onclick=()=>showTab(false);$('pages-tab').onclick=()=>showTab(true);
$('publish').onclick=()=>run(async()=>{
  if(sectionsChanged) throw Error('Salve as mudanças em “Abertura e sobre” antes de publicar.');
  if(!confirm('Publicar este rascunho no portfólio agora?')) return;
  const result=await api('POST',{revision});
  publishedRevision=result.revision;render();message('Portfólio publicado. Abra “Ver site publicado” para conferir.');
});
window.addEventListener('beforeunload',e=>{if(busy||formChanged||sectionsChanged){e.preventDefault();e.returnValue='';}});
run(async()=>{
  const state=await api('GET');content=state.draft;revision=state.revision;publishedRevision=state.publishedRevision;render();
});
