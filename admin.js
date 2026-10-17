(() => {
  'use strict';

  const ADMIN_PASSWORD = 'geethika2026';
  const DATA_KEY = 'geethikaLK.songs.v1';
  const AUTH_KEY = 'geethikaLK.adminSession';

  // GitHub auto-sync settings.
  // WARNING: This token will be visible to anyone who can view this public JavaScript.
  const GITHUB_OWNER = 'emalkumarasiri';
  const GITHUB_REPO = 'app-';
  const GITHUB_BRANCH = 'main';
  const GITHUB_FILE = 'geethika.json';
  const GITHUB_TOKEN = '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';
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
      setStatus('Could not save to local storage in this browser.', true);
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
    const title = els.title.value.trim() || 'Song title';
    const category = els.category.value || CATEGORIES[0];
    const key = els.key.value || 'G';
    els.previewNumber.textContent = `No. ${number}`;
    els.previewCategory.textContent = category;
    els.previewName.textContent = title;
    els.previewKey.textContent = `Key: ${key}`;
    if (els.lyrics.value.trim()) renderChordLyrics(els.previewLyrics, els.lyrics.value);
    else { els.previewLyrics.replaceChildren(); safeText(els.previewLyrics, 'span', 'preview-placeholder', 'Lyrics will appear here…'); }
  }

  function writeJSON() {
    els.json.value = JSON.stringify(songs, null, 2);
    els.count.textContent = `Songs: ${songs.length}`;
  }

  function renderList() {
    els.list.replaceChildren();
    if (!songs.length) { safeText(els.list, 'p', 'field-help', 'No songs added yet.'); return; }
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


  function githubConfigured() {
    return GITHUB_TOKEN && GITHUB_TOKEN !== 'PASTE_NEW_GITHUB_TOKEN_HERE';
  }

  async function syncToGitHub() {
    if (!githubConfigured()) {
      setStatus('Saved in this browser only. Configure GITHUB_TOKEN in admin.js to enable GitHub sync.', true);
      return false;
    }
    setStatus('Saving to GitHub…');
    try {
      const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`;
      const headers = {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28'
      };
      const currentResponse = await fetch(apiUrl, { headers, cache: 'no-store' });
      if (!currentResponse.ok) throw new Error(`GitHub read failed (${currentResponse.status}).`);
      const current = await currentResponse.json();
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(songs, null, 2) + '\n')));
      const saveResponse = await fetch(apiUrl, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Update ${GITHUB_FILE} from GeethikaLK admin`,
          content,
          sha: current.sha,
          branch: GITHUB_BRANCH
        })
      });
      if (!saveResponse.ok) {
        const details = await saveResponse.text();
        throw new Error(`GitHub update failed (${saveResponse.status}): ${details}`);
      }
      setStatus('Saved locally and updated GitHub geethika.json.');
      return true;
    } catch (error) {
      console.error(error);
      setStatus(`Saved locally, but GitHub update failed: ${error.message}`, true);
      return false;
    }
  }

  async function loadSongsFromGitHub() {
    const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${GITHUB_FILE}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load ${GITHUB_FILE} from GitHub.`);
    return normalizeImported(await response.json());
  }

  function refreshData() {
    writeJSON();
    renderList();
    saveLocalSongs();
    syncToGitHub();
  }

  function clearForm() {
    els.form.reset();
    els.originalNumber.value = '';
    els.key.value = 'G';
    els.formMode.textContent = 'New song';
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
    els.formMode.textContent = `Editing: ${song.number}`;
    setStatus('');
    updatePreview();
    els.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    els.title.focus({ preventScroll: true });
  }

  function deleteSong(song) {
    if (!window.confirm(`Delete the song “${song.title}”?`)) return;
    songs = songs.filter(item => String(item.number) !== String(song.number));
    refreshData();
    clearForm();
    setStatus('Song removed locally. GitHub sync will be attempted automatically.');
  }

  function normalizeImported(items) {
    if (!Array.isArray(items)) throw new Error('The JSON file must contain an array at the top level.');
    const result = items.map((item, index) => {
      if (!item || item.number === undefined || !String(item.title || '').trim() || !String(item.key || '').trim() || typeof item.lyrics !== 'string') {
        throw new Error(`Song item ${index + 1} must include number, title, key, and lyrics.`);
      }
      const category = CATEGORIES.includes(item.category) ? item.category : CATEGORIES[0];
      return { number: Number(item.number) || String(item.number), title: String(item.title).trim(), category, key: String(item.key).trim(), lyrics: item.lyrics, demoLyrics: Boolean(item.demoLyrics) };
    });
    const seen = new Set();
    result.forEach(item => { const key = String(item.number); if (seen.has(key)) throw new Error(`Duplicate song number: ${key}.`); seen.add(key); });
    return result;
  }

  async function loginSuccess() {
    els.login.hidden = true;
    els.dashboard.hidden = false;
    els.logout.hidden = false;
    clearForm();
    setStatus('Loading songs from GitHub…');
    try {
      songs = await loadSongsFromGitHub();
      writeJSON();
      renderList();
      saveLocalSongs();
      setStatus('Songs loaded from GitHub.');
    } catch (error) {
      console.error(error);
      const localSongs = readLocalSongs();
      if (localSongs) {
        songs = localSongs;
        writeJSON();
        renderList();
        setStatus('Could not load GitHub data. Showing this browser’s saved copy.', true);
      } else {
        setStatus('Could not load geethika.json from GitHub. Check the repository and branch.', true);
      }
    }
  }

  function exportJSON() {
    writeJSON();
    const blob = new Blob([els.json.value + '\n'], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'geethika.json'; link.click();
    URL.revokeObjectURL(url);
    setStatus('Exported as geethika.json.');
  }

  els.loginForm.addEventListener('submit', event => {
    event.preventDefault();
    if (els.password.value === ADMIN_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, '1');
      els.loginError.textContent = '';
      loginSuccess();
    } else {
      els.loginError.textContent = 'Incorrect password. Please try again.';
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
    setStatus('Song saved. GitHub sync will be attempted automatically.');
  });

  [els.number, els.title, els.category, els.key, els.lyrics].forEach(node => node.addEventListener('input', updatePreview));
  [els.category, els.key].forEach(node => node.addEventListener('change', updatePreview));
  els.clear.addEventListener('click', clearForm);
  els.export.addEventListener('click', exportJSON);
  els.copy.addEventListener('click', async () => {
    writeJSON();
    try {
      await navigator.clipboard.writeText(els.json.value);
      els.importStatus.textContent = 'JSON copied to clipboard.';
    } catch {
      els.json.focus(); els.json.select();
      const copied = document.execCommand('copy');
      els.importStatus.textContent = copied ? 'JSON copied to clipboard.' : 'Please copy the JSON below manually.';
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
      els.importStatus.textContent = `Imported ${songs.length} songs.`;
    } catch (error) {
      els.importStatus.textContent = error.message || 'JSON import failed.';
      els.importStatus.style.color = '#ba5148';
    } finally {
      event.target.value = '';
    }
  });

  const keyPlaceholder = document.createElement('option');
  keyPlaceholder.value = ''; keyPlaceholder.textContent = 'Select key'; keyPlaceholder.disabled = true;
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
