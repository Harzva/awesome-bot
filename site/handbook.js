(() => {
  'use strict';
  const form = document.querySelector('.handbook-search');
  const input = document.getElementById('handbook-search');
  const results = document.getElementById('handbook-results');
  const contents = document.querySelector('.handbook-toc, .handbook-sidebar details, details.handbook-contents, .handbook-layout > aside > details');
  if (contents?.tagName === 'DETAILS') contents.open = !matchMedia('(max-width: 760px)').matches;
  document.querySelectorAll('[data-handbook-print]').forEach(button => button.addEventListener('click', () => window.print()));
  if (!form || !input || !results) return;
  const locale = form.dataset.locale;
  const url = new URL(location.href);
  input.value = (url.searchParams.get('q') || '').slice(0, 160);
  let index, pending, sequence = 0;
  const make = (name, value) => { const element = document.createElement(name); if(value !== undefined) element.textContent = value; return element; };
  function saveRoute() {
    const route = new URL(location.href);
    const query = input.value.trim();
    if (query) route.searchParams.set('q', query); else route.searchParams.delete('q');
    history.replaceState(null, '', route.pathname + route.search + route.hash);
    const language = document.querySelector('[data-handbook-language]');
    if (language) {const target=new URL(language.getAttribute('href'),location.href);if(query)target.searchParams.set('q',query);else target.searchParams.delete('q');target.hash=route.hash;language.href=target.pathname+target.search+target.hash;}
  }
  function validTarget(value) {return typeof value === 'string' && /^\.\/handbook-[a-z0-9-]+(?:\.en)?\.html#[a-z0-9-]+$/.test(value);}
  async function load() {
    if (index) return index;
    if (!pending) pending = (async () => {
      const response = await fetch(form.dataset.index, { signal: AbortSignal.timeout(12000) });
      if(!response.ok)throw new Error('HTTP '+response.status);
      const data=await response.json();
      if(data.schema!=='awesome.bot.handbook-search/1'||data.locale!==locale||!Array.isArray(data.entries)||data.entries.some(e=>!validTarget(e.url)||['id','title','chapter','summary','text'].some(k=>typeof e[k]!=='string')))throw new Error('Invalid index');
      index=data.entries.map(e=>({...e,haystack:[e.title,e.chapter,e.summary,e.text].join('\n').toLocaleLowerCase()}));return index;
    })().finally(()=>{pending=null;});
    return pending;
  }
  async function search() {
    const request=++sequence;saveRoute();
    const terms=input.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    results.hidden=!terms.length;
    if(!terms.length){results.replaceChildren();results.setAttribute('aria-busy','false');return;}
    results.setAttribute('aria-busy','true');results.replaceChildren(make('p',results.dataset.loading));
    try {
      const entries=await load();if(request!==sequence)return;
      const matches=entries.filter(e=>terms.every(term=>e.haystack.includes(term))).sort((a,b)=>Number(terms.some(t=>b.title.toLocaleLowerCase().includes(t)))-Number(terms.some(t=>a.title.toLocaleLowerCase().includes(t))));
      results.replaceChildren();
      if(!matches.length)results.append(make('p',results.dataset.empty));
      else {
        const displayed=matches.slice(0,20);
        results.append(make('p',locale==='en'?`${matches.length} matching sections${matches.length>20?' · showing the first 20':''}`:`找到 ${matches.length} 个相关小节${matches.length>20?'，先显示前 20 个':''}`));
        const list=make('ol');
        for(const entry of displayed){const item=make('li'),a=make('a',entry.chapter+' · '+entry.title);a.href=entry.url;item.append(a,make('p',entry.summary));list.append(item);}results.append(list);
      }
    } catch {
      if(request!==sequence)return;
      const retry=make('button',results.dataset.retry);retry.type='button';retry.addEventListener('click',search);results.replaceChildren(make('p',results.dataset.failed),retry);
    } finally {if(request===sequence)results.setAttribute('aria-busy','false');}
  }
  form.addEventListener('submit',event=>{event.preventDefault();search();});
  input.addEventListener('input',search);
  window.addEventListener('popstate',()=>{input.value=(new URL(location.href).searchParams.get('q')||'').slice(0,160);search();});
  window.addEventListener('hashchange',saveRoute);
  saveRoute();if(input.value.trim())search();
})();
