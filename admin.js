(() => {
  'use strict';

  const ADMIN_PASSWORD = 'geethika2026';
  const DATA_KEY = 'geethikaLK.songs.v1';
  const AUTH_KEY = 'geethikaLK.adminSession';
  const CATEGORIES = ['Prashansa', 'Namaskara', 'Deva Meheya', 'Christmas'];
  const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm'];
  const CHORD_PATTERN = /\[([A-G](?:#|b)?(?:(?:maj|m|sus|add)\d*|dim|aug|\d*)?)\]/g;

  const $ = selector => document.querySelector(selector);
  const els = {
    login: $('#login-screen'), loginForm: $('#login-form'), password: $('#admin-password'), loginError: $('#login-error'),
    dashboard: $('#admin-dashboard'), logout: $('#logout-button'), form: $('#song-form'),
    number: $('#song-number'), originalNumber: $('#original-number'), title: $('#song-title-input'), category: $('#song-category'), key: $('#song-key'), lyrics: $('#song-lyrics'),
    formMode: $('#form-mode'), status: $('#admin-status'), list: $('#song-admin-list'), count: $('#admin-song-count'),
    previewNumber: $('#preview-number'), previewCategory: $('#preview-category'), previewName: $('#preview-name'), previewKey: $('#preview-key'), previewLyrics: $('#preview-lyrics'),
    json: $('#json-output'), export: $('#export-json'), copy: $('#copy-json'), import: $('#import-file'), importStatus: $('#import-status'), clear: $('#clear-form')
  };

  let songs = [];

  function readLocalSongs() {
    try {
      const value = localStorage.getItem(DATA_KEY);
      if (value === null) return null;
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : null;
    } catch { return null; }
  }

  function saveLocalSongs() {
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(songs));
      return true;
    } catch {
      setStatus('මෙම browser එකේ localStorage වෙත සුරැකිය නොහැකි විය.', true);
      return false;
    }
  }

  function setStatus(message, error = false) {
    els.status.textContent = message;
    els.status.style.color = error ? '#ba5148' : '';
  }

  function safeText(parent, tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value;
    parent.append(node);
    return node;
  }

  function renderChordLine(line) {
    const row = document.createElement('div');
    row.className = 'lyric-line';
    const pattern = new RegExp(CHORD_PATTERN.source, 'g');
    const matches = [...line.matchAll(pattern)];
    if (!matches.length) { row.textContent = line || '\u00a0'; return row; }
    if (matches[0].index > 0) row.append(document.createTextNode(line.slice(0, matches[0].index)));
    matches.forEach((match, index) => {
      const start = match.index + match[0].length;
      const end = index + 1 < matches.length ? matches[index + 1].index : line.length;
      const unit = document.createElement('span'); unit.className = 'lyric-unit';
      safeText(unit, 'span', 'chord-label', match[1]);
      safeText(unit, 'span', 'lyric-text', line.slice(start, end) || '\u00a0');
      row.append(unit);
    });
    return row;
  }

  function renderChordLyrics(container, source) {
    container.replaceChildren();
    String(source || '').replace(/\r/g, '').split('\n').forEach(line => container.append(renderChordLine(line)));
  }

  function updatePreview() {
    const number = els.number.value.trim() || '1';
    const title = els.title.value.trim() || 'ගීතිකාවේ නම';
    const category = els.category.value || CATEGORIES[0];
    const key = els.key.value || 'G';
    els.previewNumber.textContent = `No. ${number}`;
    els.previewCategory.textContent = category;
    els.previewName.textContent = title;
    els.previewKey.textContent = `Key: ${key}`;
    if (els.lyrics.value.trim()) renderChordLyrics(els.previewLyrics, els.lyrics.value);
    else { els.previewLyrics.replaceChildren(); safeText(els.previewLyrics, 'span', 'preview-placeholder', 'පද මෙහි දිස්වේ…'); }
  }

  function writeJSON() {
    els.json.value = JSON.stringify(songs, null, 2);
    els.count.textContent = `ගීතිකා ${songs.length}`;
  }

  function renderList() {
    els.list.replaceChildren();
    if (!songs.length) { safeText(els.list, 'p', 'field-help', 'තවම ගීතිකා නැත.'); return; }
    [...songs].sort((a, b) => Number(a.number) - Number(b.number)).forEach(song => {
      const row = document.createElement('div'); row.className = 'admin-song-row';
      const main = document.createElement('div'); main.className = 'admin-song-main';
      safeText(main, 'strong', '', `${song.number}. ${song.title}`);
      safeText(main, 'span', '', `${song.category} · Key ${song.key}`);
      const actions = document.createElement('div'); actions.className = 'admin-song-actions';
      const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'btn btn-secondary'; edit.textContent = 'Edit';
      edit.addEventListener('click', () => editSong(song));
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'btn btn-danger'; remove.textContent = 'Delete';
      remove.addEventListener('click', () => deleteSong(song));
      actions.append(edit, remove); row.append(main, actions); els.list.append(row);
    });
  }

  function refreshData() {
    writeJSON();
    renderList();
    saveLocalSongs();
  }

  function clearForm() {
    els.form.reset();
    els.originalNumber.value = '';
    els.key.value = 'G';
    els.formMode.textContent = 'නව ගීතිකාව';
    setStatus('');
    updatePreview();
  }

  function editSong(song) {
    els.originalNumber.value = String(song.number);
    els.number.value = song.number;
    els.title.value = song.title || '';
    els.category.value = CATEGORIES.includes(song.category) ? song.category : CATEGORIES[0];
    els.key.value = KEYS.includes(song.key) ? song.key : 'C';
    els.lyrics.value = song.lyrics || '';
    els.formMode.textContent = `සංස්කරණය: ${song.number}`;
    setStatus('');
    updatePreview();
    els.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    els.title.focus({ preventScroll: true });
  }

  function deleteSong(song) {
    if (!window.confirm(`“${song.title}” ගීතිකාව මකන්නද?`)) return;
    songs = songs.filter(item => String(item.number) !== String(song.number));
    refreshData();
    clearForm();
    setStatus('ගීතිකාව localStorage වෙතින් ඉවත් කරන ලදී. geethika.json යාවත්කාලීන කිරීමට JSON පිටපත් කරන්න.');
  }

  function normalizeImported(items) {
    if (!Array.isArray(items)) throw new Error('JSON ගොනුවේ ඉහළම මට්ටමේ array එකක් තිබිය යුතුය.');
    const result = items.map((item, index) => {
      if (!item || item.number === undefined || !String(item.title || '').trim() || !String(item.key || '').trim() || typeof item.lyrics !== 'string') {
        throw new Error(`ගීතිකා අංක ${index + 1} සඳහා number, title, key සහ lyrics අවශ්‍යයි.`);
      }
      const category = CATEGORIES.includes(item.category) ? item.category : CATEGORIES[0];
      return { number: Number(item.number) || String(item.number), title: String(item.title).trim(), category, key: String(item.key).trim(), lyrics: item.lyrics, demoLyrics: Boolean(item.demoLyrics) };
    });
    const seen = new Set();
    result.forEach(item => { const key = String(item.number); if (seen.has(key)) throw new Error(`අංකය ${key} දෙවරක් ඇත.`); seen.add(key); });
    return result;
  }

  function loginSuccess() {
    els.login.hidden = true;
    els.dashboard.hidden = false;
    els.logout.hidden = false;
    const localSongs = readLocalSongs();
    if (localSongs) {
      songs = localSongs;
      writeJSON();
      renderList();
    } else {
      fetch('./geethika.json', { cache: 'no-cache' })
        .then(response => { if (!response.ok) throw new Error('geethika.json load failed'); return response.json(); })
        .then(data => { songs = normalizeImported(data); writeJSON(); renderList(); })
        .catch(error => { console.error(error); setStatus('geethika.json පූරණය කළ නොහැකි විය. Local server එකකින් විවෘත කරන්න.', true); });
    }
    clearForm();
  }

  function exportJSON() {
    writeJSON();
    const blob = new Blob([els.json.value + '\n'], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'geethika.json'; link.click();
    URL.revokeObjectURL(url);
    setStatus('geethika.json ලෙස export කරන ලදී.');
  }

  els.loginForm.addEventListener('submit', event => {
    event.preventDefault();
    if (els.password.value === ADMIN_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, '1');
      els.loginError.textContent = '';
      loginSuccess();
    } else {
      els.loginError.textContent = 'මුරපදය වැරදියි. නැවත උත්සාහ කරන්න.';
      els.password.select();
    }
  });

  els.logout.addEventListener('click', () => {
    sessionStorage.removeItem(AUTH_KEY);
    els.dashboard.hidden = true;
    els.logout.hidden = true;
    els.login.hidden = false;
    els.password.value = '';
    els.password.focus();
  });

  els.form.addEventListener('submit', event => {
    event.preventDefault();
    if (!els.form.reportValidity()) return;
    const number = Number(els.number.value);
    const song = { number, title: els.title.value.trim(), category: els.category.value, key: els.key.value, lyrics: els.lyrics.value.trim(), demoLyrics: false };
    const previous = els.originalNumber.value;
    const index = previous ? songs.findIndex(item => String(item.number) === previous) : songs.findIndex(item => String(item.number) === String(number));
    if (index >= 0) songs[index] = song; else songs.push(song);
    songs.sort((a, b) => Number(a.number) - Number(b.number));
    refreshData();
    clearForm();
    setStatus('Geethika සුරැකුණි. geethika.json යාවත්කාලීන කිරීමට JSON පිටපත් කරන්න.');
  });

  [els.number, els.title, els.category, els.key, els.lyrics].forEach(node => node.addEventListener('input', updatePreview));
  [els.category, els.key].forEach(node => node.addEventListener('change', updatePreview));
  els.clear.addEventListener('click', clearForm);
  els.export.addEventListener('click', exportJSON);
  els.copy.addEventListener('click', async () => {
    writeJSON();
    try {
      await navigator.clipboard.writeText(els.json.value);
      els.importStatus.textContent = 'JSON clipboard වෙත පිටපත් කරන ලදී.';
    } catch {
      els.json.focus(); els.json.select();
      const copied = document.execCommand('copy');
      els.importStatus.textContent = copied ? 'JSON clipboard වෙත පිටපත් කරන ලදී.' : 'පහත JSON අතින් පිටපත් කරන්න.';
    }
  });

  els.import.addEventListener('change', async event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      songs = normalizeImported(parsed);
      refreshData();
      clearForm();
      els.importStatus.textContent = `${songs.length} ගීතිකා import කරන ලදී.`;
    } catch (error) {
      els.importStatus.textContent = error.message || 'JSON import අසාර්ථකයි.';
      els.importStatus.style.color = '#ba5148';
    } finally {
      event.target.value = '';
    }
  });

  const keyPlaceholder = document.createElement('option');
  keyPlaceholder.value = ''; keyPlaceholder.textContent = 'Key තෝරන්න'; keyPlaceholder.disabled = true;
  els.key.append(keyPlaceholder);
  KEYS.forEach(key => { const option = document.createElement('option'); option.value = key; option.textContent = key; els.key.append(option); });
  els.key.value = 'G';
  els.form.addEventListener('input', updatePreview);
  els.form.addEventListener('change', updatePreview);
  updatePreview();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(error => console.warn('Service worker registration failed:', error));
  }
  if (sessionStorage.getItem(AUTH_KEY) === '1') loginSuccess();
})();
