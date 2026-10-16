(() => {
  'use strict';

  const DATA_KEY = 'geethikaLK.songs.v1';
  const FAVOURITES_KEY = 'geethikaLK.favourites.v1';
  const CATEGORIES = ['All', 'Prashansa', 'Namaskara', 'Deva Meheya', 'Christmas'];
  const CHORD_PATTERN = /\[([A-G](?:#|b)?(?:(?:maj|m|sus|add)\d*|dim|aug|\d*)?)\]/g;
  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLAT_TO_SHARP = { 'Cb': 'B', 'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'E#': 'F', 'B#': 'C' };

  const els = {
    home: document.querySelector('#home-view'),
    detail: document.querySelector('#song-view'),
    grid: document.querySelector('#song-grid'),
    categories: document.querySelector('#category-bar'),
    search: document.querySelector('#song-search'),
    count: document.querySelector('#song-count'),
    empty: document.querySelector('#empty-state'),
    back: document.querySelector('#back-button'),
    number: document.querySelector('#view-number'),
    category: document.querySelector('#view-category'),
    title: document.querySelector('#song-title'),
    originalKey: document.querySelector('#original-key'),
    currentKey: document.querySelector('#current-key'),
    lyrics: document.querySelector('#lyrics-content'),
    sampleNotice: document.querySelector('#sample-notice'),
    transposeDown: document.querySelector('#transpose-down'),
    transposeUp: document.querySelector('#transpose-up'),
    fontDown: document.querySelector('#font-down'),
    fontUp: document.querySelector('#font-up'),
    scroll: document.querySelector('#autoscroll-button'),
    favourite: document.querySelector('#favourite-button'),
    status: document.querySelector('#offline-status')
  };

  let songs = [];
  let activeCategory = 'All';
  let currentSong = null;
  let transposeSteps = 0;
  let lyricFontSize = 23;
  let autoScrollTimer = null;
  let favourites = new Set();

  function safeReadJSON(key, fallback) {
    try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
    catch { return fallback; }
  }

  function saveSongs() {
    try { localStorage.setItem(DATA_KEY, JSON.stringify(songs)); } catch { /* Private storage can be disabled. */ }
  }

  function canonicalRoot(letter, accidental) {
    const root = `${letter}${accidental || ''}`;
    return FLAT_TO_SHARP[root] || root;
  }

  function shiftChord(chord, semitones) {
    const match = /^([A-G])([#b]?)(.*)$/.exec(chord);
    if (!match) return chord;
    const root = canonicalRoot(match[1], match[2]);
    const pitch = NOTES.indexOf(root);
    if (pitch < 0) return chord;
    const shifted = NOTES[((pitch + semitones) % 12 + 12) % 12];
    return shifted + match[3];
  }

  function shiftKey(key, semitones) {
    const match = /^([A-G])([#b]?)(m?)$/.exec(String(key || ''));
    if (!match) return key || '—';
    const root = canonicalRoot(match[1], match[2]);
    const pitch = NOTES.indexOf(root);
    if (pitch < 0) return key;
    return NOTES[((pitch + semitones) % 12 + 12) % 12] + match[3];
  }

  function renderChordLine(line, semitones) {
    const row = document.createElement('div');
    row.className = 'lyric-line';
    const chordPattern = new RegExp(CHORD_PATTERN.source, 'g');
    const matches = [...line.matchAll(chordPattern)];
    if (!matches.length) {
      row.textContent = line || '\u00a0';
      return row;
    }
    if (matches[0].index > 0) row.append(document.createTextNode(line.slice(0, matches[0].index)));
    matches.forEach((match, index) => {
      const contentStart = match.index + match[0].length;
      const contentEnd = index + 1 < matches.length ? matches[index + 1].index : line.length;
      const unit = document.createElement('span');
      unit.className = 'lyric-unit';
      const chordLabel = document.createElement('span');
      chordLabel.className = 'chord-label';
      chordLabel.textContent = shiftChord(match[1], semitones);
      const lyricText = document.createElement('span');
      lyricText.className = 'lyric-text';
      lyricText.textContent = line.slice(contentStart, contentEnd) || '\u00a0';
      unit.append(chordLabel, lyricText);
      row.append(unit);
    });
    return row;
  }

  function renderLyrics(container, lyrics, semitones) {
    container.replaceChildren();
    const lines = String(lyrics || '').replace(/\r/g, '').split('\n');
    lines.forEach(line => container.append(renderChordLine(line, semitones)));
  }

  function makeCategoryButtons() {
    els.categories.replaceChildren();
    CATEGORIES.forEach(category => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'category-button';
      button.textContent = category;
      button.setAttribute('aria-pressed', String(category === activeCategory));
      button.addEventListener('click', () => {
        activeCategory = category;
        makeCategoryButtons();
        renderSongGrid();
      });
      els.categories.append(button);
    });
  }

  function filteredSongs() {
    const query = els.search.value.trim().toLocaleLowerCase();
    return songs.filter(song => {
      const categoryMatch = activeCategory === 'All' || song.category === activeCategory;
      const searchable = `${song.title} ${song.category} ${song.number} ${song.key}`.toLocaleLowerCase();
      return categoryMatch && (!query || searchable.includes(query));
    });
  }

  function renderSongGrid() {
    const visible = filteredSongs();
    els.grid.replaceChildren();
    els.count.textContent = `ගීතිකා ${visible.length}`;
    els.empty.hidden = visible.length > 0;
    visible.forEach(song => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'song-card';
      card.setAttribute('aria-label', `${song.number}. ${song.title}, ${song.category}, Key ${song.key}`);
      const top = document.createElement('span'); top.className = 'card-top';
      const number = document.createElement('span'); number.className = 'card-number'; number.textContent = `NO. ${song.number}`;
      const key = document.createElement('span'); key.className = 'card-key'; key.textContent = song.key;
      top.append(number, key);
      const title = document.createElement('span'); title.className = 'card-title'; title.textContent = song.title;
      const bottom = document.createElement('span'); bottom.className = 'card-bottom';
      const category = document.createElement('span'); category.className = 'category-tag'; category.textContent = song.category;
      const fav = document.createElement('span'); fav.className = 'card-favourite'; fav.textContent = favourites.has(String(song.number)) ? '★' : '';
      const arrow = document.createElement('span'); arrow.className = 'card-arrow'; arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '↗';
      bottom.append(category, fav, arrow);
      card.append(top, title, bottom);
      card.addEventListener('click', () => { location.hash = `song-${encodeURIComponent(String(song.number))}`; });
      els.grid.append(card);
    });
  }

  function showHome() {
    stopAutoScroll();
    currentSong = null;
    els.home.hidden = false;
    els.detail.hidden = true;
    renderSongGrid();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showSong(number) {
    const song = songs.find(item => String(item.number) === String(number));
    if (!song) { showHome(); return; }
    stopAutoScroll();
    currentSong = song;
    transposeSteps = 0;
    lyricFontSize = 23;
    els.home.hidden = true;
    els.detail.hidden = false;
    els.number.textContent = `NO. ${song.number}`;
    els.category.textContent = song.category;
    els.title.textContent = song.title;
    els.originalKey.textContent = `Original key: ${song.key}`;
    els.sampleNotice.hidden = !song.demoLyrics;
    updateSongControls();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateSongControls() {
    if (!currentSong) return;
    const semitones = transposeSteps * 2;
    els.currentKey.textContent = `Key: ${shiftKey(currentSong.key, semitones)}`;
    els.lyrics.style.setProperty('--lyrics-font-size', `${lyricFontSize}px`);
    renderLyrics(els.lyrics, currentSong.lyrics, semitones);
    const isFavourite = favourites.has(String(currentSong.number));
    els.favourite.setAttribute('aria-pressed', String(isFavourite));
    els.favourite.setAttribute('aria-label', isFavourite ? 'ප්‍රියතමයෙන් ඉවත් කරන්න' : 'ප්‍රියතම ගීතිකාවක් ලෙස සලකුණු කරන්න');
    els.favourite.querySelector('[aria-hidden="true"]').textContent = isFavourite ? '★' : '☆';
  }

  function stopAutoScroll() {
    if (autoScrollTimer) window.clearInterval(autoScrollTimer);
    autoScrollTimer = null;
    if (els.scroll) {
      els.scroll.setAttribute('aria-pressed', 'false');
      els.scroll.querySelector('[aria-hidden="true"]').textContent = '▶';
    }
  }

  function routeFromHash() {
    const match = /^#song-(.+)$/.exec(location.hash);
    if (match) showSong(decodeURIComponent(match[1]));
    else showHome();
  }

  async function loadSongs() {
    const savedSongs = safeReadJSON(DATA_KEY, null);
    if (Array.isArray(savedSongs)) return savedSongs;
    const response = await fetch('./geethika.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Could not load geethika.json (${response.status})`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('geethika.json must contain an array');
    return data;
  }

  function updateNetworkStatus() {
    const offline = !navigator.onLine;
    els.status.classList.toggle('is-offline', offline);
    els.status.querySelector('span').textContent = offline ? 'Offline' : 'Online';
  }

  function registerPWA() {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(error => console.warn('Service worker registration failed:', error));
    }
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus();
  }

  els.search.addEventListener('input', renderSongGrid);
  els.back.addEventListener('click', () => {
    history.pushState({}, '', `${location.pathname}${location.search}`);
    showHome();
  });
  window.addEventListener('hashchange', routeFromHash);
  window.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (!els.home.hidden) els.search.focus();
    }
  });
  els.transposeDown.addEventListener('click', () => { if (currentSong) { transposeSteps = Math.max(-12, transposeSteps - 1); updateSongControls(); } });
  els.transposeUp.addEventListener('click', () => { if (currentSong) { transposeSteps = Math.min(12, transposeSteps + 1); updateSongControls(); } });
  els.fontDown.addEventListener('click', () => { lyricFontSize = Math.max(17, lyricFontSize - 2); updateSongControls(); });
  els.fontUp.addEventListener('click', () => { lyricFontSize = Math.min(39, lyricFontSize + 2); updateSongControls(); });
  els.favourite.addEventListener('click', () => {
    if (!currentSong) return;
    const id = String(currentSong.number);
    if (favourites.has(id)) favourites.delete(id); else favourites.add(id);
    try { localStorage.setItem(FAVOURITES_KEY, JSON.stringify([...favourites])); } catch { /* Optional preference. */ }
    updateSongControls();
  });
  els.scroll.addEventListener('click', () => {
    if (autoScrollTimer) { stopAutoScroll(); return; }
    els.scroll.setAttribute('aria-pressed', 'true');
    els.scroll.querySelector('[aria-hidden="true"]').textContent = '❚❚';
    autoScrollTimer = window.setInterval(() => {
      const remaining = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
      if (remaining <= 1) { stopAutoScroll(); return; }
      window.scrollBy(0, Math.min(1.1, remaining));
    }, 35);
  });

  favourites = new Set((safeReadJSON(FAVOURITES_KEY, []) || []).map(String));
  makeCategoryButtons();
  loadSongs().then(data => {
    songs = data;
    renderSongGrid();
    routeFromHash();
    registerPWA();
  }).catch(error => {
    console.error(error);
    els.empty.hidden = false;
    els.empty.querySelector('h3').textContent = 'ගීතිකා පූරණය කළ නොහැක';
    els.empty.querySelector('p').textContent = 'geethika.json ගොනුව සමඟ app එක local server එකකින් විවෘත කරන්න.';
    registerPWA();
  });
})();
