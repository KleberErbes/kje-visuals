const films = JSON.parse(document.querySelector('#media-data').textContent);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const mobileLayout = matchMedia('(max-width: 700px)');
const hero = document.querySelector('#hero-video');
const toggle = document.querySelector('#video-toggle');
const dialog = document.querySelector('#film-dialog');
const player = document.querySelector('#film-player');
const cards = [...document.querySelectorAll('.film-card')];
const menuToggle = document.querySelector('#menu-toggle');
const navigation = document.querySelector('#main-nav');
const header = document.querySelector('#header');
let manuallyPaused = reduceMotion.matches;
let heroVisible = true;
let activeIndex = 0;
let activeFilter = 'all';
let lastFocus;
let touchStart = null;
let playerRevision = 0;

document.querySelector('#year').textContent = new Date().getFullYear();

// Inline SVG symbols keep the icons sharp and usable without external libraries.
function setIcon(container, name) {
  container.querySelector('use').setAttribute('href', `#icon-${name}`);
}

function updateHeroControl() {
  const paused = hero.paused;
  toggle.setAttribute('aria-label', paused ? 'Reproduzir vídeo de fundo' : 'Pausar vídeo de fundo');
  setIcon(document.querySelector('#video-toggle-icon'), paused ? 'play' : 'pause');
  document.querySelector('#video-toggle-text').textContent = paused ? 'REPRODUZIR' : 'PAUSAR';
}

async function playHero() {
  if (!hero.getAttribute('src')) hero.src = hero.dataset.src;
  hero.muted = true;
  try {
    await hero.play();
    if (manuallyPaused || !heroVisible || document.hidden || dialog.open) hero.pause();
  } catch {
    updateHeroControl();
  }
}

function syncHero() {
  if (manuallyPaused || !heroVisible || document.hidden || dialog.open) hero.pause();
  else playHero();
}

hero.addEventListener('play', updateHeroControl);
hero.addEventListener('pause', updateHeroControl);
hero.addEventListener('error', () => { manuallyPaused = true; toggle.hidden = true; });
toggle.addEventListener('click', () => { manuallyPaused = !hero.paused; syncHero(); });
document.addEventListener('visibilitychange', syncHero);
reduceMotion.addEventListener('change', event => { manuallyPaused = event.matches; syncHero(); });
new IntersectionObserver(entries => {
  heroVisible = entries[0].isIntersecting;
  header.classList.toggle('scrolled', !heroVisible);
  syncHero();
}, { threshold: .08 }).observe(document.querySelector('.hero'));
updateHeroControl();

// The mobile menu retains every desktop navigation destination.
function setMenu(open, restoreFocus = false) {
  open = open && mobileLayout.matches;
  header.classList.toggle('nav-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  setIcon(menuToggle, open ? 'close' : 'menu');
  navigation.inert = mobileLayout.matches && !open;
  if (restoreFocus) menuToggle.focus();
}
menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('click', event => {
  if (!header.contains(event.target)) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') setMenu(false, true);
});
header.addEventListener('focusout', event => {
  if (!header.contains(event.relatedTarget)) setMenu(false);
});
mobileLayout.addEventListener('change', () => setMenu(false));
setMenu(false);

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: .06, rootMargin: '0px 0px -20px 0px' });
document.documentElement.classList.add('js');
document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));

// On touch screens, cards respond to their position in the viewport as well as taps.
const cardObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => entry.target.classList.toggle('is-in-view', entry.isIntersecting));
}, { threshold: .35, rootMargin: '-12% 0px -12% 0px' });
cards.forEach(card => cardObserver.observe(card));

function filteredFilms() {
  return films.filter(film => {
    const card = cards.find(item => item.dataset.film === film.id);
    return activeFilter === 'all' || card.dataset.category === activeFilter;
  });
}

document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll('.filter').forEach(item => {
    const selected = item === button;
    item.classList.toggle('active', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  let count = 0;
  cards.forEach(card => {
    const visible = activeFilter === 'all' || card.dataset.category === activeFilter;
    card.hidden = !visible;
    if (visible) {
      count++;
      card.classList.add('visible');
      if (!reduceMotion.matches) card.animate(
        [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 400, easing: 'ease-out' }
      );
    }
  });
  document.querySelector('#film-grid').classList.toggle('filtered', activeFilter !== 'all');
  document.querySelector('#film-count').textContent = `${count} ${count === 1 ? 'TRABALHO' : 'TRABALHOS'}`;
}));

function showFilm(index) {
  activeIndex = (index + films.length) % films.length;
  const film = films[activeIndex];
  const selection = filteredFilms();
  const revision = ++playerRevision;
  player.pause();
  document.querySelector('#dialog-title').textContent = film.title;
  document.querySelector('#dialog-category').textContent = [film.category === 'eventos' ? 'Eventos' : 'Paisagens e viagens', film.detail].filter(Boolean).join(' · ').toUpperCase();
  document.querySelector('#dialog-description').textContent = film.description;
  document.querySelector('#dialog-counter').textContent = `${String(selection.findIndex(item => item.id === film.id) + 1).padStart(2, '0')} / ${String(selection.length).padStart(2, '0')}`;
  document.querySelector('#player-error').hidden = true;
  const photo = document.getElementById('photo-player');
  const isPhoto = film.kind === 'photo';
  const builtinVideo = !isPhoto && film.src.startsWith('/assets/');
  player.hidden = isPhoto;
  photo.hidden = !isPhoto;
  document.querySelector('#stage-watermark').hidden = builtinVideo;
  const expand = document.querySelector('#stage-expand');
  expand.hidden = builtinVideo;
  document.querySelector('.player-wrap').classList.toggle('overlay-mode', !builtinVideo);
  if (isPhoto) {
    player.removeAttribute('src');
    player.load();
    photo.src = film.src;
    photo.alt = film.alt || film.title;
  } else {
    photo.removeAttribute('src');
    player.poster = builtinVideo && film.cover === '/assets/'+film.id+'.webp' ? '/assets/'+film.id+'-player.webp' : film.cover;
    player.src = film.src;
    player.setAttribute('aria-label', film.title);
    player.controlsList?.toggle('nofullscreen', !builtinVideo);
    player.disablePictureInPicture = !builtinVideo;
    player.muted = true;
    document.querySelector('#video-download').href = film.src;
  }
  if (!dialog.open) {
    lastFocus = document.activeElement;
    setMenu(false);
    dialog.showModal();
    document.body.classList.add('modal-open');
  }
  hero.pause();
  if (isPhoto) return;
  player.play().then(() => {
    if (revision === playerRevision && !dialog.open) player.pause();
  }).catch(() => {});
}

function changeFilm(direction) {
  const selection = filteredFilms();
  const position = selection.findIndex(film => film.id === films[activeIndex].id);
  const next = selection[(position + direction + selection.length) % selection.length];
  showFilm(films.findIndex(film => film.id === next.id));
}

cards.forEach(card => card.querySelector('.film-open').addEventListener('click', () => {
  showFilm(films.findIndex(film => film.id === card.dataset.film));
}));
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
dialog.addEventListener('close', () => {
  playerRevision++;
  document.querySelector('.player-wrap').classList.remove('expanded-stage');
  document.querySelector('#stage-expand').textContent = 'Ampliar';
  touchStart = null;
  player.pause();
  player.removeAttribute('src');
  player.load();
  document.body.classList.remove('modal-open');
  lastFocus?.focus({ preventScroll: true });
  syncHero();
});
document.querySelector('#previous-film').addEventListener('click', () => changeFilm(-1));
document.querySelector('#next-film').addEventListener('click', () => changeFilm(1));

// Swipe only in the caption area, so native video seeking and volume controls stay intact.
const swipeArea = document.querySelector('.dialog-bottom');
swipeArea.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'touch' || !event.isPrimary || event.target.closest('button, a')) return;
  touchStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
});
swipeArea.addEventListener('pointerup', event => {
  if (!touchStart || touchStart.id !== event.pointerId) return;
  const dx = event.clientX - touchStart.x;
  const dy = event.clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) changeFilm(dx < 0 ? 1 : -1);
});
swipeArea.addEventListener('pointercancel', () => { touchStart = null; });
player.addEventListener('error', () => {
  if (player.getAttribute('src')) document.querySelector('#player-error').hidden = false;
});

// Keep the signature attached to the visible image even with letterboxing.
const stage = document.querySelector('.player-wrap');
const photo = document.querySelector('#photo-player');
const mark = document.querySelector('#stage-watermark');
function fitWatermark() {
  if (mark.hidden || !stage.clientWidth) return;
  const width = player.hidden ? photo.naturalWidth : player.videoWidth;
  const height = player.hidden ? photo.naturalHeight : player.videoHeight;
  if (!width || !height) return;
  const scale = Math.min(stage.clientWidth / width, stage.clientHeight / height);
  const w = width * scale, h = height * scale;
  mark.style.width = Math.min(150, Math.max(35, w * .14)) + 'px';
  mark.style.right = ((stage.clientWidth - w) / 2 + w * .035) + 'px';
  mark.style.bottom = ((stage.clientHeight - h) / 2 + h * .12) + 'px';
}
new ResizeObserver(fitWatermark).observe(stage);
photo.addEventListener('load', fitWatermark);
player.addEventListener('loadedmetadata', fitWatermark);
document.querySelector('#stage-expand').addEventListener('click', async event => {
  if (document.fullscreenElement === stage) { await document.exitFullscreen(); return; }
  if (stage.requestFullscreen && !stage.classList.contains('expanded-stage')) {
    try { await stage.requestFullscreen(); return; } catch {}
  }
  const expanded = stage.classList.toggle('expanded-stage');
  document.querySelector('#stage-expand').textContent = expanded ? 'Reduzir' : 'Ampliar';
});
document.addEventListener('fullscreenchange', () => {
  document.querySelector('#stage-expand').textContent = document.fullscreenElement === stage ? 'Reduzir' : 'Ampliar';
  fitWatermark();
});
