(() => {
  'use strict';
  const input = document.getElementById('resource-search');
  const scope = document.getElementById('resource-scope');
  const count = document.getElementById('resource-count');
  const language = document.getElementById('resource-language');
  const rows = [...document.querySelectorAll('[data-project]')];
  const initial = new URLSearchParams(location.search);
  if (!input.value) input.value = (initial.get('q') || '').slice(0, 240);
  scope.value = ['true', 'false'].includes(initial.get('scope')) ? initial.get('scope') : 'all';
  function update() {
    const query = input.value.trim().toLowerCase();
    let shown = 0;
    for (const row of rows) {
      row.hidden = !row.dataset.search.includes(query) || (scope.value !== 'all' && row.dataset.licensed !== scope.value);
      if (!row.hidden) shown++;
    }
    count.textContent = `${shown} / ${count.dataset.total} ${count.dataset.unit}`;
    document.getElementById('resource-empty').hidden = shown !== 0;
    const params = new URLSearchParams();
    if (query) params.set('q', input.value.trim());
    if (scope.value !== 'all') params.set('scope', scope.value);
    const search = params.size ? `?${params}` : '';
    history.replaceState(null, '', location.pathname + search + location.hash);
    const next = new URL(language.href);
    next.search = search;
    next.hash = location.hash;
    language.href = next.href;
  }
  input.addEventListener('input', update);
  scope.addEventListener('change', update);
  input.closest('form').addEventListener('submit', event => event.preventDefault());
  update();
})();
