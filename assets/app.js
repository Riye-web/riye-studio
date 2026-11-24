/* RIYE STUDIO — site script. Vanilla JS, no dependencies. */
(() => {
'use strict';
document.documentElement.classList.add('js');

// ---------- config & content (kept from the previous site) ----------
const CFG = window.RIYE_CONFIG || {};
const DISCORD_INVITE = 'https://discord.gg/KXGEWYkwNN';
const DISCORD_ID = 'Riye97';
const RELAY = CFG.relay || '';      // serverless relay (recommended)
const WEBHOOK = CFG.webhook || '';  // legacy direct webhook (fallback)

const PR = window.RIYE_PRICING || {services: [], budgets: []};
const won = n => n.toLocaleString('ko-KR') + '원';
const svc = PR.services;
const types = svc.map(x => x.type);
const CATS = ['VRChat 월드','방송 배경·무대','3D 모델링','영상','사진','기타'];
// 영상 세부 분류 (작업물 category가 '영상'일 때 sub에 저장)
const VSUBS = ['숏폼','롱폼','게임 영상','제품·광고 영상','인트로·오프닝','뮤직비디오·PV','3D 애니메이션·렌더','방송 하이라이트','기타 영상'];
const normCat = c => c === '방송용 영상' ? '영상' : c;
const faq = [
  ['작업 기간은 얼마나 걸려요?','소품은 보통 1주, 배경·영상은 2~3주, 월드는 3~6주 정도예요. 급한 일정은 상담에서 가능한지 먼저 말씀드려요.'],
  ['결제는 어떻게 해요?','견적 확정 후 착수금 50%, 납품 전 잔금 50%로 진행해요. 계좌이체와 세금계산서·현금영수증 발행이 가능해요.'],
  ['수정은 몇 번 돼요?','기본 2회까지 무료예요. 확정된 범위를 벗어나는 큰 변경은 추가 견적이 나올 수 있어요.'],
  ['저작권과 상업적 이용은요?','개인 방송 사용은 기본 포함이에요. 굿즈, 광고, 판매 같은 상업적 이용은 의뢰서에 체크해 주시면 그 범위로 계약해요. 작업물을 포트폴리오에 올리지 않길 원하시면 미리 말씀해 주세요.'],
  ['기존 아바타나 모델을 수정해 줄 수 있나요?','라이선스상 수정이 허용된 모델이면 가능해요. 구매처와 이용 약관을 함께 보내주세요.'],
  ['디스코드가 없으면요?','무료로 가입할 수 있어요. 가입이 어려우시면 의뢰서 메시지를 복사해서 아이디 Riye97로 보내주시면 돼요.']
];

// ---------- state ----------
let works = [], cat = '전체', sub = '', shown = [];
let viewerOpen = false, vList = [], vIdx = 0, lastFocus = null, originEl = null;

// ---------- helpers ----------
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mqMotion = matchMedia('(prefers-reduced-motion: no-preference)');
const mqFine = matchMedia('(hover: hover) and (pointer: fine)');
const mqWide = matchMedia('(min-width: 1024px)');
const motionOK = () => mqMotion.matches;
const ytId = u => (String(u).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/))([\w-]{11})/) || [])[1];
const vmId = u => (String(u).match(/vimeo\.com\/(?:video\/)?(\d+)/) || [])[1];
const store = {
  get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
  set(k,v){ try { localStorage.setItem(k,v); } catch(e){} },
  del(k){ try { localStorage.removeItem(k); } catch(e){} }
};
// image source by size: sm (≈720px) for grids, opt (≈1600px) for viewer, src = original
const imgOf = (m, size) => size === 'sm' ? (m.sm || m.opt || m.src) : (m.opt || m.src);
// 화면 크기·픽셀 밀도에 맞춰 sm(720) / opt(1600) / hd(최대 3840) 중에서 브라우저가 고르게 해요
const imgAttr = (m, size, sizes) => {
  if (size === 'hd' && m.hd) return `src="${esc(m.hd)}"`; // 상세 보기는 4K 고화질이 기본
  const set = [[m.sm, m.smW || 720], [m.opt, m.optW || 1600], [m.hd, m.hdW]].filter(([u, w]) => u && w);
  return `src="${esc(imgOf(m, size))}"` + (set.length > 1 ? ` srcset="${esc(set.map(([u, w]) => `${u} ${w}w`).join(', '))}" sizes="${sizes}"` : '');
};
const coverOf = w => {
  if (w.thumb) return {type:'image', src:w.thumb, sm:w.thumbSm || w.thumb};
  for (const m of w.media || []) {
    if (m.type === 'image') return m;
    if (m.type === 'link' && ytId(m.src)) return {type:'image', src:`https://img.youtube.com/vi/${ytId(m.src)}/hqdefault.jpg`};
  }
  const v = (w.media || []).find(m => m.type === 'video');
  return v ? {type:'video', src:v.src} : null;
};

document.querySelectorAll('.discord-link').forEach(a => { a.href = DISCORD_INVITE; a.target = '_blank'; a.rel = 'noopener'; });

// ---------- nav ----------
const nav = $('nav'), burger = $('burger'), menu = $('menu');
const setMenu = open => {
  burger.setAttribute('aria-expanded', open);
  burger.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  menu.classList.toggle('open', open);
  nav.classList.toggle('menu-open', open);
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) menu.querySelector('a')?.focus();
};
burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); burger.focus(); } });
matchMedia('(min-width: 901px)').addEventListener('change', e => { if (e.matches) setMenu(false); });
nav.addEventListener('focusin', () => nav.classList.remove('hide'));
addEventListener('pointermove', e => { if (e.clientY < 90 && mqFine.matches && !viewerOpen) nav.classList.remove('hide'); }, {passive:true});

const navLinks = [...document.querySelectorAll('[data-nav]')];
const io = new IntersectionObserver(es => {
  es.forEach(en => { if (en.isIntersecting) navLinks.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id)); });
}, {rootMargin:'-45% 0px -50% 0px'});
['works','services','process','request','faq'].forEach(id => $(id) && io.observe($(id)));

// ---------- reveal ----------
const revealIO = new IntersectionObserver(es => es.forEach(en => {
  if (en.isIntersecting) { en.target.classList.add('in'); revealIO.unobserve(en.target); }
}), {rootMargin:'0px 0px -12% 0px', threshold:.05});
const observeReveal = root => root.querySelectorAll('[data-reveal],.card').forEach(el => revealIO.observe(el));
observeReveal(document);

// ---------- hero (type only: no images) ----------
const hero = document.querySelector('.hero'), heroIn = hero.querySelector('.hero-in');
requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('ready')));

// ---------- scroll loop (parallax, nav state, services pin, process bar) ----------
let lastY = scrollY, ticking = false;
const svcPin = $('svcPin'), track = $('trackBar'), procSec = $('process');
const onScroll = () => {
  ticking = false;
  const y = scrollY, vh = innerHeight;
  nav.classList.toggle('solid', y > 20);
  if (!menu.classList.contains('open')) nav.classList.toggle('hide', y > lastY && y > vh * .6 && !viewerOpen);
  lastY = y;
  if (motionOK() && y < vh * 1.2) {
    // title drifts up and fades out as the next section arrives (fade only on small screens)
    const p = Math.min(1, y / (vh * .85));
    heroIn.style.transform = mqWide.matches ? `translate3d(0,${(-y * .28).toFixed(1)}px,0)` : '';
    heroIn.style.opacity = (1 - p * (mqWide.matches ? 1 : .7)).toFixed(3);
  }
  if (document.body.classList.contains('pinned')) {
    const r = svcPin.getBoundingClientRect(), span = r.height - vh;
    const p = Math.min(1, Math.max(0, -r.top / span));
    const n = svc.length, i = Math.min(n - 1, Math.floor(p * n * .999));
    setSvc(i, p);
  }
  if (track && motionOK()) {
    const r = procSec.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (vh * .8 - r.top) / (r.height * .7)));
    track.style.setProperty('--p', p.toFixed(3));
  }
};
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, {passive:true});
addEventListener('resize', () => { setPinMode(); onScroll(); });

// ---------- services ----------
const svcList = $('svc');
let svcIdx = -1;
const svcVisual = (s, i) => {
  const w = works.find(x => x.category === s.cat && coverOf(x)?.type === 'image');
  if (w) { const c = coverOf(w); return `<figure class="svc-img"><img ${imgAttr(c,'sm','(max-width:1023px) 50vw, 25vw')} alt="${esc(w.title)} 작업 이미지" loading="lazy" decoding="async"><figcaption>작업 예시 · ${esc(w.title)}</figcaption></figure>`; }
  // no real work in this category yet → abstract graphic, never presented as a project
  const hue = ['#ff3d7f','#ffd23f','#7cf3ff','#b9a8ff','#8bf0b0'][i % 5];
  return `<figure class="svc-img" aria-hidden="true"><svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"><rect width="400" height="300" fill="#16161a"/><circle cx="300" cy="80" r="120" fill="${hue}" opacity=".18"/><g stroke="#f2f0ec" stroke-width="2" fill="none" opacity=".85"><polygon points="200,70 290,120 200,170 110,120"/><polyline points="110,120 110,210 200,260 290,210 290,120"/><line x1="200" y1="170" x2="200" y2="260"/></g><polygon points="200,70 290,120 200,170 110,120" fill="${hue}" opacity=".9"/></svg></figure>`;
};
const planHTML = pl => `<li class="plan"><div class="plan-h"><b>${esc(pl.name)}</b><span class="plan-p">${pl.from == null ? '맞춤 견적' : won(pl.from) + '부터'}</span></div><p>${esc(pl.scope)}<span class="plan-d">예상 기간 ${esc(pl.period)}</span></p></li>`;
const renderSvc = () => {
  svcList.innerHTML = svc.map((s, i) => `<li class="svc${i === 0 ? ' on' : ''}" data-i="${i}"><div class="svc-h"><span class="svc-n">${String(i+1).padStart(2,'0')}</span><h3>${esc(s.title)}</h3></div><div class="svc-body">${svcVisual(s, i)}<div class="svc-txt"><p class="svc-d">${esc(s.desc)}</p><ul class="svc-f">${s.features.map(x => `<li>${esc(x)}</li>`).join('')}</ul><ul class="plans">${s.plans.map(planHTML).join('')}</ul><p class="svc-x"><b>기본 수정</b> 2회 무료${s.extra.length ? ` · <b>추가 비용</b> ${s.extra.map(esc).join(', ')}` : ''}</p><a class="tlink tlink-dark svc-cta" href="#request" data-type="${esc(s.type)}">이 작업 문의하기 <span aria-hidden="true">→</span></a></div></div></li>`).join('');
  $('svcAll').textContent = String(svc.length).padStart(2,'0');
  svcPin.style.setProperty('--n', svc.length);
  svcIdx = -1;
};
svcList.addEventListener('click', e => {
  const a = e.target.closest('.svc-cta'); if (!a) return;
  const i = types.indexOf(a.dataset.type);
  if (i > -1 && !$('t' + i).checked) { $('t' + i).checked = true; form.dispatchEvent(new Event('input', {bubbles:true})); }
});
const setSvc = (i, p) => {
  $('svcPin').querySelector('.svc-count i').style.setProperty('--p', p.toFixed(3));
  if (i === svcIdx) return;
  svcIdx = i;
  svcList.querySelectorAll('.svc').forEach((el, k) => { el.classList.toggle('on', k === i); el.setAttribute('aria-current', k === i ? 'true' : 'false'); });
  $('svcNow').textContent = String(i + 1).padStart(2,'0');
};
const setPinMode = () => {
  const on = mqWide.matches && motionOK() && innerHeight >= 820;
  document.body.classList.toggle('pinned', on);
  if (!on) svcList.querySelectorAll('.svc').forEach(el => { el.classList.add('on'); el.removeAttribute('aria-current'); });
  else svcIdx = -1;
};
mqMotion.addEventListener('change', () => { setPinMode(); onScroll(); });
renderSvc();
setPinMode();

// ---------- works ----------
const wk = $('wk'), flt = $('flt');
const flt2 = document.createElement('div');
flt2.className = 'filters subf'; flt2.id = 'flt2'; flt2.hidden = true;
flt2.setAttribute('role', 'toolbar'); flt2.setAttribute('aria-label', '영상 세부 분류');
flt.after(flt2);
const lazyVideo = new IntersectionObserver(es => es.forEach(en => {
  if (en.isIntersecting) { const v = en.target; v.preload = 'metadata'; v.src = v.dataset.src + '#t=0.5'; lazyVideo.unobserve(v); }
}), {rootMargin:'200px'});
const renderFilters = () => {
  const extra = [...new Set(works.map(w => w.category).filter(Boolean))].filter(c => !CATS.includes(c));
  const cats = ['전체', ...CATS, ...extra];
  const n = c => c === '전체' ? works.length : works.filter(w => w.category === c).length;
  flt.innerHTML = cats.map(c => `<button type="button" aria-pressed="${c === cat}" data-c="${esc(c)}">${esc(c)}<sup>${n(c)}</sup></button>`).join('');
  flt2.hidden = cat !== '영상';
  if (cat === '영상') {
    const vids = works.filter(w => w.category === '영상');
    const subs = ['', ...VSUBS, ...[...new Set(vids.map(w => w.sub).filter(Boolean))].filter(s => !VSUBS.includes(s))];
    flt2.innerHTML = subs.map(s => `<button type="button" aria-pressed="${s === sub}" data-s="${esc(s)}">${esc(s || '전체 영상')}<sup>${s ? vids.filter(w => w.sub === s).length : vids.length}</sup></button>`).join('');
  }
};
const cardHTML = w => {
  const c = coverOf(w);
  const media = !c ? '' : c.type === 'video'
    ? `<video data-src="${esc(c.src)}" muted playsinline preload="none" aria-hidden="true"></video>`
    : `<img ${imgAttr(c,'sm','(max-width:760px) 100vw, 50vw')} alt="" loading="lazy" decoding="async">`;
  const cnt = (w.media || []).length;
  return `<button type="button" class="card" data-id="${esc(w.id)}" aria-label="${esc(w.title)} 자세히 보기"><div class="card-media">${media}<span class="card-tag">${esc(w.sub || w.category || '기타')}</span>${cnt > 1 ? `<span class="card-cnt" aria-label="미디어 ${cnt}개">${cnt}</span>` : ''}<span class="card-view" aria-hidden="true">↗</span></div><div class="card-meta"><div><h3>${esc(w.title)}</h3>${w.summary ? `<p>${esc(w.summary)}</p>` : ''}</div>${w.date ? `<time>${esc(w.date)}</time>` : ''}</div></button>`;
};
const renderWorks = () => {
  renderFilters();
  shown = works.filter(w => (cat === '전체' || w.category === cat) && (cat !== '영상' || !sub || w.sub === sub));
  wk.innerHTML = shown.length ? shown.map(cardHTML).join('')
    : `<div class="empty">${cat === '전체' ? '작업물을 준비하고 있어요. 디스코드 포트폴리오 채널에서 먼저 볼 수 있어요.' : '이 분류에는 아직 작업물이 없어요.'}</div>`;
  wk.querySelectorAll('video[data-src]').forEach(v => lazyVideo.observe(v));
  observeReveal(wk);
};
flt.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  cat = b.dataset.c; sub = ''; renderWorks();
  flt.querySelector(`[aria-pressed="true"]`)?.focus();
});
flt2.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  sub = b.dataset.s; renderWorks();
  flt2.querySelector(`[aria-pressed="true"]`)?.focus();
});
wk.addEventListener('click', e => {
  const b = e.target.closest('.card'); if (!b) return;
  const i = shown.findIndex(w => w.id === b.dataset.id);
  if (i > -1) openViewer(shown, i, b.querySelector('.card-media'));
});

fetch('works.json?v=' + Date.now()).then(r => r.ok ? r.json() : []).then(d => { works = (Array.isArray(d) ? d : []).map(w => ({...w, category: normCat(w.category)})); })
  .catch(() => { works = []; })
  .finally(() => { renderWorks(); renderSvc(); setPinMode(); onScroll(); });

// ---------- viewer ----------
const viewer = $('viewer'), vBody = $('vBody');
const mediaHTML = (m, w, k) => {
  if (m.type === 'image') return `<figure><img ${imgAttr(m,'hd','(max-width:900px) 100vw, 72vw')} alt="${esc(w.title)} 이미지 ${k+1}" loading="${k < 2 ? 'eager' : 'lazy'}" decoding="async">${m.opt && m.opt !== m.src ? `<a class="orig" href="${esc(m.src)}" target="_blank" rel="noopener">원본 크기로 보기 ↗</a>` : ''}</figure>`;
  if (m.type === 'video') return `<figure><video src="${esc(m.src)}" controls playsinline preload="metadata"></video></figure>`;
  const y = ytId(m.src), v = vmId(m.src);
  if (y) return `<figure class="emb"><iframe src="https://www.youtube.com/embed/${y}" title="${esc(w.title)} 영상" allow="fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></figure>`;
  if (v) return `<figure class="emb"><iframe src="https://player.vimeo.com/video/${v}" title="${esc(w.title)} 영상" allow="fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></figure>`;
  return `<p><a href="${esc(m.src)}" target="_blank" rel="noopener">영상 보러 가기 ↗</a></p>`;
};
const fillViewer = () => {
  const w = vList[vIdx];
  $('vCat').textContent = [w.category, w.sub, w.date].filter(Boolean).join(' · ');
  $('vTitle').textContent = w.title;
  $('vPos').textContent = `${vIdx + 1} / ${vList.length}`;
  $('vPrev').disabled = $('vNext').disabled = vList.length < 2;
  vBody.innerHTML = `<div class="v-grid"><div class="v-info"><h4>${esc(w.title)}</h4>${w.summary ? `<p class="sum">${esc(w.summary)}</p>` : ''}<dl>${w.category ? `<div><dt>분류</dt><dd>${esc([w.category, w.sub].filter(Boolean).join(' · '))}</dd></div>` : ''}${w.date ? `<div><dt>날짜</dt><dd>${esc(w.date)}</dd></div>` : ''}${w.desc ? `<div><dt>작업 정보</dt><dd>${esc(w.desc)}</dd></div>` : ''}<div><dt>미디어</dt><dd>${(w.media||[]).length}개</dd></div></dl></div><div class="v-media">${(w.media || []).map((m, k) => mediaHTML(m, w, k)).join('')}</div></div>`;
  vBody.scrollTop = 0;
};
const clipFrom = el => {
  const r = el.getBoundingClientRect();
  viewer.style.setProperty('--ct', Math.max(0, r.top) + 'px');
  viewer.style.setProperty('--cl', Math.max(0, r.left) + 'px');
  viewer.style.setProperty('--cr', Math.max(0, innerWidth - r.right) + 'px');
  viewer.style.setProperty('--cb', Math.max(0, innerHeight - r.bottom) + 'px');
};
const clipFull = () => ['--ct','--cl','--cr','--cb'].forEach(p => viewer.style.setProperty(p, '0px'));
function openViewer(list, i, fromEl){
  vList = list; vIdx = i; lastFocus = document.activeElement; originEl = fromEl;
  fillViewer();
  const anim = motionOK() && fromEl;
  if (anim) { viewer.style.transition = 'none'; clipFrom(fromEl); viewer.style.setProperty('--crad','16px'); }
  viewer.hidden = false; viewerOpen = true;
  document.body.style.overflow = 'hidden';
  nav.classList.add('hide');
  if (anim) { viewer.offsetWidth; viewer.style.transition = ''; requestAnimationFrame(() => { clipFull(); viewer.style.setProperty('--crad','0px'); }); }
  $('vClose').focus();
}
const closeViewer = () => {
  if (!viewerOpen) return;
  viewerOpen = false;
  const done = () => { viewer.hidden = true; vBody.innerHTML = ''; document.body.style.overflow = ''; nav.classList.remove('hide'); lastFocus?.focus?.({preventScroll:true}); };
  const r = originEl?.getBoundingClientRect();
  if (motionOK() && r && r.bottom > 0 && r.top < innerHeight && vList === shown) {
    clipFrom(originEl); viewer.style.setProperty('--crad','16px');
    viewer.addEventListener('transitionend', done, {once:true});
    setTimeout(() => { if (!viewer.hidden) done(); }, 900);
  } else done();
};
const step = d => {
  if (vList.length < 2) return;
  vIdx = (vIdx + d + vList.length) % vList.length;
  originEl = vList === shown ? wk.querySelector(`.card[data-id="${CSS.escape(vList[vIdx].id)}"] .card-media`) : null;
  fillViewer();
};
$('vClose').addEventListener('click', closeViewer);
$('vPrev').addEventListener('click', () => step(-1));
$('vNext').addEventListener('click', () => step(1));
viewer.addEventListener('keydown', e => {
  if (e.key === 'Escape') { e.preventDefault(); closeViewer(); }
  else if (e.key === 'ArrowLeft' && !e.target.closest('video')) step(-1);
  else if (e.key === 'ArrowRight' && !e.target.closest('video')) step(1);
  else if (e.key === 'Tab') {
    const f = [...viewer.querySelectorAll('button:not([disabled]),a[href],video,iframe,[tabindex="0"]')];
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length-1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length-1]) { e.preventDefault(); f[0].focus(); }
  }
});
let tx = 0, ty = 0;
vBody.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, {passive:true});
vBody.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
  if (Math.abs(dx) > 70 && Math.abs(dy) < 50) step(dx < 0 ? 1 : -1);
}, {passive:true});

// ---------- FAQ ----------
{ const n = document.querySelector('.svc-note'); if (n && PR.policy) n.innerHTML = `${esc(PR.policy)}${PR.vat === 'included' ? ' 표시 가격은 부가세 포함이에요.' : PR.vat === 'excluded' ? ' 표시 가격은 부가세 별도예요.' : ''}<br>${esc(PR.revisions || '')}`; }
$('fq').innerHTML = faq.map(([q, a]) => `<details data-reveal><summary>${q}</summary><p>${a}</p></details>`).join('');
observeReveal($('fq'));

// ---------- request form ----------
$('types').innerHTML = types.map((t, i) => `<label class="chip"><input type="checkbox" id="t${i}" value="${t}"><span>${t}</span></label>`).join('');
if (PR.budgets && PR.budgets.length) $('budget').innerHTML = '<option value="">선택 안 함</option>' + PR.budgets.map(b => `<option>${esc(b)}</option>`).join('');
// reference estimate from the pricing file (never shown as a final price)
const minFrom = s => { const v = s.plans.map(p => p.from).filter(x => x != null); return v.length ? Math.min(...v) : null; };
const estimate = sel => {
  const picked = svc.filter(s => sel.includes(s.type));
  const priced = picked.filter(s => minFrom(s) != null), custom = picked.filter(s => minFrom(s) == null);
  const sum = priced.reduce((a, s) => a + minFrom(s), 0);
  return {picked, priced, custom, sum};
};
const renderEst = () => {
  const e = estimate(types.filter((_, i) => $('t' + i).checked)), box = $('est');
  if (!e.picked.length) { box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  box.innerHTML = `<p class="est-h">선택한 작업의 기준 가격</p><ul>${e.picked.map(s => `<li><span>${esc(s.title)}</span><b>${minFrom(s) == null ? '맞춤 견적' : won(minFrom(s)) + '부터'}</b></li>`).join('')}</ul>${e.priced.length > 1 || (e.priced.length && e.custom.length) ? `<p class="est-sum">참고 예상 견적 <b>${won(e.sum)}~${e.custom.length ? ' + 맞춤 견적' : ''}</b></p>` : ''}<p class="est-n">시작가 기준 참고용이에요. 확정 금액이 아니며, 범위를 확인한 뒤 견적을 드려요.</p>`;
};
const fields = ['nick','dc','link','budget','due','use','ref','desc'];
const out = $('out'), toast = $('toast'), form = $('f');
const PREVIEW_EMPTY = '의뢰서를 작성하면 여기에서 접수될 내용을 미리 볼 수 있어요.';
let msg = '';
const say = (t, bad) => { toast.textContent = t; toast.classList.toggle('bad', !!bad); };
const save = () => {
  const d = {}; fields.forEach(k => d[k] = $(k).value);
  d.types = types.filter((_, i) => $('t' + i).checked);
  store.set('riye-req', JSON.stringify(d));
  const t = new Date();
  $('saved').textContent = `임시 저장됨 · ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
};
const load = () => {
  try {
    const d = JSON.parse(store.get('riye-req') || 'null'); if (!d) return false;
    fields.forEach(k => { if (d[k] != null) $(k).value = d[k]; });
    types.forEach((t, i) => $('t' + i).checked = (d.types || []).includes(t));
    return fields.some(k => d[k]) || (d.types || []).length > 0;
  } catch(e) { return false; }
};
const build = () => {
  const sel = types.filter((_, i) => $('t' + i).checked);
  const v = k => $(k).value.trim();
  const lines = [
    '📩 외주 의뢰서',
    `활동명: ${v('nick') || '-'}`,
    `디스코드: ${v('dc') || '-'}`,
    `작업 종류: ${sel.join(', ') || '-'}`,
    `채널: ${v('link') || '-'}`,
    `예산: ${v('budget') || '선택 안 함'}`,
    ...(() => { const e = estimate(sel); return e.picked.length ? [`참고 시작가: ${e.priced.length ? won(e.sum) + '~' : ''}${e.custom.length ? (e.priced.length ? ' + ' : '') + '맞춤 견적' : ''} (확정 금액 아님)`] : []; })(),
    `희망 마감일: ${v('due') || '협의'}`,
    `사용 용도: ${v('use')}`,
    '',
    '레퍼런스:',
    v('ref') || '-',
    '',
    '원하는 내용:',
    v('desc') || '-'
  ];
  return {sel, text: lines.join('\n')};
};
const refresh = () => { const b = build(); msg = b.text; out.textContent = msg; renderEst(); };
form.addEventListener('input', e => { save(); refresh(); if (e.target.getAttribute('aria-invalid')) e.target.removeAttribute('aria-invalid'); });
form.addEventListener('change', save);
addEventListener('pagehide', save);
const selectOut = () => { const r = document.createRange(); r.selectNodeContents(out); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
const deliver = async body => {
  if (RELAY) {
    const r = await fetch(RELAY, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({content: body, hp: $('hp').value})});
    if (!r.ok) throw new Error('relay ' + r.status);
    return;
  }
  if (!WEBHOOK) throw new Error('no-endpoint');
  const r = await fetch(WEBHOOK, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({content: body, allowed_mentions:{parse:[]}})});
  if (!r.ok) throw new Error('webhook ' + r.status);
};
form.addEventListener('submit', async e => {
  e.preventDefault();
  const b = build(), miss = [], bad = [];
  const need = (id, label) => { if (!$(id).value.trim()) { miss.push(label); bad.push($(id)); $(id).setAttribute('aria-invalid','true'); } };
  need('nick','활동명'); need('dc','디스코드 아이디');
  if (!b.sel.length) miss.push('작업 종류');
  need('desc','원하는 내용');
  if (!$('agree').checked) miss.push('연락 동의');
  $('err').textContent = miss.length ? `${miss.join(', ')}을(를) 확인해 주세요.` : '';
  msg = b.text; out.textContent = msg;
  if (miss.length) { (bad[0] || (!b.sel.length ? $('t0') : $('agree'))).focus(); return; }
  if ($('hp').value) return;
  if (!RELAY && !WEBHOOK) { say('지금은 자동 접수가 꺼져 있어요. 내용 복사 후 디스코드로 보내주세요.', true); selectOut(); return; }
  const last = +store.get('riye-sent') || 0;
  if (Date.now() - last < 60000) { say('방금 보내셨어요. 1분 뒤에 다시 보낼 수 있어요.', true); return; }
  const btn = $('send'); btn.disabled = true; btn.textContent = '보내는 중…'; say('');
  const body = msg.length > 1900 ? msg.slice(0, 1900) + '\n…(길어서 잘림)' : msg;
  try {
    await deliver(body);
    store.set('riye-sent', Date.now());
    store.del('riye-req');
    say('접수됐어요! 확인하는 대로 디스코드로 연락드릴게요.');
    HTMLFormElement.prototype.reset.call(form);
    $('saved').textContent = ''; renderEst();
  } catch(err) {
    say('전송에 실패했어요. 작성한 내용은 그대로 저장돼 있어요. 내용 복사 후 디스코드 Riye97로 보내주세요.', true);
    selectOut();
  } finally { btn.disabled = false; btn.textContent = '의뢰서 보내기'; }
});
$('clearBtn').addEventListener('click', () => {
  if ($('clearBtn').dataset.sure !== '1') { $('clearBtn').dataset.sure = '1'; $('clearBtn').textContent = '한 번 더 누르면 지워요'; setTimeout(() => { $('clearBtn').dataset.sure = ''; $('clearBtn').textContent = '초기화'; }, 3000); return; }
  $('clearBtn').dataset.sure = ''; $('clearBtn').textContent = '초기화';
  HTMLFormElement.prototype.reset.call(form);
  store.del('riye-req'); msg = ''; out.textContent = PREVIEW_EMPTY; renderEst();
  $('err').textContent = ''; say(''); $('saved').textContent = '';
  form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
});
const copyText = async (text, ok) => {
  try { await navigator.clipboard.writeText(text); say(ok); }
  catch(e) { say('복사가 막혀 있어요. 미리보기 내용을 직접 드래그해서 복사해 주세요.', true); selectOut(); }
};
$('copy').addEventListener('click', () => copyText(msg || build().text, '복사했어요! 디스코드에 붙여넣으면 끝이에요.'));
$('copyId').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(DISCORD_ID); $('copyId').textContent = '복사됨 ✓'; setTimeout(() => $('copyId').textContent = '아이디 복사', 2000); }
  catch(e) { $('copyId').textContent = DISCORD_ID; }
});
if (load()) { refresh(); $('saved').textContent = '이전에 쓰던 내용을 불러왔어요'; }

onScroll();
})();
