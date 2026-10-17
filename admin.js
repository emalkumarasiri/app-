(() => {
  'use strict';

  const ADMIN_PASSWORD = 'geethika2026';
  const DATA_KEY = 'geethikaLK.songs.v1';
  const AUTH_KEY = 'geethikaLK.adminSession';
  const CATEGORIES = ['Other', 'Namaskara', 'Kurusiya', 'Christmas'];
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

  function readLocalSongs() { try { const v = localStorage.getItem(DATA_KEY); if(v===null) return null; const p=JSON.parse(v); return Array.isArray(p)?p:null; } catch { return null; } }
  function saveLocalSongs() { try { localStorage.setItem(DATA_KEY, JSON.stringify(songs)); return true; } catch { setStatus('Local save failed', true); return false; } }
  function setStatus(message, error = false) { els.status.textContent = message; els.status.style.color = error ? '#ba5148' : '#2e7d32'; }
  function safeText(parent, tag, className, value) { const node=document.createElement(tag); if(className) node.className=className; node.textContent=value; parent.append(node); return node; }
  function renderChordLine(line) {
    const row=document.createElement('div'); row.className='lyric-line';
    const pattern=new RegExp(CHORD_PATTERN.source,'g'); const matches=[...line.matchAll(pattern)];
    if(!matches.length){ row.textContent=line||'\u00a0'; return row; }
    if(matches[0].index>0) row.append(document.createTextNode(line.slice(0,matches[0].index)));
    matches.forEach((match,index)=>{ const start=match.index+match[0].length; const end=index+1<matches.length?matches[index+1].index:line.length; const unit=document.createElement('span'); unit.className='lyric-unit'; safeText(unit,'span','chord-label',match[1]); safeText(unit,'span','lyric-text',line.slice(start,end)||'\u00a0'); row.append(unit); });
    return row;
  }
  function renderChordLyrics(container, source){ container.replaceChildren(); String(source||'').replace(/\r/g,'').split('\n').forEach(line=>container.append(renderChordLine(line))); }
  function updatePreview() {
    const number=els.number.value.trim()||'1'; const title=els.title.value.trim()||'Song title'; const category=els.category.value||CATEGORIES[0]; const key=els.key.value||'G';
    els.previewNumber.textContent=`No. ${number}`; els.previewCategory.textContent=category; els.previewName.textContent=title; els.previewKey.textContent=`Key: ${key}`;
    if(els.lyrics.value.trim()) renderChordLyrics(els.previewLyrics, els.lyrics.value); else { els.previewLyrics.replaceChildren(); safeText(els.previewLyrics,'span','preview-placeholder','Lyrics will appear here…'); }
  }
  function writeJSON(){ els.json.value=JSON.stringify(songs,null,2); els.count.textContent=`Songs: ${songs.length}`; }
  function renderList(){
    els.list.replaceChildren();
    if(!songs.length){ safeText(els.list,'p','field-help','No songs added yet.'); return; }
    [...songs].sort((a,b)=>Number(a.number)-Number(b.number)).forEach(song=>{
      const row=document.createElement('div'); row.className='admin-song-row';
      const main=document.createElement('div'); main.className='admin-song-main';
      safeText(main,'strong','',`${song.number}. ${song.title}`); safeText(main,'span','',`${song.category} · Key ${song.key}`);
      const actions=document.createElement('div'); actions.className='admin-song-actions';
      const edit=document.createElement('button'); edit.type='button'; edit.className='btn btn-secondary'; edit.textContent='Edit'; edit.addEventListener('click',()=>editSong(song));
      const remove=document.createElement('button'); remove.type='button'; remove.className='btn btn-danger'; remove.textContent='Delete'; remove.addEventListener('click',()=>deleteSong(song));
      actions.append(edit,remove); row.append(main,actions); els.list.append(row);
    });
  }
  function refreshData(){ writeJSON(); renderList(); saveLocalSongs(); setStatus('Saved locally ✅ — දැන් Export JSON ↓ කර GitHub එකට දාන්න'); }
  function clearForm(){ els.form.reset(); els.originalNumber.value=''; els.key.value='G'; els.formMode.textContent='New song'; setStatus(''); updatePreview(); }
  function editSong(song){ els.originalNumber.value=String(song.number); els.number.value=song.number; els.title.value=song.title||''; els.category.value=CATEGORIES.includes(song.category)?song.category:CATEGORIES[0]; els.key.value=KEYS.includes(song.key)?song.key:'C'; els.lyrics.value=song.lyrics||''; els.formMode.textContent=`Editing: ${song.number}`; setStatus(''); updatePreview(); els.form.scrollIntoView({behavior:'smooth'}); }
  function deleteSong(song){ if(!confirm(`Delete "${song.title}"?`)) return; songs=songs.filter(item=>String(item.number)!==String(song.number)); refreshData(); clearForm(); }

  async function loginSuccess(){
    els.login.hidden=true; els.dashboard.hidden=false; els.logout.hidden=false; clearForm(); setStatus('Loading songs…');
    try {
      const res = await fetch('./geethika.json?v='+Date.now(), {cache:'no-store'});
      if(!res.ok) throw new Error('load failed');
      const data = await res.json();
      if(Array.isArray(data)) songs = data;
      writeJSON(); renderList(); saveLocalSongs(); setStatus('Songs loaded ✅');
    } catch {
      const localSongs = readLocalSongs();
      if(localSongs){ songs=localSongs; writeJSON(); renderList(); setStatus('Showing saved copy from this browser.'); }
      else { setStatus('Could not load geethika.json', true); }
    }
  }
  function exportJSON(){ writeJSON(); const blob=new Blob([els.json.value+'\n'],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='geethika.json'; a.click(); URL.revokeObjectURL(url); setStatus('Exported geethika.json ✅ — දැන් GitHub එකට Upload කරන්න'); }

  els.loginForm.addEventListener('submit', event => {
    event.preventDefault();
    if (els.password.value === ADMIN_PASSWORD) { sessionStorage.setItem(AUTH_KEY, '1'); els.loginError.textContent=''; loginSuccess(); }
    else { els.loginError.textContent='Incorrect password.'; }
  });
  els.logout.addEventListener('click', () => { sessionStorage.removeItem(AUTH_KEY); els.dashboard.hidden=true; els.logout.hidden=true; els.login.hidden=false; els.password.value=''; });
  els.form.addEventListener('submit', event => {
    event.preventDefault(); if(!els.form.reportValidity()) return;
    const number=Number(els.number.value); const song={ number, title:els.title.value.trim(), category:els.category.value, key:els.key.value, lyrics:els.lyrics.value.trim(), demoLyrics:false };
    const previous=els.originalNumber.value; const index=previous?songs.findIndex(item=>String(item.number)===previous):songs.findIndex(item=>String(item.number)===String(number));
    if(index>=0) songs[index]=song; else songs.push(song); songs.sort((a,b)=>Number(a.number)-Number(b.number)); refreshData(); clearForm();
  });
  [els.number, els.title, els.category, els.key, els.lyrics].forEach(node=>node.addEventListener('input', updatePreview));
  [els.category, els.key].forEach(node=>node.addEventListener('change', updatePreview));
  els.clear.addEventListener('click', clearForm);
  els.export.addEventListener('click', exportJSON);
  els.copy.addEventListener('click', async () => {
    writeJSON(); try{ await navigator.clipboard.writeText(els.json.value); els.importStatus.textContent='JSON copied.'; } catch{ els.json.focus(); els.json.select(); document.execCommand('copy'); els.importStatus.textContent='Copied'; }
  });
  els.import.addEventListener('change', async event => {
    const file=event.target.files&&event.target.files[0]; if(!file) return;
    try{ const parsed=JSON.parse(await file.text()); if(Array.isArray(parsed)){ songs=parsed; songs.sort((a,b)=>Number(a.number)-Number(b.number)); refreshData(); clearForm(); els.importStatus.textContent=`Imported ${songs.length} songs.`; } } catch(e){ els.importStatus.textContent=e.message; } finally{ event.target.value=''; }
  });
  const keyPlaceholder=document.createElement('option'); keyPlaceholder.value=''; keyPlaceholder.textContent='Select key'; keyPlaceholder.disabled=true; els.key.append(keyPlaceholder);
  KEYS.forEach(key=>{ const option=document.createElement('option'); option.value=key; option.textContent=key; els.key.append(option); });
  els.key.value='G'; updatePreview();
  if (sessionStorage.getItem(AUTH_KEY)==='1') loginSuccess();
})();
