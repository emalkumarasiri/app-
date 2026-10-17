(() => {
  'use strict';

  const DATA_KEY = 'geethikaLK.songs.v1';
  const FAVOURITES_KEY = 'geethikaLK.favourites.v1';
  const DARK_MODE_KEY = 'geethikaLK.darkMode.v1';
  const FONT_SIZE_KEY = 'geethikaLK.lyricsFontSize.v1';

  const CATEGORIES = [
    'All',
    'Prashansa',
    'Namaskara',
    'Deva Meheya',
    'Christmas'
  ];

  const CHORD_PATTERN =
    /\[([A-G](?:#|b)?(?:(?:maj|min|m|sus|add|dim|aug|mMaj|maj|min)?\d*(?:sus\d*)?)(?:\/[A-G](?:#|b)?)?)\]/g;

  const NOTES = [
    'C', 'C#', 'D', 'D#', 'E', 'F',
    'F#', 'G', 'G#', 'A', 'A#', 'B'
  ];

  const FLAT_TO_SHARP = {
    'Cb': 'B',
    'Db': 'C#',
    'Eb': 'D#',
    'Fb': 'E',
    'Gb': 'F#',
    'Ab': 'G#',
    'Bb': 'A#',
    'E#': 'F',
    'B#': 'C'
  };

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
    status: document.querySelector('#offline-status'),

    menuToggle: document.querySelector('#menu-toggle'),
    sidebar: document.querySelector('#app-sidebar'),
    sidebarOverlay: document.querySelector('#sidebar-overlay'),
    sidebarClose: document.querySelector('#sidebar-close'),

    settingsDialog: document.querySelector('#settings-dialog'),
    aboutDialog: document.querySelector('#about-dialog'),
    darkModeToggle: document.querySelector('#dark-mode-toggle'),
    settingsFontDown: document.querySelector('#settings-font-down'),
    settingsFontUp: document.querySelector('#settings-font-up'),

    catalogTitle: document.querySelector('#catalog-title')
  };

  let songs = [];
  let activeCategory = 'All';
  let currentSong = null;
  let transposeSteps = 0;
  let lyricFontSize = readFontSize();
  let autoScrollTimer = null;
  let favourites = new Set(
    (safeReadJSON(FAVOURITES_KEY, []) || []).map(String)
  );

  let favouritesOnly = false;

  function safeReadJSON(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function readFontSize() {
    try {
      const value = Number(localStorage.getItem(FONT_SIZE_KEY));

      if (Number.isFinite(value) && value >= 17 && value <= 39) {
        return value;
      }
    } catch {
      // Use the default size if storage is unavailable.
    }

    return 23;
  }

  function savePreference(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      // The app can still work without saving preferences.
    }
  }

  function canonicalRoot(letter, accidental) {
    const root = `${letter}${accidental || ''}`;
    return FLAT_TO_SHARP[root] || root;
  }

  function shiftNote(note, semitones) {
    const match = /^([A-G])([#b]?)$/.exec(note);

    if (!match) return note;

    const root = canonicalRoot(match[1], match[2]);
    const pitch = NOTES.indexOf(root);

    if (pitch < 0) return note;

    return NOTES[((pitch + semitones) % 12 + 12) % 12];
  }

  function shiftChord(chord, semitones) {
    const match = /^([A-G])([#b]?)(.*)$/.exec(chord);

    if (!match) return chord;

    const root = canonicalRoot(match[1], match[2]);
    const pitch = NOTES.indexOf(root);

    if (pitch < 0) return chord;

    let suffix = match[3];

    const slashMatch = /^(.*)\/([A-G])([#b]?)$/.exec(suffix);

    if (slashMatch) {
      suffix = `${slashMatch[1]}/${shiftNote(
        `${slashMatch[2]}${slashMatch[3]}`,
        semitones
      )}`;
    }

    return NOTES[((pitch + semitones) % 12 + 12) % 12] + suffix;
  }

  function shiftKey(key, semitones) {
    const match = /^([A-G])([#b]?)(m?)$/.exec(
      String(key || '').trim()
    );

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

    if (matches[0].index > 0) {
      row.append(
        document.createTextNode(line.slice(0, matches[0].index))
      );
    }

    matches.forEach((match, index) => {
      const contentStart = match.index + match[0].length;

      const contentEnd =
        index + 1 < matches.length
          ? matches[index + 1].index
          : line.length;

      const unit = document.createElement('span');
      unit.className = 'lyric-unit';

      const chordLabel = document.createElement('span');
      chordLabel.className = 'chord-label';
      chordLabel.textContent = shiftChord(match[1], semitones);

      const lyricText = document.createElement('span');
      lyricText.className = 'lyric-text';
      lyricText.textContent =
        line.slice(contentStart, contentEnd) || '\u00a0';

      unit.append(chordLabel, lyricText);
      row.append(unit);
    });

    return row;
  }

  function renderLyrics(container, lyrics, semitones) {
    container.replaceChildren();

    const lines = String(lyrics || '')
      .replace(/\r/g, '')
      .split('\n');

    lines.forEach(line => {
      container.append(renderChordLine(line, semitones));
    });
  }

  // SIDEBAR

  function openSidebar() {
    if (!els.sidebar) return;

    els.sidebar.classList.add('is-open');
    els.sidebarOverlay.hidden = false;

    els.sidebar.setAttribute('aria-hidden', 'false');
    els.sidebar.inert = false;

    els.menuToggle?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('sidebar-open');
  }

  function closeSidebar() {
    if (!els.sidebar) return;

    els.sidebar.classList.remove('is-open');
    els.sidebarOverlay.hidden = true;

    els.sidebar.setAttribute('aria-hidden', 'true');
    els.sidebar.inert = true;

    els.menuToggle?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('sidebar-open');
  }

  function setActiveMenu(action) {
    document.querySelectorAll('[data-menu-action]').forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.menuAction === action
      );
    });
  }

  function openDialog(dialog) {
    if (!dialog) return;

    closeSidebar();

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function closeDialog(dialog) {
    if (!dialog) return;

    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
  }

  function closeAllDialogs() {
    closeDialog(els.settingsDialog);
    closeDialog(els.aboutDialog);
  }

  // DARK MODE

  function applyDarkMode(enabled) {
    document.body.classList.toggle('dark-mode', enabled);

    if (els.darkModeToggle) {
      els.darkModeToggle.checked = enabled;
    }

    savePreference(DARK_MODE_KEY, enabled ? 'true' : 'false');
  }

  function initializeDarkMode() {
    let enabled = false;

    try {
      enabled = localStorage.getItem(DARK_MODE_KEY) === 'true';
    } catch {
      // Default to light mode.
    }

    applyDarkMode(enabled);
  }

  // CATEGORY BUTTONS

  function makeCategoryButtons() {
    if (!els.categories) return;

    els.categories.replaceChildren();

    CATEGORIES.forEach(category => {
      const button = document.createElement('button');

      button.type = 'button';
      button.className = 'category-button';
      button.textContent = category;

      button.setAttribute(
        'aria-pressed',
        String(category === activeCategory && !favouritesOnly)
      );

      button.addEventListener('click', () => {
        activeCategory = category;
        favouritesOnly = false;

        setActiveMenu('all-hymns');
        updateCatalogTitle();

        makeCategoryButtons();
        renderSongGrid();
      });

      els.categories.append(button);
    });
  }

  function filteredSongs() {
    const query = els.search.value.trim().toLocaleLowerCase();

    return songs.filter(song => {
      const categoryMatch =
        activeCategory === 'All' ||
        song.category === activeCategory;

      const favouriteMatch =
        !favouritesOnly ||
        favourites.has(String(song.number));

      const searchable =
        `${song.title} ${song.category} ${song.number} ${song.key}`
          .toLocaleLowerCase();

      const searchMatch =
        !query || searchable.includes(query);

      return categoryMatch && favouriteMatch && searchMatch;
    });
  }

  function updateCatalogTitle() {
    if (!els.catalogTitle) return;

    els.catalogTitle.textContent = favouritesOnly
      ? 'My Favourite Hymns'
      : 'Hymn Collection';
  }

  function renderSongGrid() {
    if (!els.grid || !els.count || !els.empty) return;

    const visible = filteredSongs();

    els.grid.replaceChildren();

    els.count.textContent = `ගීතිකා ${visible.length}`;
    els.empty.hidden = visible.length > 0;

    if (!visible.length) {
      const heading = els.empty.querySelector('h3');
      const description = els.empty.querySelector('p');

      if (heading && description) {
        if (favouritesOnly) {
          heading.textContent = 'ප්‍රියතම ගීතිකා නැත';
          description.textContent =
            'ඔබ කැමති ගීතිකාවක් විවෘත කර Favourite බොත්තම ඔබන්න.';
        } else {
          heading.textContent = 'ගීතිකා හමු නොවීය';
          description.textContent =
            'වෙනත් වචනයක් හෝ Category එකක් භාවිතා කර සොයන්න.';
        }
      }
    }

    visible.forEach(song => {
      const card = document.createElement('button');

      card.type = 'button';
      card.className = 'song-card';

      card.setAttribute(
        'aria-label',
        `${song.number}. ${song.title}, ${song.category}, Key ${song.key}`
      );

      const top = document.createElement('span');
      top.className = 'card-top';

      const number = document.createElement('span');
      number.className = 'card-number';
      number.textContent = `NO. ${song.number}`;

      const key = document.createElement('span');
      key.className = 'card-key';
      key.textContent = song.key;

      top.append(number, key);

      const title = document.createElement('span');
      title.className = 'card-title';
      title.textContent = song.title;

      const bottom = document.createElement('span');
      bottom.className = 'card-bottom';

      const category = document.createElement('span');
      category.className = 'category-tag';
      category.textContent = song.category;

      const fav = document.createElement('span');
      fav.className = 'card-favourite';
      fav.textContent =
        favourites.has(String(song.number)) ? '★' : '';

      const arrow = document.createElement('span');
      arrow.className = 'card-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '↗';

      bottom.append(category, fav, arrow);
      card.append(top, title, bottom);

      card.addEventListener('click', () => {
        location.hash =
          `song-${encodeURIComponent(String(song.number))}`;
      });

      els.grid.append(card);
    });
  }

  function showHome() {
    stopAutoScroll();

    currentSong = null;

    els.home.hidden = false;
    els.detail.hidden = true;

    renderSongGrid();

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  function showSong(number) {
    const song = songs.find(
      item => String(item.number) === String(number)
    );

    if (!song) {
      showHome();
      return;
    }

    stopAutoScroll();

    currentSong = song;
    transposeSteps = 0;

    els.home.hidden = true;
    els.detail.hidden = false;

    els.number.textContent = `NO. ${song.number}`;
    els.category.textContent = song.category;
    els.title.textContent = song.title;
    els.originalKey.textContent = `Original key: ${song.key}`;

    els.sampleNotice.hidden = !song.demoLyrics;

    updateSongControls();

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  function updateSongControls() {
    if (!currentSong) return;

    els.currentKey.textContent =
      `Key: ${shiftKey(currentSong.key, transposeSteps)}`;

    els.lyrics.style.setProperty(
      '--lyrics-font-size',
      `${lyricFontSize}px`
    );

    renderLyrics(
      els.lyrics,
      currentSong.lyrics,
      transposeSteps
    );

    const isFavourite =
      favourites.has(String(currentSong.number));

    els.favourite.setAttribute(
      'aria-pressed',
      String(isFavourite)
    );

    els.favourite.setAttribute(
      'aria-label',
      isFavourite
        ? 'ප්‍රියතමයෙන් ඉවත් කරන්න'
        : 'ප්‍රියතම ගීතිකාවක් ලෙස සලකුණු කරන්න'
    );

    const icon =
      els.favourite.querySelector('[aria-hidden="true"]');

    if (icon) {
      icon.textContent = isFavourite ? '★' : '☆';
    }
  }

  function saveFavourites() {
    savePreference(
      FAVOURITES_KEY,
      JSON.stringify([...favourites])
    );
  }

  function stopAutoScroll() {
    if (autoScrollTimer) {
      window.clearInterval(autoScrollTimer);
    }

    autoScrollTimer = null;

    if (els.scroll) {
      els.scroll.setAttribute('aria-pressed', 'false');

      const icon =
        els.scroll.querySelector('[aria-hidden="true"]');

      if (icon) icon.textContent = '▶';
    }
  }

  function routeFromHash() {
    const match = /^#song-(.+)$/.exec(location.hash);

    if (match) {
      showSong(decodeURIComponent(match[1]));
    } else {
      showHome();
    }
  }

  async function loadSongs() {
    const savedSongs = safeReadJSON(DATA_KEY, null);

    if (Array.isArray(savedSongs)) {
      return savedSongs;
    }

    const response = await fetch('./geethika.json', {
      cache: 'no-cache'
    });

    if (!response.ok) {
      throw new Error(
        `Could not load geethika.json (${response.status})`
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('geethika.json must contain an array');
    }

    return data;
  }

  function updateNetworkStatus() {
    if (!els.status) return;

    const offline = !navigator.onLine;

    els.status.classList.toggle('is-offline', offline);

    const label = els.status.querySelector('span');

    if (label) {
      label.textContent = offline ? 'Offline' : 'Online';
    }
  }

  function registerPWA() {
    if (
      'serviceWorker' in navigator &&
      location.protocol.startsWith('http')
    ) {
      navigator.serviceWorker
        .register('./sw.js', { scope: './' })
        .catch(error => {
          console.warn(
            'Service worker registration failed:',
            error
          );
        });
    }

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    updateNetworkStatus();
  }

  // SIDEBAR MENU ACTIONS

  document.querySelectorAll('[data-menu-action]').forEach(button => {
    button.addEventListener('click', () => {
      const action = button.dataset.menuAction;

      if (action === 'settings') {
        openDialog(els.settingsDialog);
        return;
      }

      if (action === 'about') {
        openDialog(els.aboutDialog);
        return;
      }

      if (action === 'favourites') {
        favouritesOnly = true;
        activeCategory = 'All';

        els.search.value = '';

        makeCategoryButtons();
        updateCatalogTitle();
        setActiveMenu('favourites');
      }

      if (action === 'all-hymns') {
        favouritesOnly = false;
        activeCategory = 'All';

        els.search.value = '';

        makeCategoryButtons();
        updateCatalogTitle();
        setActiveMenu('all-hymns');
      }

      history.pushState(
        {},
        '',
        `${location.pathname}${location.search}`
      );

      closeSidebar();
      showHome();
    });
  });

  // SIDEBAR OPEN / CLOSE

  els.menuToggle?.addEventListener('click', openSidebar);
  els.sidebarClose?.addEventListener('click', closeSidebar);
  els.sidebarOverlay?.addEventListener('click', closeSidebar);

  // DIALOG BUTTONS

  document.querySelectorAll('[data-close-dialog]').forEach(button => {
    button.addEventListener('click', () => {
      closeAllDialogs();
    });
  });

  [els.settingsDialog, els.aboutDialog].forEach(dialog => {
    dialog?.addEventListener('click', event => {
      if (event.target === dialog) {
        closeDialog(dialog);
      }
    });
  });

  // SETTINGS: DARK MODE

  els.darkModeToggle?.addEventListener('change', () => {
    applyDarkMode(els.darkModeToggle.checked);
  });

  // SETTINGS: FONT SIZE

  function changeFontSize(amount) {
    lyricFontSize = Math.max(
      17,
      Math.min(39, lyricFontSize + amount)
    );

    savePreference(FONT_SIZE_KEY, lyricFontSize);

    if (currentSong) {
      updateSongControls();
    } else {
      els.lyrics?.style.setProperty(
        '--lyrics-font-size',
        `${lyricFontSize}px`
      );
    }
  }

  els.settingsFontDown?.addEventListener('click', () => {
    changeFontSize(-2);
  });

  els.settingsFontUp?.addEventListener('click', () => {
    changeFontSize(2);
  });

  // SEARCH

  els.search.addEventListener('input', renderSongGrid);

  // BACK BUTTON

  els.back.addEventListener('click', () => {
    history.pushState(
      {},
      '',
      `${location.pathname}${location.search}`
    );

    showHome();
  });

  window.addEventListener('hashchange', routeFromHash);

  // KEYBOARD SHORTCUTS

  window.addEventListener('keydown', event => {
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === 'k'
    ) {
      event.preventDefault();

      if (!els.home.hidden) {
        els.search.focus();
      }
    }

    if (event.key === 'Escape') {
      closeSidebar();
    }
  });

  // TRANSPOSE

  els.transposeDown.addEventListener('click', () => {
    if (!currentSong) return;

    transposeSteps = Math.max(-12, transposeSteps - 1);
    updateSongControls();
  });

  els.transposeUp.addEventListener('click', () => {
    if (!currentSong) return;

    transposeSteps = Math.min(12, transposeSteps + 1);
    updateSongControls();
  });

  // SONG FONT SIZE

  els.fontDown.addEventListener('click', () => {
    changeFontSize(-2);
  });

  els.fontUp.addEventListener('click', () => {
    changeFontSize(2);
  });

  // FAVOURITES

  els.favourite.addEventListener('click', () => {
    if (!currentSong) return;

    const id = String(currentSong.number);

    if (favourites.has(id)) {
      favourites.delete(id);
    } else {
      favourites.add(id);
    }

    saveFavourites();
    updateSongControls();

    if (favouritesOnly) {
      renderSongGrid();
    }
  });

  // AUTOSCROLL

  els.scroll.addEventListener('click', () => {
    if (autoScrollTimer) {
      stopAutoScroll();
      return;
    }

    els.scroll.setAttribute('aria-pressed', 'true');

    const icon =
      els.scroll.querySelector('[aria-hidden="true"]');

    if (icon) icon.textContent = '❚❚';

    autoScrollTimer = window.setInterval(() => {
      const remaining =
        document.documentElement.scrollHeight -
        window.innerHeight -
        window.scrollY;

      if (remaining <= 1) {
        stopAutoScroll();
        return;
      }

      window.scrollBy(0, Math.min(1.1, remaining));
    }, 35);
  });

  // INITIALIZE

  initializeDarkMode();

  makeCategoryButtons();
  updateCatalogTitle();

  els.lyrics?.style.setProperty(
    '--lyrics-font-size',
    `${lyricFontSize}px`
  );

  loadSongs()
    .then(data => {
      songs = data;

      renderSongGrid();
      routeFromHash();
      registerPWA();
    })
    .catch(error => {
      console.error(error);

      els.empty.hidden = false;

      els.empty.querySelector('h3').textContent =
        'ගීතිකා පූරණය කළ නොහැක';

      els.empty.querySelector('p').textContent =
        'geethika.json ගොනුව පරීක්ෂා කර නැවත උත්සාහ කරන්න.';

      registerPWA();
    });
})();