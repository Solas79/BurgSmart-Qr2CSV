// ---------------- kleine Helfer ----------------
const $ = sel => document.querySelector(sel);
const logEl = $('#log');
function log(msg){ if(!logEl) return; logEl.textContent += msg + '\n'; logEl.scrollTop = logEl.scrollHeight; }

function readFileText(file){
  return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsText(file,'utf-8'); });
}
function readFileImageData(file){
  return new Promise((res,rej)=>{
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d'); ctx.drawImage(img,0,0);
      res(ctx.getImageData(0,0,c.width,c.height));
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}
function splitSemicolonCSV(line){ return line.split(';').map(s=>s.trim()); }
function toCSVRow(cells){ return cells.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';') + '\r\n'; }

// ---------------- Header & Mapping ----------------
let header = [];
const KEYMAP = new Map(Object.entries({
  'SN':  'Serial number',
  'FTN': 'First name',
  'LTN': 'Last name',
  'RK':  'Random key',
  'IDV': 'Identifier for vendor',
  'KID': 'Key-ID',
}));

function mapKeyToHeader(k){
  const mapped = KEYMAP.get(k) || k;
  if (header.includes(mapped)) return mapped;
  const lower = new Map(header.map(h=>[h.toLowerCase(),h]));
  return lower.get(mapped.toLowerCase()) || mapped;
}

// (Geburtstag nicht mehr genutzt – Funktion bleibt no-op)
function formatBdayIfNeeded(name, val){ return val; }

function parseQRText(qrText){
  const data = Object.fromEntries(header.map(h=>[h,'']));
  const tokens = qrText.split(/[\r\n;]+/).map(s=>s.trim()).filter(Boolean);
  for (const tok of tokens){
    const posCol = tok.indexOf(':'), posEq = tok.indexOf('=');
    let pos = (posCol===-1)?posEq:((posEq!==-1 && posEq<posCol)?posEq:posCol);
    if (pos<0) continue;
    const key = tok.slice(0,pos).trim();
    const val = tok.slice(pos+1).trim();
    const target = mapKeyToHeader(key);
    if (Object.prototype.hasOwnProperty.call(data, target)){
      data[target] = formatBdayIfNeeded(target, val);
    }
  }
  return data;
}

// ---------------- Demo-Header Button ----------------
const demoHeaderBtn = $('#useDemoHeader');
if (demoHeaderBtn){
  demoHeaderBtn.addEventListener('click', ()=>{
    header = [
      'Serial number',
      'First name',
      'Last name',
      'Random key',
      'Identifier for vendor',
      'Key-ID'
    ];
    const prev = $('#headerPreview');
    if (prev) prev.textContent = toCSVRow(header).trim();
    log('Demo-Header aktiviert (secuEntry).');
  });
}

// ---------------- Header-Datei laden ----------------
const headerInput = $('#headerFile');
if (headerInput){
  headerInput.addEventListener('change', async (e)=>{
    try{
      const f = e.target.files?.[0]; if (!f) return;
      const txt = await readFileText(f);
      const first = (txt.split(/\r?\n/)[0] || '').trim();
      header = splitSemicolonCSV(first);
      const prev = $('#headerPreview'); if (prev) prev.textContent = first;
      log('Header geladen: ' + header.join(' | '));
    }catch(err){ log('Header-Fehler: '+err.message); }
  });
}

// ---------------- Vorschau (letzter Scan) ----------------
let lastRowObj = null; // merkt sich den zuletzt geparsten Datensatz

function renderPreview(rowObj){
  lastRowObj = rowObj;
  const empty = $('#previewEmpty'), box = $('#previewBox'), tbl = $('#previewTable');
  if (!tbl) return;
  tbl.innerHTML = '';

  // Kopf
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  const th1 = document.createElement('th'); th1.textContent = 'Feld';
  const th2 = document.createElement('th'); th2.textContent = 'Wert';
  trh.append(th1, th2); thead.append(trh); tbl.append(thead);

  // Body – Reihen in der Reihenfolge des Headers
  const tb = document.createElement('tbody');
  for (const h of header){
    const tr = document.createElement('tr');
    const td1 = document.createElement('td'); td1.textContent = h;
    const td2 = document.createElement('td'); td2.textContent = rowObj[h] || '';
    tr.append(td1, td2); tb.append(tr);
  }
  tbl.append(tb);

  if (empty) empty.style.display = 'none';
  if (box)   box.style.display = '';
}

// Buttons: Kopieren & Speichern
const copyBtn = $('#copyRow');
if (copyBtn){
  copyBtn.addEventListener('click', async ()=>{
    if (!lastRowObj){ alert('Kein Datensatz vorhanden.'); return; }
    const rowArr = header.map(h => lastRowObj[h] || '');
    const csv = toCSVRow(header) + toCSVRow(rowArr);
    try{
      await navigator.clipboard.writeText(csv);
      log('Aktueller Datensatz in die Zwischenablage kopiert.');
    }catch{
      // Fallback: Download als .txt
      const blob = new Blob([csv], {type:'text/plain;charset=utf-8'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'row.csv.txt'; a.click();
      log('Clipboard nicht erlaubt – als Datei gespeichert.');
    }
  });
}
const saveBtn = $('#saveRow');
if (saveBtn){
  saveBtn.addEventListener('click', ()=>{
    if (!lastRowObj){ alert('Kein Datensatz vorhanden.'); return; }
    const rowArr = header.map(h => lastRowObj[h] || '');
    const csv = toCSVRow(header) + toCSVRow(rowArr);
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
    const last = (lastRowObj['Last name']||'unbekannt').trim()||'unbekannt';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${last}-reg.csv`;
    a.click();
  });
}

// ---------------- QR-Decoding aus Bild ----------------
async function decodeFromImageFile(file){
  // 1) Eingebauter BarcodeDetector (falls vorhanden)
  if ('BarcodeDetector' in window) {
    try {
      const det = new window.BarcodeDetector({ formats: ['qr_code'] });
      const imgBitmap = await createImageBitmap(file);
      const c = document.createElement('canvas');
      c.width = imgBitmap.width; c.height = imgBitmap.height;
      const ctx = c.getContext('2d'); ctx.drawImage(imgBitmap, 0, 0);
      const res = await det.detect(c);
      if (res && res.length){
        const v = (res[0].rawValue ?? '').toString().trim();
        if (v) return v;
      }
    } catch(_) { /* später jsQR */ }
  }
  // 2) Fallback: jsQR (lokal unter vendor/jsQR.min.js)
  if (document.documentElement.dataset.jsqr === '1' && window.jsQR) {
    const imgData = await readFileImageData(file);
    const result = window.jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'dontInvert' });
    if (result?.data) return result.data.trim();
  }
  // 3) nichts verfügbar
  throw new Error('Kein QR-Decoder verfügbar (BarcodeDetector oder vendor/jsQR.min.js benötigt).');
}

// ---------------- Batch: Bilder -> CSV ----------------
const runBtn = $('#runBtn');
if (runBtn){
  runBtn.addEventListener('click', async ()=>{
    try{
      if (header.length===0){ alert('Bitte zuerst Header laden (oder Demo-Header verwenden).'); return; }
      const files = Array.from(($('#images')?.files)||[]);
      if (files.length===0){ alert('Bitte Bilder auswählen.'); return; }
      const separate = !!$('#separateFiles')?.checked;

      let combinedRows = [toCSVRow(header)];
      let made = 0;

      for (const f of files){
        log('Lese: ' + f.name);
        let qr = '';
        try{
          qr = await decodeFromImageFile(f);
        }catch(err){
          log('  Fehler beim Lesen: ' + err.message);
          continue;
        }
        if (!qr){ log('  Kein QR erkannt.'); continue; }

        const rowObj = parseQRText(qr);
        renderPreview(rowObj); // Vorschau aktualisieren
        const rowArr = header.map(h=>rowObj[h]||'');

        if (separate){
          const last = (rowObj['Last name']||'unbekannt').trim() || 'unbekannt';
          const blob = new Blob([toCSVRow(header)+toCSVRow(rowArr)], {type:'text/csv;charset=utf-8'});
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `${last}-reg.csv`;
          a.click();
        } else {
          combinedRows.push(toCSVRow(rowArr));
        }
        made++;
        log('  OK: ' + f.name);
      }

      if (!separate && made>0){
        const blob = new Blob([combinedRows.join('')], {type:'text/csv;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = $('#downloadLink');
        if (a){
          a.href = url; a.download = 'export.csv'; a.hidden = false;
          a.textContent = 'CSV herunterladen ('+made+' Datensätze)';
        }
        log('Export fertig: export.csv');
      }
      if (made===0) log('Keine Datensätze erzeugt.');
    }catch(e){
      console.error(e); alert('Fehler: '+e.message);
    }
  });
}

// ---------------- Kamera (start/snap/stop) ----------------
let stream = null;

async function startCamera(){
  try{
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const video = $('#video'); if (!video) return;
    video.srcObject = stream;
    await video.play();
    $('#snap').disabled = false;
    $('#stopCam').disabled = false;
    log('Kamera gestartet.');
  }catch(err){
    log('Fehler beim Start der Kamera: ' + err.message);
  }
}

async function snapOnce(){
  const video = $('#video'), c = $('#canvas');
  if (!video || !c || !video.videoWidth){ log('Kamera nicht bereit.'); return; }
  c.width = video.videoWidth; c.height = video.videoHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(video, 0, 0);

  let text = '';

  // 1) BarcodeDetector zuerst
  if ('BarcodeDetector' in window) {
    try {
      const det = new window.BarcodeDetector({ formats: ['qr_code'] });
      const res = await det.detect(c);
      if (res && res.length) text = (res[0].rawValue||'').toString().trim();
    } catch(_) {}
  }

  // 2) jsQR-Fallback
  if (!text && window.jsQR) {
    const imgData = ctx.getImageData(0,0,c.width,c.height);
    const r = window.jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts:'dontInvert' });
    if (r?.data) text = r.data.trim();
  }

  if (!text){ log('Kein QR im Kamerabild.'); return; }

  log('QR erkannt (Kamera): ' + text.slice(0,120) + (text.length>120?'…':''));
  if (header.length===0){ alert('Bitte Header laden (oder Demo-Header).'); return; }

  const row = parseQRText(text);
  renderPreview(row); // Vorschau aktualisieren
  const csv = toCSVRow(header) + toCSVRow(header.map(h=>row[h]||''));
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const last = (row['Last name']||'unbekannt').trim()||'unbekannt';
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${last}-reg.csv`; a.click();
}

function stopCamera(){
  if (stream){ stream.getTracks().forEach(t=>t.stop()); stream = null; }
  const snap = $('#snap'), stop = $('#stopCam');
  if (snap) snap.disabled = true;
  if (stop) stop.disabled = true;
  log('Kamera gestoppt.');
}

// ---------------- PWA & Kamera-Sichtbarkeit ----------------
(function loadJsQRIfPresent(){
  // versucht vendor/jsQR.min.js zu laden; wenn vorhanden -> data-jsqr=1
  const s = document.createElement('script');
  s.src = 'vendor/jsQR.min.js';
  s.onload = () => document.documentElement.dataset.jsqr = '1';
  s.onerror = () => console.info('jsQR nicht gefunden – BarcodeDetector wird verwendet, wenn vorhanden.');
  document.head.appendChild(s);
})();

window.addEventListener('DOMContentLoaded', ()=>{
  // PWA Install-Button (optional)
  let deferredPrompt=null;
  const installBtn = $('#installBtn');
  window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredPrompt = e; if(installBtn) installBtn.hidden=false; });
  if (installBtn){
    installBtn.addEventListener('click', async ()=>{
      if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; installBtn.hidden = true;
    });
  }

  // Kamera nur anzeigen/aktivieren, wenn getUserMedia verfügbar
  const camSection = $('#camSection');
  if (camSection && navigator.mediaDevices?.getUserMedia){
    camSection.hidden = false; // Decoder-Check passiert beim Snap selbst
    const start = $('#startCam'), snap = $('#snap'), stop = $('#stopCam');
    if (start) start.addEventListener('click', startCamera);
    if (snap)  snap.addEventListener('click', snapOnce);
    if (stop)  stop.addEventListener('click', stopCamera);
  } else if (camSection) {
    camSection.hidden = true;
    log('Kamera deaktiviert (getUserMedia nicht verfügbar).');
  }

  // Service Worker registrieren (für Offline-Betrieb über http/https)
  if ('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js'); }
});

