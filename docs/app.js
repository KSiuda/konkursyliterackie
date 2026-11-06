/* Static, privacy-friendly catalogue: no account, tracking or remote API. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const controls = {
    search: $('search-input'), genre: $('genre-filter'), type: $('type-filter'),
    prize: $('prize-filter'), date: $('date-filter'), fee: $('fee-filter'),
    lang: $('lang-filter'), sort: $('sort-filter'), expired: $('show-expired'),
    favorites: $('only-favorites'),
  };
  const state = { category: 'Wszystkie', entries: [], favorites: new Set() };
  const dialog = $('detail-dialog');
  const toast = $('toast');
  let toastTimer;

  const h = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
  })[ch]);
  const norm = (v) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pl');
  const ymdToday = () => {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
  };
  const dateDays = (value) => {
    if (!value) return Infinity;
    const [y,m,d] = value.split('-').map(Number);
    const t = new Date();
    return Math.round((Date.UTC(y,m-1,d)-Date.UTC(t.getFullYear(),t.getMonth(),t.getDate()))/86400000);
  };
  const dateText = (value) => !value ? 'Bez terminu' : new Intl.DateTimeFormat('pl-PL', {day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));
  const cashText = (entry) => entry.prize;
  const isExpired = (e) => Boolean(e.deadline && e.deadline < ymdToday());

  function announcement(msg) {
    toast.textContent = msg;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2500);
  }

  async function copyLink(url) {
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(url);
      announcement('Link skopiowany. Możesz go wysłać na Discordzie.');
    } catch {
      const temp = document.createElement('textarea');
      temp.value=url;temp.style.position='fixed';temp.style.opacity='0';
      document.body.appendChild(temp);temp.select();
      const copied=document.execCommand('copy');temp.remove();
      if (copied) announcement('Link skopiowany.');
      else window.prompt('Skopiuj ten link:',url);
    }
  }

  function feeText(e) {
    return e.fee ? `Wpisowe: ${e.fee}` : 'Wpisowe: niepotwierdzone';
  }

  function statusOf(e) {
    if (!e.deadline) return {label:'Bez daty końca',css:'continuous'};
    const days=dateDays(e.deadline);
    if(days<0) return {label:'Po terminie',css:'expired'};
    if(days===0) return {label:'Termin dzisiaj',css:'soon'};
    if(days<=7) return {label:`Jeszcze ${days} ${days===1?'dzień':days<5?'dni':'dni'}`,css:'soon'};
    return {label:'Nabór do terminu',css:''};
  }

  function rowMarkup(e) {
    const status=statusOf(e);
    const tags=[...e.categories.map(c=>`<span class="tag">${h(c)}</span>`),
      ...e.genres.slice(0,3).map(g=>`<span class="tag genre">${h(g)}</span>`),
      ...(e.conditional ? ['<span class="tag conditional">Dodatkowy warunek</span>'] : []),
      ...(e.language==='angielski' ? ['<span class="tag english">EN</span>'] : []),
      ...(e.type!=='Konkurs' ? [`<span class="tag type">${h(e.type)}</span>`] : [])].join('');
    return `<article class="entry${isExpired(e)?' is-expired':''}">
      <div class="entry-main">
        <button class="entry-name" data-open="${h(e.id)}">${h(e.title)}</button>
        <p class="entry-summary">${h(e.summary)}</p>
        <div class="badges">${tags}</div>
      </div>
      <div class="entry-date-col"><div class="date-block"><span class="entry-date">${h(dateText(e.deadline))}</span><span class="date-status ${status.css}">${h(status.label)}</span></div></div>
      <div class="entry-prize-col"><div class="prize-text">${h(cashText(e))}</div><div class="entry-fee">${h(feeText(e))}</div></div>
      <button class="round-arrow" data-open="${h(e.id)}" aria-label="Zobacz: ${h(e.title)}" title="Zobacz szczegóły">›</button>
    </article>`;
  }

  function collectFilters() {
    return {
      q:controls.search.value.trim(),c:state.category,g:controls.genre.value,
      t:controls.type.value,p:controls.prize.value,d:controls.date.value,
      f:controls.fee.value,l:controls.lang.value,s:controls.sort.value,
      x:controls.expired.checked?'1':'',fav:controls.favorites.checked?'1':'',
    };
  }

  function filtered() {
    const f=collectFilters();
    const q=norm(f.q);
    const result=state.entries.filter((e) => {
      if (!controls.expired.checked && isExpired(e)) return false;
      if (controls.favorites.checked && !state.favorites.has(e.id)) return false;
      if (state.category!=='Wszystkie' && !e.categories.includes(state.category)) return false;
      if (f.g && !e.genres.includes(f.g)) return false;
      if (f.t && e.type!==f.t) return false;
      if (f.f && e.feeClass!==f.f) return false;
      if (f.l && !e.language.includes(f.l)) return false;
      if (f.p) {
        if(f.p.startsWith('pln')) {
          if ((e.topCashPln??0) < Number(f.p.slice(3))) return false;
        } else if (!e.prizeTypes.includes(f.p)) return false;
      }
      if (f.d) {
        const days=dateDays(e.deadline);
        if(f.d==='none' && e.deadline) return false;
        if(f.d==='week' && !(days>=0 && days<=7)) return false;
        if(f.d==='month' && !(days>=0 && days<=30)) return false;
      }
      if(q) {
        const haystack=norm([e.title,e.summary,e.length,e.format,e.rules,e.eligibility,e.submission,e.prize,e.fee,...e.categories,...e.genres,e.type,e.language].join(' '));
        if(!haystack.includes(q)) return false;
      }
      return true;
    });
    const byDate=(e)=> e.deadline?e.deadline:'9999-12-31';
    if(f.s==='later') result.sort((a,b)=>{
      if(!a.deadline) return b.deadline?1:0;
      if(!b.deadline) return -1;
      return byDate(b).localeCompare(byDate(a))||a.title.localeCompare(b.title,'pl');
    });
    else if(f.s==='prize') result.sort((a,b)=>(b.topCashPln??-1)-(a.topCashPln??-1)||byDate(a).localeCompare(byDate(b)));
    else if(f.s==='alpha') result.sort((a,b)=>a.title.localeCompare(b.title,'pl'));
    else result.sort((a,b)=>byDate(a).localeCompare(byDate(b))||a.title.localeCompare(b.title,'pl'));
    return result;
  }

  function render() {
    const items=filtered();
    $('entries').innerHTML=items.map(rowMarkup).join('');
    $('entries').setAttribute('aria-busy','false');
    $('entries').hidden=!items.length;
    $('empty-state').hidden=Boolean(items.length);
    $('results-count').textContent=String(items.length);
    for(const el of document.querySelectorAll('[data-category]')) {
      const active=el.dataset.category===state.category;
      el.classList.toggle('active',active);
      el.setAttribute('aria-pressed',String(active));
    }
  }

  function currentURL(extra={}) {
    const u=new URL(window.location.href);
    const f={...collectFilters(),...extra};
    u.search='';
    Object.entries(f).forEach(([key,val]) => {
      if(val && val!=='Wszystkie' && !(key==='s' && val==='soon')) u.searchParams.set(key,val);
    });
    return u;
  }

  function detailHTML(e) {
    const status=statusOf(e);
    const tags=[...e.categories,...e.genres,e.type].map(x=>`<span class="tag">${h(x)}</span>`).join('');
    const block=(title,value)=>`<section class="detail-section"><h3>${h(title)}</h3><p>${h(value||'Nie podano')}</p></section>`;
    const extraLinks=e.otherLinks?.filter(Boolean).map((u,i)=>`<a href="${h(u)}" target="_blank" rel="noopener noreferrer">Dodatkowe źródło ${i+1}</a>`).join(' · ')||'';
    const linkText=e.linkType==='organizator'?'Przejdź do strony organizatora ↗':e.linkType==='materiały redakcji'?'Materiały redakcji ↗':'Przejdź do źródła informacyjnego ↗';
    return `<div class="detail-content">
      <div class="detail-topline">${tags}</div>
      <h2 id="detail-title">${h(e.title)}</h2>
      <p class="detail-subtitle">${h(e.summary)}</p>
      <div class="detail-hero-meta">
        <div class="meta-card"><small>Termin zgłoszeń</small><strong>${h(dateText(e.deadline))} · ${h(status.label)}</strong></div>
        <div class="meta-card"><small>Nagroda</small><strong>${h(e.prize)}</strong></div>
        <div class="meta-card"><small>Wpisowe</small><strong>${h(e.fee||'Niepotwierdzone')}</strong></div>
        <div class="meta-card"><small>Język</small><strong>${h(e.language)}</strong></div>
      </div>
      ${e.conditional?'<p class="link-caveat">Uwaga: konkurs ma dodatkowe warunki osobiste lub zawodowe. Zobacz niżej.</p>':''}
      ${block('Co trzeba przygotować',e.length)}
      ${block('Forma utworu',e.format)}
      ${block('Kto może wziąć udział',e.eligibility)}
      ${block('Najważniejsze zasady',e.rules)}
      ${block('Jak i gdzie zgłosić',e.submission)}
      <div class="detail-actions">
        ${e.link?`<a href="${h(e.link)}" class="official-link" target="_blank" rel="noopener noreferrer">${linkText}</a>`:''}
        <button type="button" class="secondary-action" id="copy-detail">Kopiuj link do wpisu</button>
        <button type="button" class="secondary-action" id="favorite-detail">${state.favorites.has(e.id)?'★ Zapisane':'☆ Zapisz na później'}</button>
      </div>
      ${e.linkType==='informacja'?'<p class="link-caveat">Dla tej pozycji nie udało się potwierdzić bezpośredniego odnośnika organizatora. Powyższa strona jest źródłem informacyjnym.</p>':''}
      ${extraLinks?`<div class="detail-other">${extraLinks}</div>`:''}
    </div>`;
  }

  function openDetail(id,{history=true}={}) {
    const e=state.entries.find(x=>x.id===id);
    if(!e) return;
    $('detail-content').innerHTML=detailHTML(e);
    if(!dialog.open) dialog.showModal();
    if(history) window.history.replaceState(null,'',currentURL({id:e.id}));
    $('copy-detail').addEventListener('click',()=>copyLink(currentURL({id:e.id}).toString()));
    $('favorite-detail').addEventListener('click',()=>{
      if(state.favorites.has(e.id)) state.favorites.delete(e.id); else state.favorites.add(e.id);
      try{localStorage.setItem('oaza-literary-favorites',JSON.stringify([...state.favorites]));}catch{}
      $('favorite-detail').textContent=state.favorites.has(e.id)?'★ Zapisane':'☆ Zapisz na później';
      render();
    });
  }

  function clearDetailURL() {
    if(new URL(location.href).searchParams.has('id')) window.history.replaceState(null,'',currentURL());
  }

  function reset() {
    state.category='Wszystkie';
    controls.search.value='';
    for(const key of ['genre','type','prize','date','fee','lang']) controls[key].value='';
    controls.sort.value='soon';controls.expired.checked=false;controls.favorites.checked=false;
    render();window.history.replaceState(null,'',currentURL());
  }

  function restoreQuery() {
    const p=new URL(location.href).searchParams;
    state.category=['Proza','Poezja','Inne'].includes(p.get('c'))?p.get('c'):'Wszystkie';
    controls.search.value=p.get('q')||'';
    for(const [key,short] of [['genre','g'],['type','t'],['prize','p'],['date','d'],['fee','f'],['lang','l'],['sort','s']]) {
      if(p.get(short) && [...controls[key].options].some(o=>o.value===p.get(short))) controls[key].value=p.get(short);
    }
    controls.expired.checked=p.get('x')==='1';controls.favorites.checked=p.get('fav')==='1';
    return p.get('id');
  }

  function initEvents() {
    for(const btn of document.querySelectorAll('[data-category]')) btn.addEventListener('click',()=>{state.category=btn.dataset.category;render();});
    for(const c of Object.values(controls)) c.addEventListener(c.type==='search'?'input':'change',render);
    $('clear-filters').addEventListener('click',reset);
    $('empty-reset').addEventListener('click',reset);
    $('share-filters').addEventListener('click',()=>copyLink(currentURL().toString()));
    $('entries').addEventListener('click',(evt)=>{const target=evt.target.closest('[data-open]');if(target) openDetail(target.dataset.open);});
    $('close-detail').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',(evt)=>{if(evt.target===dialog) dialog.close();});
    dialog.addEventListener('close',clearDetailURL);
    document.addEventListener('keydown',(evt)=>{
      if(evt.key==='/' && !dialog.open && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
        evt.preventDefault();controls.search.focus();
      }
    });
  }

  async function init() {
    try {
      const res=await fetch('./data.json',{cache:'no-cache'});
      if(!res.ok) throw Error(`HTTP ${res.status}`);
      const data=await res.json();
      state.entries=data.entries;
      try {const saved=JSON.parse(localStorage.getItem('oaza-literary-favorites')||'[]');state.favorites=new Set(Array.isArray(saved)?saved:[]);}catch{}
      const genres=[...new Set(state.entries.flatMap(e=>e.genres))].sort((a,b)=>a.localeCompare(b,'pl'));
      for(const genre of genres) {const opt=document.createElement('option');opt.value=genre;opt.textContent=genre;controls.genre.appendChild(opt);}
      $('total-hero').textContent=String(state.entries.length);
      $('count-all').textContent=String(state.entries.length);
      initEvents();
      const detailId=restoreQuery();
      render();
      if(detailId) openDetail(detailId,{history:false});
    } catch(err) {
      $('entries').setAttribute('aria-busy','false');
      $('entries').innerHTML='<div class="empty-state"><h3>Nie udało się załadować listy</h3><p>Odśwież stronę i spróbuj ponownie.</p></div>';
      console.error('Catalogue load failed',err);
    }
  }
  init();
})();
