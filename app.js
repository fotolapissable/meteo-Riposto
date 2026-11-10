// ══════════════════════════════════════════════
// METEO RIPOSTO — logica dell'app (fotolapissable.it)
// ══════════════════════════════════════════════

// ── UTILITY DI RETE: ogni richiesta ha un timeout, così una connessione
//    "appesa" (frequente su rete mobile) non blocca mai il resto dell'app.
function fetchT(url, ms){
  const ctl = new AbortController();
  const t = setTimeout(()=>ctl.abort(), ms||10000);
  return fetch(url, { signal: ctl.signal, cache:'no-store' }).finally(()=>clearTimeout(t));
}
async function fetchJSON(url, ms){
  const r = await fetchT(url, ms);
  if(!r.ok) throw new Error('HTTP '+r.status);
  return r.json();
}
const fmtHM = ms => new Date(ms).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Rome'});
const isMobileLayout = () => window.matchMedia('(max-width:760px)').matches;

// ══════════════════════════════════════════════
// CONFIG / POSIZIONE
// ══════════════════════════════════════════════
const DEFAULT = { lat:37.7285, lng:15.2027, label:'Riposto, CT', region:'IONIO SETTENTRIONALE' };
let POS = { lat:DEFAULT.lat, lng:DEFAULT.lng };
let CUR_LABEL = DEFAULT.label;
let geoCircles = [];
let geoMarker  = null;
const R_KM = 50;

function drawPosition(lat, lng, label, popupExtra){
  geoCircles.forEach(c => map.removeLayer(c));
  geoCircles = [];
  if (geoMarker) { map.removeLayer(geoMarker); geoMarker = null; }
  geoCircles.push(
    L.circle([lat,lng],{radius:50000,color:'#C8813A',weight:1.2,fillColor:'#C8813A',fillOpacity:.025,dashArray:'6,5',interactive:false}).addTo(map),
    L.circle([lat,lng],{radius:25000,color:'#C8813A',weight:.5,fillOpacity:0,dashArray:'3,7',opacity:.35,interactive:false}).addTo(map),
    L.circle([lat,lng],{radius:10000,color:'#C8813A',weight:.4,fillOpacity:0,dashArray:'2,8',opacity:.25,interactive:false}).addTo(map)
  );
  // Linee guida direzionali: ora seguono la posizione (prima restavano su Riposto)
  for(let a=0;a<360;a+=45){
    const len=0.55;
    const dlat=len*Math.cos(a*Math.PI/180)/111;
    const dlng=len*Math.sin(a*Math.PI/180)/(111*Math.cos(lat*Math.PI/180));
    geoCircles.push(L.polyline([[lat,lng],[lat+dlat,lng+dlng]],
      {color:'rgba(200,129,58,0.12)',weight:.8,dashArray:'2,8',interactive:false}).addTo(map));
  }
  geoMarker = L.marker([lat,lng],{icon:L.divIcon({className:'',html:'<div class="rpulse"></div>',iconSize:[12,12],iconAnchor:[6,6]})})
    .addTo(map)
    .bindPopup('<b style="color:#C8813A">📍 ' + label + '</b><br>' + lat.toFixed(4) + '°N · ' + lng.toFixed(4) + '°E' + (popupExtra||''));
}

function updateMapLocation(lat, lng, label, region) {
  POS = { lat, lng };
  CUR_LABEL = label;
  document.getElementById('hdr-title').textContent = '⚡ METEO // ' + label.toUpperCase();
  document.getElementById('hdr-sub').innerHTML =
    lat.toFixed(4) + '°N &nbsp;·&nbsp; ' + lng.toFixed(4) + '°E &nbsp;·&nbsp; ' + (region || 'POSIZIONE CORRENTE');
  map.setView([lat, lng], 9);
  drawPosition(lat, lng, label);
  lStrikes = []; lLog = []; renderLog(); renderCount();
  fetchWx();
}
function resetToDefault() { updateMapLocation(DEFAULT.lat, DEFAULT.lng, DEFAULT.label, DEFAULT.region); }

// ── TAB MOBILE: Meteo / Mappa ──────────────────────────
function switchTab(tab){
  const sb=document.getElementById('sb');
  const mc=document.getElementById('mapc');
  const bMeteo=document.getElementById('tab-meteo');
  const bMappa=document.getElementById('tab-mappa');
  if(tab==='mappa'){
    sb.classList.add('mob-hide'); mc.classList.add('mob-show');
    bMappa.classList.add('on'); bMeteo.classList.remove('on');
    setTimeout(()=>{ if(window.map) map.invalidateSize(); },60);
  } else {
    sb.classList.remove('mob-hide'); mc.classList.remove('mob-show');
    bMeteo.classList.add('on'); bMappa.classList.remove('on');
  }
}

if(navigator.share) document.getElementById('share-btn').style.display='inline-block';
function shareConditions(){
  if(!wxData || !navigator.share) return;
  const c=wxData.current;
  const text=`⚡ Meteo ${CUR_LABEL}: ${Math.round(c.temperature_2m)}°C, ${WMO[c.weathercode]||''}\nVento ${Math.round(c.windspeed_10m)} km/h · UV ${c.uv_index!=null?Math.round(c.uv_index):'--'}\n`;
  navigator.share({ title:'Meteo '+CUR_LABEL, text, url:location.href }).catch(()=>{});
}

function requestGeolocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      fetchJSON('https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lng + '&format=json&accept-language=it', 8000)
        .then(d => {
          const city = (d.address && (d.address.city || d.address.town || d.address.village || d.address.county)) || 'Posizione corrente';
          const country = (d.address && d.address.country_code && d.address.country_code.toUpperCase()) || '';
          updateMapLocation(lat, lng, city, country);
        })
        .catch(() => updateMapLocation(lat, lng, 'Posizione corrente', ''));
    },
    () => console.log('[GEO] Permesso negato, uso Riposto'),
    { timeout:8000, maximumAge:300000 }
  );
}

const WMO = {
  0:'Cielo sereno ☀', 1:'Prevalentemente sereno', 2:'Parzialmente nuvoloso ⛅',
  3:'Coperto ☁', 45:'Nebbia 🌫', 48:'Nebbia con brina',
  51:'Pioggerella leggera', 53:'Pioggerella moderata', 55:'Pioggerella intensa',
  56:'Pioggerella gelata', 57:'Pioggerella gelata intensa',
  61:'Pioggia leggera 🌦', 63:'Pioggia moderata 🌧', 65:'Pioggia intensa 🌧',
  66:'Pioggia gelata', 67:'Pioggia gelata intensa',
  71:'Neve debole ❄', 73:'Neve moderata ❄', 75:'Neve intensa ❄', 77:'Granuli di neve',
  80:'Rovesci leggeri', 81:'Rovesci moderati', 82:'Rovesci violenti ⛈',
  85:'Rovesci di neve', 86:'Rovesci di neve intensi',
  95:'⚡ TEMPORALE IN CORSO', 96:'⚡ TEMPORALE con grandine', 99:'⚡ TEMPORALE FORTE con grandine'
};
const DIRS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];
const dText = d => DIRS[Math.round(d/22.5)%16];

// ── CLOCK
const clockEl = document.getElementById('hdr-clock');
function tick(){ clockEl.textContent = new Date().toLocaleTimeString('it-IT',{hour12:false,timeZone:'Europe/Rome'}); }
tick(); setInterval(tick,1000);

// ══════════════════════════════════════════════
// MAP
// ══════════════════════════════════════════════
const map = L.map('map',{center:[POS.lat,POS.lng],zoom:9,zoomControl:false,attributionControl:true});
map.createPane('base');
map.getPane('base').style.zIndex = 150;
const TRANSPARENT_TILE='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// Basemap CARTO Voyager (il tile server OSM risponde 403 ai siti di terzi)
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_54v5_1_ce6f639e845b860ae79e28d8',{
  attribution:'©<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a> · Radar: <a href="https://radar.protezionecivile.it/">Protezione Civile</a> · Meteo: <a href="https://open-meteo.com/">Open-Meteo</a>',
  subdomains:'abcd',maxZoom:19,pane:'base',errorTileUrl:TRANSPARENT_TILE
}).addTo(map);

drawPosition(DEFAULT.lat, DEFAULT.lng, 'Riposto, CT', '<br>Ionio settentrionale');

// ══════════════════════════════════════════════
// RADAR — Protezione Civile (Radar-DPC, prodotto VMI)
//
// PERCHÉ A VOLTE IL RADAR ERA VUOTO (verificato il 10/11/2026):
//  1. radar-api annuncia un nuovo istante circa 7 minuti dopo l'orario
//     nominale, ma le immagini sul server WMS sono pronte solo dopo
//     10–13 minuti.
//  2. Se in quel momento si chiede la tile, il server risponde con
//     un'immagine trasparente E LA MEMORIZZA: quella tile resta vuota per
//     tutti anche quando il dato arriva (es. VMI 12:55, salvata vuota alle
//     13:05 e ancora vuota alle 13:13).
//  3. La vecchia app chiedeva proprio l'ultimo istante appena annunciato,
//     quindi il frame LIVE era spesso vuoto.
// SOLUZIONE:
//  • orario nel formato "…:00Z" (senza millisecondi): per il server è una
//    richiesta diversa, quindi non riceve le tile vuote salvate da altri;
//  • il frame LIVE non è mai più recente di 15 minuti (RADAR_SAFE_LAG_MS):
//    il dato è sicuramente pronto e non "avveleniamo" la cache;
//  • se l'API non risponde, l'orario si calcola da soli;
//  • se il WMS della Protezione Civile non risponde, si passa da soli a
//    RainViewer come riserva, riprovando la DPC ogni 5 minuti;
//  • un controllo ogni 30 s ritenta dopo errori, perdita di rete o
//    telefono in standby; l'animazione aspetta che ogni frame sia caricato.
// ══════════════════════════════════════════════
const DPC_WMS     = 'https://radar-geowebcache.protezionecivile.it/service/wms';
const DPC_LAYER   = 'radar:vmi';
const DPC_API     = 'https://radar-api.protezionecivile.it/findLastProductByType?type=';
const DPC_STEP_MS = 5*60*1000;
const DPC_FRAMES  = 24;            // 24 × 5 min = 2 ore di storico
const RADAR_SAFE_LAG_MS = 15*60*1000;
const RADAR_OPACITY = 0.78;
const RV_API = 'https://api.rainviewer.com/public/weather-maps.json';

const R = {
  source:'dpc', frames:[], idx:-1, onLive:true,
  cache:new Map(), shown:null, apiOk:null, dpcFails:0, drawToken:0,
  lastRefreshTry:0, lastRefreshOk:0, lastDpcProbe:0, rvHost:''
};
let vis={radar:true,ltn:true};
let animOn=false, animToken=0;

const floor5 = ms => Math.floor(ms/DPC_STEP_MS)*DPC_STEP_MS;
const dpcKey = ms => new Date(ms).toISOString().slice(0,16)+':00Z';

function setRadarStatus(level, text){
  const dot=document.getElementById('rv-dot');
  dot.style.background = level==='ok' ? 'var(--green)' : level==='warn' ? 'var(--yellow)' : '#ff4444';
  dot.style.animation = level==='ok' ? '' : 'none';
  document.getElementById('rv-lbl').textContent = text || 'RADAR';
}

async function dpcLastTime(type){
  try{
    const d=await fetchJSON(DPC_API+(type||'VMI'), 8000);
    const last=d.lastProducts&&d.lastProducts[0];
    return (last&&last.time) ? last.time : null;
  }catch(e){ return null; }
}

function setFrames(list){
  const keepTs = (!R.onLive && R.frames[R.idx]) ? R.frames[R.idx].ts : null;
  R.frames=list;
  let i=R.frames.length-1;
  if(keepTs!==null){ const j=R.frames.findIndex(f=>f.ts===keepTs); i = j>=0 ? j : 0; }
  R.idx=i;
  if(!animOn) showFrame(R.idx);
}

async function refreshRadarFrames(){
  R.lastRefreshTry=Date.now();
  if(R.source==='rainviewer'){ await refreshRainViewer(); return; }
  const apiLast = await dpcLastTime('VMI');
  R.apiOk = apiLast!==null;
  const safe = floor5(Date.now()-RADAR_SAFE_LAG_MS);
  const newest = R.apiOk ? Math.min(floor5(apiLast), safe) : safe;
  const curNewest = R.frames.length ? R.frames[R.frames.length-1].ts : 0;
  if(newest!==curNewest){
    const list=[];
    for(let k=DPC_FRAMES-1;k>=0;k--){ const ts=newest-k*DPC_STEP_MS; list.push({ts, key:'dpc:'+dpcKey(ts)}); }
    setFrames(list);
  }
  R.lastRefreshOk=Date.now();
  updateRadarLabel();
}

function makeLayer(frame){
  let layer;
  if(frame.key.startsWith('dpc:')){
    layer=L.tileLayer.wms(DPC_WMS,{
      layers:DPC_LAYER, format:'image/png', transparent:true,
      version:'1.1.1', tiled:true, time:dpcKey(frame.ts),
      opacity:0, zIndex:10, maxZoom:19
    });
  } else {
    // RainViewer: zoom nativo massimo 7 (oltre viene ingrandito)
    layer=L.tileLayer(R.rvHost+frame.path+'/256/{z}/{x}/{y}/2/1_1.png',{
      opacity:0, zIndex:10, maxZoom:19, maxNativeZoom:7, errorTileUrl:TRANSPARENT_TILE
    });
  }
  layer._ok=0; layer._err=0;
  layer.on('tileload',()=>{ layer._ok++; });
  layer.on('tileerror',()=>{ layer._err++; });
  layer._ready=new Promise(res=>{
    let done=false; const fin=()=>{ if(!done){ done=true; res(); } };
    layer.once('load',fin); setTimeout(fin,7000);
  });
  return layer;
}
function getLayer(frame){
  let l=R.cache.get(frame.key);
  if(!l){ l=makeLayer(frame); R.cache.set(frame.key,l); l.addTo(map); }
  return l;
}
function pruneLayers(keep){
  for(const [k,l] of R.cache){ if(!keep.has(k)){ map.removeLayer(l); R.cache.delete(k); } }
}

// Il nuovo frame si carica invisibile e sostituisce il vecchio solo quando
// è pronto: niente più mappa "vuota" tra un frame e l'altro.
async function showFrame(i){
  if(!R.frames.length) return;
  i=Math.max(0,Math.min(i,R.frames.length-1));
  R.idx=i; R.onLive=(i===R.frames.length-1);
  updateRadarLabel();
  if(!vis.radar){ pruneLayers(new Set()); R.shown=null; return; }
  const frame=R.frames[i];
  const token=++R.drawToken;
  const layer=getLayer(frame);
  await layer._ready;
  if(token!==R.drawToken) return;
  layer.setOpacity(RADAR_OPACITY);
  R.shown=frame.key;
  for(const [k,l] of R.cache){ if(k!==frame.key) l.setOpacity(0); }
  if(!animOn) pruneLayers(new Set([frame.key]));
  checkFrameHealth(layer, frame);
}

function checkFrameHealth(layer, frame){
  if(layer._ok+layer._err===0) return; // nessuna tile richiesta (mappa nascosta)
  if(frame.key.startsWith('dpc:')){
    if(layer._ok===0){ R.dpcFails++; if(R.dpcFails>=2) switchToRainViewer(); }
    else R.dpcFails=0;
  }
  updateRadarLabel();
}

async function refreshRainViewer(){
  try{
    const d=await fetchJSON(RV_API, 8000);
    const past=(d.radar&&d.radar.past)||[];
    if(!past.length) throw new Error('vuoto');
    R.rvHost=d.host||'https://tilecache.rainviewer.com';
    const newest=past[past.length-1].time*1000;
    const curNewest=R.frames.length?R.frames[R.frames.length-1].ts:0;
    if(newest!==curNewest) setFrames(past.map(p=>({ts:p.time*1000, key:'rv:'+p.path, path:p.path})));
    R.lastRefreshOk=Date.now();
  }catch(e){ setRadarStatus('err','RADAR NON DISPONIBILE'); }
  updateRadarLabel();
  if(Date.now()-R.lastDpcProbe>5*60*1000){ R.lastDpcProbe=Date.now(); probeDpc(); }
}

function switchToRainViewer(){
  if(R.source==='rainviewer') return;
  console.warn('[RADAR] WMS Protezione Civile non raggiungibile → RainViewer (riserva)');
  R.source='rainviewer'; R.frames=[]; R.idx=-1; R.lastDpcProbe=Date.now();
  pruneLayers(new Set());
  refreshRainViewer();
}

// Prova una tile DPC (senza mostrarla): se carica, si torna alla Protezione Civile.
function probeDpc(){
  const ts=floor5(Date.now()-RADAR_SAFE_LAG_MS-DPC_STEP_MS);
  const img=new Image();
  img.onload=()=>{
    if(R.source!=='dpc'){
      R.source='dpc'; R.dpcFails=0; R.frames=[]; pruneLayers(new Set()); refreshRadarFrames();
    }
  };
  img.src=DPC_WMS+'?service=WMS&request=GetMap&layers=radar%3Avmi&styles=&format=image%2Fpng&transparent=true&version=1.1.1&tiled=true&width=256&height=256&srs=EPSG%3A3857&bbox=1643701.8562444304,4461476.4669491695,1721973.3732084509,4539747.98391319&time='+encodeURIComponent(dpcKey(ts));
}

function updateRadarLabel(){
  const rts=document.getElementById('rts');
  rts.className='';
  if(!R.frames.length){ rts.textContent='RADAR: caricamento…'; return; }
  const f=R.frames[R.idx]||R.frames[R.frames.length-1];
  const name=R.source==='dpc'?'RADAR DPC':'RADAR RAINVIEWER';
  const t=fmtHM(f.ts);
  const ageMin=Math.round((Date.now()-R.frames[R.frames.length-1].ts)/60000);
  if(!navigator.onLine){ rts.textContent=`${name}: ${t} · OFFLINE`; rts.className='err'; }
  else if(R.onLive){ rts.textContent=`${name}: ${t} · LIVE (${ageMin} min fa)`; if(ageMin>40) rts.className='warn'; }
  else rts.textContent=`${name}: ${t} (STORICO)`;
  document.getElementById('pblbl').textContent=R.onLive?'LIVE':t;
  document.getElementById('pb-live').classList.toggle('on',R.onLive);
  document.getElementById('lg-src').textContent = R.source==='dpc' ? 'Radar-DPC · Protezione Civile' : 'RainViewer (riserva: DPC non raggiungibile)';
  if(!navigator.onLine) setRadarStatus('err','RADAR OFFLINE');
  else if(R.source==='rainviewer') setRadarStatus('warn','RADAR · RISERVA');
  else if(R.dpcFails>0) setRadarStatus('err','RADAR DPC NON RAGGIUNGIBILE');
  else if(R.apiOk===false) setRadarStatus('warn','RADAR · ORARIO STIMATO');
  else if(ageMin>40) setRadarStatus('warn','RADAR IN RITARDO');
  else setRadarStatus('ok','RADAR');
}

function toggleLayer(k){
  vis[k]=!vis[k];
  document.getElementById({'radar':'btn-radar','ltn':'btn-ltn'}[k]).classList.toggle('on',vis[k]);
  if(k==='radar'){
    if(!vis.radar) stopAnim();
    showFrame(R.idx);
    document.getElementById('radar-legend').classList.toggle('hidden',!vis.radar);
  }
  if(k==='ltn') lMrks.forEach(m=>{ vis.ltn?m.addTo(map):map.removeLayer(m); });
}
function prevFrame(){stopAnim();showFrame(R.idx-1)}
function nextFrame(){stopAnim();showFrame(R.idx+1)}
function goLive(){stopAnim();showFrame(R.frames.length-1)}

function toggleAnim(){ animOn?stopAnim():startAnim(); }
async function startAnim(){
  if(!R.frames.length) return;
  if(!vis.radar) toggleLayer('radar');
  animOn=true; const my=++animToken;
  document.getElementById('btn-anim').textContent='⏹ Stop';
  let i=0;
  while(animOn && my===animToken){
    const t0=Date.now();
    await showFrame(i);
    if(!animOn || my!==animToken) break;
    const wait = (i===R.frames.length-1) ? 1400 : 550;
    await new Promise(r=>setTimeout(r, Math.max(0, wait-(Date.now()-t0))));
    i=(i+1)%R.frames.length;
  }
}
function stopAnim(){
  if(!animOn) return;
  animOn=false; animToken++;
  document.getElementById('btn-anim').textContent='▶ Animazione';
  if(R.shown) pruneLayers(new Set([R.shown]));
}

// Controllo unico: ogni 2,5 min se va tutto bene, ogni 30 s dopo un errore.
function radarTick(force){
  const okRecently = R.lastRefreshOk && R.lastRefreshOk>=R.lastRefreshTry-1000;
  const every = okRecently ? 150000 : 30000;
  if(force || Date.now()-R.lastRefreshTry>=every) refreshRadarFrames();
  else updateRadarLabel();
}
setInterval(()=>radarTick(false), 30000);
window.addEventListener('online', ()=>{ radarTick(true); fetchWx(); if(!bzConn) initBz(); });
window.addEventListener('offline', updateRadarLabel);

// ══════════════════════════════════════════════
// OPEN-METEO
// ══════════════════════════════════════════════
let wxData=null, icon2iData=null;

// best_match per Riposto risolve a un punto alcuni km al largo; ARPAE
// ICON-2I (2 km) è più vicino e coglie meglio i rovesci locali.
async function fetchIcon2i(){
  try{
    const d=await fetchJSON(`https://api.open-meteo.com/v1/forecast?latitude=${POS.lat}&longitude=${POS.lng}&hourly=precipitation,weathercode&forecast_days=3&timezone=Europe%2FRome&models=italia_meteo_arpae_icon_2i`, 10000);
    return (d && d.hourly && d.hourly.time) ? d.hourly : null;
  }catch(e){ return null; }
}

function renderCurrent(c){
  const tEl=document.getElementById('wx-t');
  tEl.innerHTML=`${Math.round(c.temperature_2m)}<span class="wunit">°C</span>`;
  tEl.className='wval '+(c.temperature_2m>28?'hot':c.temperature_2m<15?'cool':'');
  document.getElementById('wx-f').innerHTML=`${Math.round(c.apparent_temperature)}<span class="wunit">°C</span>`;
  document.getElementById('wx-w').innerHTML=`${Math.round(c.windspeed_10m)}<span class="wunit">km/h</span>`;
  document.getElementById('wx-g').innerHTML=`${Math.round(c.windgusts_10m||0)}<span class="wunit">km/h</span>`;
  document.getElementById('wx-wd').textContent=`${dText(c.winddirection_10m)} ${Math.round(c.winddirection_10m)}°`;
  document.getElementById('wx-cl').innerHTML=`${c.cloudcover}<span class="wunit">%</span>`;
  const uvEl=document.getElementById('wx-uv');
  const uv=c.uv_index!=null?Math.round(c.uv_index*10)/10:null;
  uvEl.textContent=uv!=null?uv:'--';
  uvEl.className='wval '+(uv>=8?'hot':uv>=6?'':'cool');
  document.getElementById('wind-needle').style.transform=`rotate(${c.winddirection_10m}deg)`;
  document.getElementById('wind-main').textContent=`Vento da ${dText(c.winddirection_10m)}`;
  document.getElementById('wind-sub').textContent=`${Math.round(c.windspeed_10m)} km/h · ${Math.round(c.winddirection_10m)}°`;
}
function renderSun(daily){
  if(!daily || !daily.sunrise || !daily.sunrise[0]) return;
  const sunrise=new Date(daily.sunrise[0]), sunset=new Date(daily.sunset[0]);
  document.getElementById('wx-sunrise').textContent=fmtHM(sunrise);
  document.getElementById('wx-sunset').textContent=fmtHM(sunset);
  const GH=40*60*1000, now=Date.now(), gh=document.getElementById('goldenhour');
  if(Math.abs(now-sunrise)<GH){ gh.style.display='block'; gh.textContent='📸 GOLDEN HOUR — luce dell\'alba'; }
  else if(Math.abs(now-sunset)<GH){ gh.style.display='block'; gh.textContent='📸 GOLDEN HOUR — luce del tramonto'; }
  else gh.style.display='none';
}

let wxBusy=false, wxRetryT=null;
async function fetchWx(){
  if(wxBusy) return; wxBusy=true; clearTimeout(wxRetryT);
  try{
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${POS.lat}&longitude=${POS.lng}`+
      `&current=temperature_2m,apparent_temperature,precipitation,cloudcover,windspeed_10m,winddirection_10m,windgusts_10m,weathercode,uv_index`+
      `&hourly=precipitation,precipitation_probability,cloudcover,windspeed_10m,winddirection_10m,weathercode`+
      `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,winddirection_10m_dominant,sunrise,sunset,uv_index_max`+
      `&forecast_days=3&timezone=Europe%2FRome&models=best_match`;
    const [wxResp, i2i] = await Promise.all([ fetchJSON(url, 12000), fetchIcon2i() ]);
    if(!wxResp || !wxResp.current) throw new Error('risposta incompleta');
    wxData = wxResp;
    if(i2i) icon2iData = i2i;
    const c=wxData.current;
    renderCurrent(c);

    // "Precipit. oggi" = pioggia già caduta da mezzanotte a adesso
    const nowTs = new Date();
    const hTimes = wxData.hourly.time, hPr = wxData.hourly.precipitation;
    const hProb = wxData.hourly.precipitation_probability, hCodes = wxData.hourly.weathercode;
    const todayDateStr = hTimes.length ? hTimes[0].slice(0,10) : null;
    const i2iMap = {};
    if(icon2iData && icon2iData.time){
      for(let k=0;k<icon2iData.time.length;k++) i2iMap[icon2iData.time[k]] = { pr: icon2iData.precipitation[k]||0, code: icon2iData.weathercode[k]||0 };
    }
    let todayTotalPr = 0, todayTotalPrI2i = 0, nextRainHour = null, nextRainProb = 0;
    for(let i=0; i<hTimes.length; i++){
      if(hTimes[i].slice(0,10) !== todayDateStr) break;
      const t = new Date(hTimes[i]);
      const x = i2iMap[hTimes[i]];
      const i2iRain = x ? (x.pr > 0.1 || x.code >= 61) : false;
      if(t <= nowTs){ todayTotalPr += hPr[i] || 0; if(x) todayTotalPrI2i += x.pr || 0; }
      else if(nextRainHour === null && (hPr[i] > 0.1 || hProb[i] > 30 || hCodes[i] >= 61 || i2iRain)){ nextRainHour = t; nextRainProb = hProb[i]; }
    }
    const todayTotal = Math.max(todayTotalPr, todayTotalPrI2i);
    const wxPrEl=document.getElementById('wx-pr');
    wxPrEl.innerHTML=`${todayTotal.toFixed(1)}<span class="wunit">mm</span>`;
    wxPrEl.title = icon2iData ? 'Combinato Open-Meteo best_match + ARPAE ICON-2I (2 km)' : 'Open-Meteo best_match';

    let bannerText = WMO[c.weathercode] || `Codice WMO ${c.weathercode}`;
    if(nextRainHour !== null && c.weathercode < 61) bannerText += ` · 🌧 Pioggia prevista dalle ${fmtHM(nextRainHour)} (${nextRainProb}%)`;
    document.getElementById('wxbanner').textContent = bannerText;

    renderSun(wxData.daily);
    updateAlert(c.weathercode,c.precipitation);
    updateFcDays(wxData,icon2iData);
    try{ localStorage.setItem('mr_wx_cache', JSON.stringify({ data:wxData, ts:Date.now(), label:CUR_LABEL })); }catch(_){}
  }catch(e){
    let usedCache=false;
    try{
      const raw=localStorage.getItem('mr_wx_cache');
      if(raw){
        const cached=JSON.parse(raw);
        wxData=cached.data;
        renderCurrent(wxData.current); renderSun(wxData.daily);
        updateAlert(wxData.current.weathercode,wxData.current.precipitation);
        updateFcDays(wxData,icon2iData);
        document.getElementById('wxbanner').textContent=`⚠ Dati non aggiornati (cache locale, ${Math.round((Date.now()-cached.ts)/60000)} min fa) · ${cached.label}`;
        usedCache=true;
      }
    }catch(_){}
    if(!usedCache) document.getElementById('wxbanner').textContent='Errore connessione Open-Meteo · nuovo tentativo tra poco';
    wxRetryT=setTimeout(fetchWx, 60000);
  }finally{ wxBusy=false; }
}

function updateAlert(code,pr){
  const box=document.getElementById('abox'), lvl=document.getElementById('alevel'), sub=document.getElementById('asub');
  box.className='abox';
  if(code>=95){ box.classList.add('rosso'); lvl.textContent='🔴 ROSSO — TEMPORALE IN CORSO'; sub.textContent='Attività elettrica possibile · Rientrare al coperto'; }
  else if(code>=80||pr>2){ box.classList.add('arancio'); lvl.textContent='🟠 ARANCIONE — ROVESCI INTENSI'; sub.textContent='Precipitazioni significative · Monitorare'; }
  else if(code>=61||pr>0.3){ box.classList.add('giallo'); lvl.textContent='🟡 GIALLO — PRECIPITAZIONI'; sub.textContent=(code>=71&&code<=77)?'Neve in atto o imminente':'Pioggia in atto o imminente'; }
  else { box.classList.add('verde'); lvl.textContent='🟢 VERDE — NESSUNA ALLERTA'; sub.textContent='Condizioni nella norma · '+CUR_LABEL; }
}

function wmoIcon(code){
  if(code>=95)return'⛈'; if(code>=85)return'🌨'; if(code>=80)return'🌧'; if(code>=71)return'❄';
  if(code>=61)return'🌦'; if(code>=51)return'🌂'; if(code>=45)return'🌫'; if(code>=3)return'☁';
  if(code>=2)return'⛅'; return'☀';
}

function updateFcDays(d,icon2i){
  const cont=document.getElementById('fcdays');
  if(!d.daily){cont.innerHTML='<div style="font-size:9.5px;color:var(--text-dim)">Dati non disponibili</div>';return;}
  const {time,weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,winddirection_10m_dominant}=d.daily;
  const i2iDaily = {};
  if(icon2i && icon2i.time){
    for(let k=0;k<icon2i.time.length;k++){
      const day = icon2i.time[k].slice(0,10);
      if(!i2iDaily[day]) i2iDaily[day] = { pr:0, maxCode:0 };
      i2iDaily[day].pr += icon2i.precipitation[k]||0;
      i2iDaily[day].maxCode = Math.max(i2iDaily[day].maxCode, icon2i.weathercode[k]||0);
    }
  }
  const days=['Domani','Dopodomani'];
  cont.innerHTML='';
  for(let i=1;i<=2;i++){
    if(!time[i])continue;
    const code=weathercode[i]||0;
    let prob=precipitation_probability_max[i]||0;
    const x = i2iDaily[time[i]];
    if(x && (x.pr > 0.5 || x.maxCode >= 61)) prob = Math.max(prob, 30);
    const card=document.createElement('div');
    card.className='fcday';
    card.innerHTML=`
      <div class="fcd-icon">${wmoIcon(code)}</div>
      <div>
        <div class="fcd-name">${days[i-1]}</div>
        <div class="fcd-desc">${WMO[code]||('Codice '+code)}</div>
        ${prob>10?`<div class="fcd-prob">💧 ${prob}% prob. pioggia${x&&x.pr>0.5?' · ~'+x.pr.toFixed(0)+' mm':''}</div>`:''}
      </div>
      <div class="fcd-wind">${dText(winddirection_10m_dominant[i]||0)}<br>${Math.round(windspeed_10m_max[i]||0)} km/h</div>
      <div class="fcd-temps">
        <div class="fcd-max">${Math.round(temperature_2m_max[i])}°</div>
        <div class="fcd-min">${Math.round(temperature_2m_min[i])}°</div>
      </div>`;
    cont.appendChild(card);
  }
}

// ══════════════════════════════════════════════
// ACCUMULI DI PIOGGIA · TUTTA LA SICILIA (per i funghi)
// Griglia di 0,1° (≈ 11 × 9 km) su tutta l'isola + Eolie, Egadi, Ustica.
// Per ogni cella: pioggia giorno per giorno degli ultimi 30 giorni e ora
// per ora delle ultime 24 h; vale il MASSIMO tra modello globale
// (best_match) e italiano a 2 km (ARPAE ICON-2I), così un rovescio visto
// da uno solo dei due non va perso. "Radar 24h" mostra invece la pioggia
// stimata dal radar della Protezione Civile (prodotto SRT24).
// ══════════════════════════════════════════════
const SICILIA_POLY = [
  [38.27,15.66],[38.19,15.57],[38.06,15.50],[37.93,15.36],[37.84,15.30],[37.73,15.22],[37.60,15.18],
  [37.50,15.10],[37.40,15.07],[37.30,15.15],[37.22,15.24],[37.07,15.30],[36.93,15.20],[36.82,15.11],
  [36.68,15.14],[36.69,14.99],[36.73,14.84],[36.78,14.55],[36.90,14.41],[37.05,14.24],[37.10,13.93],
  [37.18,13.71],[37.28,13.55],[37.38,13.30],[37.50,13.06],[37.58,12.83],[37.64,12.59],[37.80,12.42],
  [37.97,12.46],[38.03,12.50],[38.11,12.66],[38.19,12.74],[38.07,12.82],[38.04,12.95],[38.14,13.07],
  [38.21,13.28],[38.13,13.37],[38.10,13.54],[37.99,13.69],[38.04,14.02],[38.02,14.37],[38.15,14.73],
  [38.15,14.96],[38.20,15.15],[38.27,15.24],[38.23,15.38],[38.27,15.62]
];
const RAIN_ISLANDS = [
  {lat:38.48,lng:14.94},{lat:38.56,lng:14.84},{lat:38.40,lng:14.96},{lat:38.79,lng:15.21},
  {lat:38.71,lng:13.19},{lat:37.93,lng:12.33},{lat:37.97,lng:12.07}
];
const RAIN_STEP = 0.1;
const RAIN_ELEV_MIN = 250, RAIN_ELEV_MAX = 2250;
const RAIN_CACHE_KEY = 'mr_rain_sicilia_v1';
const RAIN_CACHE_MIN = 30;
// Scala colori: grigio (secco) → ocra, giallo → verdi (buona umidità) →
// verde-acqua, blu, viola (piogge molto abbondanti).
const RAIN_CLASSES = [
  {max:5,   col:'#4a4f5c', lbl:'<5'},
  {max:10,  col:'#8c7a4a', lbl:'5-10'},
  {max:20,  col:'#d4b04a', lbl:'10-20'},
  {max:35,  col:'#8fc14a', lbl:'20-35'},
  {max:60,  col:'#3fa34d', lbl:'35-60'},
  {max:100, col:'#1f8a8a', lbl:'60-100'},
  {max:150, col:'#2a6fd1', lbl:'100-150'},
  {max:Infinity, col:'#7b4fd6', lbl:'>150'}
];
const rainColor = mm => RAIN_CLASSES.find(c=>mm<c.max).col;

let rainGridLayer=null, rainGridCells=null, rainGridLoading=false, rainGridOn=false, rainGridTs=0;
let rainPeriod=14, srtLayer=null, rainFirstOpen=true;
const rainRenderer = L.canvas({ padding:0.3 });

function inPoly(lat,lng,poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const [yi,xi]=poly[i],[yj,xj]=poly[j];
    if(((yi>lat)!==(yj>lat)) && (lng < (xj-xi)*(lat-yi)/(yj-yi)+xi)) inside=!inside;
  }
  return inside;
}
function buildRainPoints(){
  const pts=[];
  for(let i=0; 36.65+i*RAIN_STEP<=38.32; i++){
    for(let j=0; 12.35+j*RAIN_STEP<=15.70; j++){
      const la=+(36.65+i*RAIN_STEP).toFixed(2), lo=+(12.35+j*RAIN_STEP).toFixed(2);
      if(inPoly(la,lo,SICILIA_POLY)) pts.push({lat:la,lng:lo});
    }
  }
  RAIN_ISLANDS.forEach(p=>pts.push({lat:p.lat,lng:p.lng}));
  return pts;
}

function rainUrl(pts){
  return `https://api.open-meteo.com/v1/forecast`
    +`?latitude=${pts.map(p=>p.lat).join(',')}&longitude=${pts.map(p=>p.lng).join(',')}`
    +`&daily=precipitation_sum,temperature_2m_mean&hourly=precipitation`
    +`&past_days=30&forecast_days=1&past_hours=24&forecast_hours=1`
    +`&timezone=Europe%2FRome&timeformat=unixtime&models=best_match,italia_meteo_arpae_icon_2i`;
}
async function fetchRainChunk(pts){
  let lastErr;
  for(let attempt=0; attempt<3; attempt++){
    try{ const d=await fetchJSON(rainUrl(pts), 25000); return Array.isArray(d)?d:[d]; }
    catch(e){ lastErr=e; await new Promise(r=>setTimeout(r,1500*(attempt+1))); }
  }
  throw lastErr;
}

// Riduce la risposta di un punto ai numeri che servono
function summarizeCell(p, r){
  const nowS=Date.now()/1000;
  const dd=r.daily||{}, hh=r.hourly||{};
  const dT=dd.time||[];
  const pB=dd.precipitation_sum_best_match||[], pI=dd.precipitation_sum_italia_meteo_arpae_icon_2i||[];
  const tB=dd.temperature_2m_mean_best_match||[], tI=dd.temperature_2m_mean_italia_meteo_arpae_icon_2i||[];
  const hT=hh.time||[], hB=hh.precipitation_best_match||[], hI=hh.precipitation_italia_meteo_arpae_icon_2i||[];
  const todayIdx=dT.length-1;   // forecast_days=1 → l'ultimo giorno è oggi
  const todayStart=dT[todayIdx]||0;
  let h24B=0,h24I=0,todB=0,todI=0;
  for(let k=0;k<hT.length;k++){
    if(hT[k]>nowS) continue;    // solo ore già trascorse
    h24B+=hB[k]||0; h24I+=hI[k]||0;
    if(hT[k]>todayStart){ todB+=hB[k]||0; todI+=hI[k]||0; }
  }
  // days[0]=oggi (finora), days[1]=ieri, … fino a 30 giorni fa
  const days=[+Math.max(todB,todI).toFixed(1)];
  for(let k=todayIdx-1;k>=0;k--) days.push(+Math.max(pB[k]||0,pI[k]||0).toFixed(1));
  const temps=[];
  for(let k=todayIdx;k>=Math.max(0,todayIdx-6);k--){ const t=(tB[k]!=null?tB[k]:tI[k]); if(t!=null) temps.push(t); }
  return {
    lat:p.lat, lng:p.lng, elev:r.elevation!=null?r.elevation:null,
    h24:+Math.max(h24B,h24I).toFixed(1), days,
    t7: temps.length ? +(temps.reduce((a,b)=>a+b,0)/temps.length).toFixed(1) : null
  };
}
function cellAccum(c, period){
  if(period===1) return c.h24;
  let s=0; for(let k=0;k<Math.min(period,c.days.length);k++) s+=c.days[k];
  return s;
}
function cellLastSignif(c){
  for(let k=0;k<c.days.length;k++) if(c.days[k]>=10) return k;
  return null;
}

async function loadRainGrid(force){
  if(rainGridLoading) return;
  const status=document.getElementById('fgl-status');
  if(!force){
    try{
      const c=JSON.parse(localStorage.getItem(RAIN_CACHE_KEY)||'null');
      if(c && Date.now()-c.ts < RAIN_CACHE_MIN*60000 && c.cells && c.cells.length){
        rainGridCells=c.cells; rainGridTs=c.ts; renderRainGrid(); return;
      }
    }catch(_){}
  }
  rainGridLoading=true;
  const pts=buildRainPoints(), CHUNK=90, chunks=[];
  for(let i=0;i<pts.length;i+=CHUNK) chunks.push(pts.slice(i,i+CHUNK));
  let done=0, failed=0;
  const cells=[];
  status.textContent=`Caricamento accumuli Sicilia… 0/${chunks.length}`;
  // in sequenza, per restare nei limiti gratuiti di Open-Meteo
  for(const ch of chunks){
    try{ const res=await fetchRainChunk(ch); ch.forEach((p,i)=>{ if(res[i]) cells.push(summarizeCell(p,res[i])); }); }
    catch(e){ failed++; console.warn('[Accumuli]',e); }
    done++;
    status.textContent=`Caricamento accumuli Sicilia… ${done}/${chunks.length}`;
    if(cells.length){ rainGridCells=cells.slice(); renderRainGrid(); }
  }
  rainGridLoading=false;
  if(cells.length){
    rainGridCells=cells; rainGridTs=Date.now();
    try{ localStorage.setItem(RAIN_CACHE_KEY, JSON.stringify({ts:rainGridTs, cells})); }catch(_){}
  }
  renderRainGrid();
  if(failed) status.innerHTML=`⚠ ${failed} zona/e non caricate (Open-Meteo non risponde). <a href="#" onclick="loadRainGrid(true);return false">Riprova</a>`;
}

function renderRainScale(){
  const box=document.getElementById('fgl-scale');
  box.innerHTML = rainPeriod==='radar'
    ? `<div class="fgl-bar"></div><div class="fgl-barlbl"><span>poca</span><span>molta pioggia</span></div>`
    : '<div class="fgl-row">'+RAIN_CLASSES.map(c=>`<div class="fgl-item"><div class="fgl-sw" style="background:${c.col}"></div><span>${c.lbl}</span></div>`).join('')+'<span style="font-size:9px;color:var(--text-dim)">mm</span></div>';
}

function renderRainGrid(){
  if(rainGridLayer){ map.removeLayer(rainGridLayer); rainGridLayer=null; }
  renderRainScale();
  const opt=document.getElementById('fgl-opt');
  if(rainPeriod==='radar'){ opt.style.display='none'; return; }
  opt.style.display='';
  const perLbl = rainPeriod===1 ? 'ultime 24 ore' : `ultimi ${rainPeriod} giorni (oggi incluso)`;
  document.getElementById('fgl-title').textContent=`Accumulo pioggia · Sicilia · ${rainPeriod===1?'24 ore':rainPeriod+' giorni'}`;
  document.getElementById('fgl-note').textContent=`Dato grezzo da modelli (Open-Meteo best_match + ARPAE ICON-2I, il valore più alto dei due), ${perLbl}. Non è una previsione di crescita funghi: tocca una cella per i dettagli · stima indicativa, non garanzia.`;
  if(!rainGridCells || !rainGridOn) return;
  const onlyBosco=document.getElementById('fgl-bosco').checked;
  const half=RAIN_STEP/2;
  rainGridLayer=L.layerGroup();
  let shown=0;
  rainGridCells.forEach(c=>{
    if(onlyBosco && (c.elev==null || c.elev<RAIN_ELEV_MIN || c.elev>RAIN_ELEV_MAX)) return;
    const mm=cellAccum(c,rainPeriod);
    const rect=L.rectangle([[c.lat-half,c.lng-half],[c.lat+half,c.lng+half]],
      {renderer:rainRenderer, color:'#04070e', weight:.4, opacity:.5, fillColor:rainColor(mm), fillOpacity:.62});
    rect.on('click',()=>{
      const ls=cellLastSignif(c), a=p=>cellAccum(c,p).toFixed(0);
      L.popup().setLatLng([c.lat,c.lng]).setContent(
        `<b>${mm.toFixed(0)} mm</b> · ${perLbl}<br>`+
        `Quota cella ≈ ${c.elev!=null?Math.round(c.elev)+' m':'n/d'} · ${c.lat.toFixed(2)}°N ${c.lng.toFixed(2)}°E<br>`+
        `24h ${a(1)} · 3gg ${a(3)} · 7gg ${a(7)} · 14gg ${a(14)} · 30gg ${a(30)} mm<br>`+
        `Ultima pioggia ≥10 mm/giorno: ${ls===null?'oltre 30 gg fa':(ls===0?'oggi':ls+' gg fa')}<br>`+
        (c.t7!=null?`Temp. media 7 gg: ${c.t7}°C`:'')
      ).openOn(map);
    });
    rainGridLayer.addLayer(rect); shown++;
  });
  rainGridLayer.addTo(map);
  if(!rainGridLoading && rainGridTs) document.getElementById('fgl-status').textContent=`${shown} celle · aggiornato alle ${fmtHM(rainGridTs)}`;
}

// Radar DPC SRT24 (cumulata 24 h), dato orario: si chiede sempre un'ora di
// almeno 70 minuti fa, così l'immagine è sicuramente pronta.
async function showSrt24(){
  if(rainGridLayer){ map.removeLayer(rainGridLayer); rainGridLayer=null; }
  const hour=3600*1000;
  const apiT=await dpcLastTime('SRT1');
  let t=Math.floor((Date.now()-70*60000)/hour)*hour;
  if(apiT) t=Math.min(t, Math.floor(apiT/hour)*hour);
  if(srtLayer){ map.removeLayer(srtLayer); srtLayer=null; }
  if(rainPeriod!=='radar' || !rainGridOn) return;
  srtLayer=L.tileLayer.wms(DPC_WMS,{layers:'radar:srt24',format:'image/png',transparent:true,version:'1.1.1',tiled:true,time:dpcKey(t),opacity:.8,zIndex:11,maxZoom:19});
  let ok=0,err=0;
  srtLayer.on('tileload',()=>ok++); srtLayer.on('tileerror',()=>err++);
  srtLayer.once('load',()=>{ if(ok===0&&err>0) document.getElementById('fgl-status').textContent='⚠ Radar Protezione Civile non raggiungibile in questo momento.'; });
  srtLayer.addTo(map);
  document.getElementById('fgl-title').textContent='Pioggia stimata dal radar · ultime 24 ore';
  document.getElementById('fgl-note').textContent=`Radar-DPC (Protezione Civile), cumulata 24 h fino alle ${fmtHM(t)}. È una misura (non un modello): coglie bene i temporali locali ma può sottostimare in montagna, dietro i rilievi. Colori della scala DPC.`;
  document.getElementById('fgl-status').textContent='';
}

function setRainPeriod(p){
  rainPeriod = p==='radar' ? 'radar' : +p;
  document.querySelectorAll('#fgl-periods button').forEach(b=>b.classList.toggle('on', b.dataset.p===String(p)));
  map.closePopup();
  if(rainPeriod==='radar'){ renderRainGrid(); showSrt24(); }
  else { if(srtLayer){ map.removeLayer(srtLayer); srtLayer=null; } renderRainGrid(); }
}
document.querySelectorAll('#fgl-periods button').forEach(b=>b.addEventListener('click',()=>setRainPeriod(b.dataset.p)));

function toggleFunghiGrid(force){
  rainGridOn = (typeof force==='boolean') ? force : !rainGridOn;
  document.getElementById('btn-funghi-map').classList.toggle('on', rainGridOn);
  document.getElementById('funghi-grid-legend').classList.toggle('hidden', !rainGridOn);
  if(rainGridOn){
    if(rainFirstOpen){ rainFirstOpen=false; map.fitBounds([[36.6,12.3],[38.35,15.7]],{padding:[10,10]}); }
    if(rainPeriod==='radar'){ renderRainGrid(); showSrt24(); }
    else if(rainGridCells && Date.now()-rainGridTs < RAIN_CACHE_MIN*60000) renderRainGrid();
    else { renderRainGrid(); loadRainGrid(); }
  } else {
    if(rainGridLayer){ map.removeLayer(rainGridLayer); rainGridLayer=null; }
    if(srtLayer){ map.removeLayer(srtLayer); srtLayer=null; }
    map.closePopup();
  }
}
// Il link nella sidebar ora funziona anche su telefono (apre la scheda Mappa)
function openRainMap(){
  const mob=isMobileLayout();
  if(mob) switchTab('mappa');
  setTimeout(()=>{ if(!rainGridOn) toggleFunghiGrid(true); }, mob?120:0);
}
setInterval(() => { if(rainGridOn && rainPeriod!=='radar') loadRainGrid(true); }, RAIN_CACHE_MIN*60*1000);

// ══════════════════════════════════════════════
// CONDIZIONI FUNGHI · BOSCHI DI SICILIA
// Etna (stessi punti di Etna Trails) + principali boschi montani. La quota
// mostrata è quella del punto griglia del modello, non quella esatta.
// ══════════════════════════════════════════════
const FUNGHI_VERSANTI = [
  { gruppo:'Etna', nome:'Est · Zafferana', lat:37.693, lng:15.112, bosco:'Castagno · Quercia' },
  { gruppo:'Etna', nome:'Nord-Est · Bosco di Malabotta', lat:37.92, lng:15.08, bosco:'Castagno' },
  { gruppo:'Etna', nome:'Nord · Piano Provenzana', lat:37.778, lng:15.047, bosco:'Pino laricio' },
  { gruppo:'Etna', nome:'Sud · Rifugio Sapienza', lat:37.6963, lng:14.9996, bosco:'Margine pineta (quota alta, bosco rado)' },
  { gruppo:'Sicilia', nome:'Nebrodi · Floresta', lat:37.99, lng:14.91, bosco:'Faggio · Cerro' },
  { gruppo:'Sicilia', nome:'Madonie · Piano Battaglia', lat:37.875, lng:14.03, bosco:'Faggio · Leccio' },
  { gruppo:'Sicilia', nome:'Peloritani · Colle San Rizzo', lat:38.21, lng:15.48, bosco:'Pino · Castagno' },
  { gruppo:'Sicilia', nome:'Bosco della Ficuzza', lat:37.89, lng:13.38, bosco:'Roverella · Leccio' }
];
// Soglie adattate da fonti divulgative europee, non misurate in Sicilia.
const FUNGHI_SPECIE = [
  { nome:'Porcino estatino (retina)', latNome:'Boletus reticulatus', icona:'🍄', qmin:400, qmax:1000, mesi:[5,6,7,8,9],
    nota:'Il primo a uscire, con le prime piogge calde di tarda primavera/estate. Teme il freddo.' },
  { nome:'Porcino nero', latNome:'Boletus aereus', icona:'🍄', qmin:600, qmax:1000, mesi:[7,8,9,10],
    nota:'Il più resistente a caldo e siccità, ama il caldo intenso di piena estate.' },
  { nome:'Ovulo buono', latNome:'Amanita caesarea', icona:'🟠', qmin:400, qmax:1000, mesi:[7,8,9,10,11],
    nota:'Cerca radure soleggiate, non il sottobosco fitto.' },
  { nome:'Porcino comune', latNome:'Boletus edulis', icona:'🍄', qmin:1000, qmax:2100, mesi:[9,10,11],
    nota:'Il più tardivo, zona faggio/pino laricio: ama il fresco in quota.' }
];
const FUNGHI_BADGE_LABEL = { buone:'🟢 Condizioni buone', monitorare:'🟡 Da monitorare', sfavorevoli:'🔴 Troppo secco', fuoristagione:'⚪ Fuori stagione' };

function classificaFungo(specie, mese, cond){
  if(!specie.mesi.includes(mese)) return 'fuoristagione';
  if(cond.accum14 < 15) return 'sfavorevoli';
  if(cond.giorni !== null && cond.giorni < 5) return 'monitorare';
  if(cond.giorni !== null && cond.giorni >= 5 && cond.giorni <= 18 && cond.accum14 >= 25) return 'buone';
  return 'monitorare';
}

// Una sola richiesta per tutti i boschi (prima: una per versante)
async function loadFunghi(){
  const list = document.getElementById('funghi-list');
  try{
    const d = await fetchJSON(rainUrl(FUNGHI_VERSANTI), 15000);
    const arr = Array.isArray(d)?d:[d];
    const mese = new Date().getMonth() + 1;
    list.innerHTML = '';
    let lastGroup='';
    FUNGHI_VERSANTI.forEach((v, vi) => {
      const cell = arr[vi] ? summarizeCell(v, arr[vi]) : null;
      if(v.gruppo!==lastGroup){
        lastGroup=v.gruppo;
        const g=document.createElement('div'); g.className='fng-group';
        g.textContent = v.gruppo==='Etna' ? '🌋 Versanti Etna' : '⛰ Monti di Sicilia';
        list.appendChild(g);
      }
      const quota = cell && cell.elev!=null ? Math.round(cell.elev) : null;
      const cond = cell ? { accum14: cellAccum(cell,14), giorni: cellLastSignif(cell) } : null;
      const specie = quota==null ? FUNGHI_SPECIE : FUNGHI_SPECIE.filter(s => quota >= s.qmin - 150 && quota <= s.qmax + 150);
      let body = '';
      if(!cond) body = `<div class="fng-card-note">⚠️ Dati non disponibili per questo bosco.</div>`;
      else {
        body = `<div class="fng-card-detail">💧 7gg ${cellAccum(cell,7).toFixed(0)} · 14gg ${cond.accum14.toFixed(0)} · 30gg ${cellAccum(cell,30).toFixed(0)} mm · ${cond.giorni!==null ? 'ultima pioggia ≥10mm '+(cond.giorni===0?'oggi':cond.giorni+'g fa') : 'nessuna pioggia ≥10mm in 30gg'}${cell.t7!=null?' · 🌡 media 7gg '+cell.t7+'°C':''}</div>`;
        if(!specie.length) body += `<div class="fng-card-note">Nessuna delle specie in elenco a questa quota.</div>`;
        specie.forEach(s => {
          const stato = classificaFungo(s, mese, cond);
          body += `
            <div class="fng-card ${stato==='fuoristagione'?'fuoristagione':''}">
              <div class="fng-card-row">
                <div><div class="fng-card-name">${s.icona} ${s.nome}</div><div class="fng-card-lat">${s.latNome}</div></div>
                <span class="fng-badge ${stato}">${FUNGHI_BADGE_LABEL[stato]}</span>
              </div>
              <div class="fng-card-note">${s.nota}</div>
            </div>`;
        });
      }
      const vsnt = document.createElement('div');
      vsnt.className = 'fng-vsnt' + (vi === 0 ? ' open' : '');
      vsnt.innerHTML = `
        <button class="fng-vsnt-hdr" aria-expanded="${vi===0}">
          <div><div class="fng-vsnt-name">${v.nome}</div><div class="fng-vsnt-sub">${quota!=null?'≈'+quota+' m · ':''}${v.bosco}</div></div>
          <span class="fng-vsnt-chev">▶</span>
        </button>
        <div class="fng-vsnt-body">${body}</div>`;
      vsnt.querySelector('button').addEventListener('click', e => {
        vsnt.classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', vsnt.classList.contains('open'));
      });
      list.appendChild(vsnt);
    });
    document.getElementById('funghi-updated').innerHTML =
      `Aggiornato: ${fmtHM(Date.now())} · Open-Meteo (best_match + <a href="https://open-meteo.com/en/docs/italia-meteo-arpae-api" target="_blank" rel="noopener">ARPAE ICON-2I</a>)`;
  }catch(e){
    console.warn('[Funghi]', e);
    list.innerHTML = `<div class="fng-error">⚠️ Dati non disponibili. <a href="#" onclick="loadFunghi();return false">Riprova</a></div>`;
  }
}
setInterval(loadFunghi, 30*60*1000);

// ══════════════════════════════════════════════
// FULMINI — Blitzortung (dati reali)
// ⚠ Verificato il 10/11/2026: gli indirizzi ":3000" non rispondono più e
//   il server non manda più JSON in chiaro. Protocollo attuale: connessione
//   a wss://wsN.blitzortung.org, messaggio {"a":111}, poi un flusso
//   mondiale compresso (LZW). Per questo la vecchia app non mostrava mai
//   fulmini veri e finiva in "DEMO". La DEMO (fulmini inventati) è stata
//   tolta: in un'app meteo un fulmine finto vicino a Riposto può ingannare.
// ══════════════════════════════════════════════
let lMrks=[], lLog=[], lStrikes=[], bzConn=false, bzWs=null, bzLastMsg=0, bzRetryT=null, bzEpIdx=0;
const BZ_EPS=['wss://ws1.blitzortung.org','wss://ws8.blitzortung.org','wss://ws2.blitzortung.org','wss://ws3.blitzortung.org'];

function bzDecode(s){
  const dict={}, data=Array.from(s);
  let cur=data[0], old=cur, out=[cur], code=256, phrase;
  for(let i=1;i<data.length;i++){
    const cc=data[i].charCodeAt(0);
    phrase = cc<256 ? data[i] : (dict[cc] ? dict[cc] : old+cur);
    out.push(phrase); cur=phrase.charAt(0); dict[code++]=old+cur; old=phrase;
  }
  return out.join('');
}
function setBzStatus(state){
  const dot=document.getElementById('bz-dot'), lbl=document.getElementById('bz-lbl');
  if(state==='live'){ dot.style.background='var(--cyan)'; dot.style.animation=''; lbl.textContent='BLITZORTUNG LIVE'; }
  else if(state==='conn'){ dot.style.background='var(--yellow)'; dot.style.animation='none'; lbl.textContent='FULMINI: CONNESSIONE…'; }
  else { dot.style.background='#ff8844'; dot.style.animation='none'; lbl.textContent='FULMINI NON DISPONIBILI'; }
}
function initBz(){
  if(bzWs && (bzWs.readyState===0 || bzWs.readyState===1)) return;
  clearTimeout(bzRetryT);
  if(!bzConn) setBzStatus('conn');
  const ep=BZ_EPS[bzEpIdx % BZ_EPS.length];
  try{
    const ws=new WebSocket(ep); bzWs=ws;
    let opened=false;
    const tout=setTimeout(()=>{ if(!opened) ws.close(); },7000);
    ws.onopen=()=>{ opened=true; clearTimeout(tout); ws.send('{"a":111}'); };
    ws.onmessage=ev=>{
      bzLastMsg=Date.now();
      if(!bzConn){ bzConn=true; setBzStatus('live'); renderLog(); }
      try{
        const j=JSON.parse(bzDecode(String(ev.data)));
        if(j.lat!==undefined&&j.lon!==undefined) onStrike(j.lat,j.lon,j.time?Math.round(j.time/1e6):Date.now());
      }catch(_){}
    };
    ws.onerror=()=>{ clearTimeout(tout); try{ws.close()}catch(_){} };
    ws.onclose=()=>{
      clearTimeout(tout);
      const wasConn=bzConn;
      bzConn=false; bzWs=null; bzEpIdx++;
      const fullCycle = !wasConn && bzEpIdx % BZ_EPS.length === 0;
      if(fullCycle || wasConn){ setBzStatus(fullCycle?'off':'conn'); renderLog(); }
      bzRetryT=setTimeout(initBz, fullCycle ? 30000 : 2000);
    };
  }catch(_){ bzEpIdx++; bzRetryT=setTimeout(initBz, 5000); }
}
// Il flusso è mondiale: 2 minuti senza messaggi = connessione morta → si riconnette.
setInterval(()=>{
  if(bzConn && Date.now()-bzLastMsg>120000 && bzWs){ try{bzWs.close()}catch(_){} }
  pruneStrikes(); renderCount();
}, 30000);

function pruneStrikes(){ const lim=Date.now()-10*60*1000; lStrikes=lStrikes.filter(t=>t>=lim); }

function onStrike(lat,lng,tMs){
  const d=haversine(POS.lat,POS.lng,lat,lng);
  if(d>160) return;
  const inR=d<=R_KM;
  if(inR){
    lStrikes.push(tMs);
    const tStr=new Date(tMs).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Europe/Rome'});
    document.getElementById('l-last').textContent=tStr;
    lLog.unshift({d:Math.round(d),dir:dText(bearing(POS.lat,POS.lng,lat,lng)),t:tStr});
    if(lLog.length>5) lLog.pop();
    renderLog();
  }
  if(d<=110&&vis.ltn) addLMrk(lat,lng,inR);
  pruneStrikes(); renderCount();
}
function addLMrk(lat,lng,near){
  const sz=near?16:11;
  const cl=near?'#ffffff':'rgba(0,212,255,0.55)';
  const glow=near?'#00d4ff':'rgba(0,212,255,0.3)';
  const ic=L.divIcon({className:'',
    html:`<span class="lmk ${near?'near':''}" style="font-size:${sz}px;color:${cl};filter:drop-shadow(0 0 4px ${glow})">⚡</span>`,
    iconSize:[sz,sz],iconAnchor:[sz/2,sz/2]});
  const m=L.marker([lat,lng],{icon:ic,zIndexOffset:900,interactive:false}).addTo(map);
  lMrks.push(m);
  setTimeout(()=>{ if(map.hasLayer(m))map.removeLayer(m); const i=lMrks.indexOf(m); if(i>-1)lMrks.splice(i,1); },near?6500:4500);
}
function renderCount(){
  const n=lStrikes.length, el=document.getElementById('l-count');
  el.textContent=n;
  document.getElementById('l-bar').style.width=Math.min(100,(n/20)*100)+'%';
  if(n===0){el.style.color='var(--cyan)';el.style.textShadow='0 0 18px rgba(0,212,255,.3)';}
  else if(n<6){el.style.color='var(--cyan)';el.style.textShadow='0 0 22px rgba(0,212,255,.5)';}
  else if(n<15){el.style.color='var(--amber)';el.style.textShadow='0 0 22px rgba(200,129,58,.5)';}
  else{el.style.color='var(--red)';el.style.textShadow='0 0 22px rgba(255,59,59,.6)';}
}
function renderLog(){
  const cont=document.getElementById('llog');
  const warn=(!bzConn && bzEpIdx>=BZ_EPS.length)?'<div class="lwarn">⚠ Rete fulmini non raggiungibile · nuovo tentativo automatico</div>':'';
  if(!lLog.length){
    cont.innerHTML=warn+`<div class="lnote">${bzConn?'Nessun fulmine rilevato nel raggio':'In attesa dei dati Blitzortung…'}</div>`;
    return;
  }
  cont.innerHTML=warn+lLog.map(s=>`
    <div class="litem"><span>⚡ <b style="color:var(--text)">${s.d} km</b> ${s.dir}</span><span class="ltime">${s.t}</span></div>`).join('');
}

// ── GEO UTILS
function haversine(la1,lo1,la2,lo2){
  const Rr=6371,dL=(la2-la1)*Math.PI/180,dO=(lo2-lo1)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dO/2)**2;
  return Rr*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function bearing(la1,lo1,la2,lo2){
  const dO=(lo2-lo1)*Math.PI/180;
  const y=Math.sin(dO)*Math.cos(la2*Math.PI/180);
  const x=Math.cos(la1*Math.PI/180)*Math.sin(la2*Math.PI/180)-Math.sin(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.cos(dO);
  return(Math.atan2(y,x)*180/Math.PI+360)%360;
}

// ── AUTO-REFRESH / RESIZE / VISIBILITÀ
setInterval(fetchWx,10*60*1000);
let resizeTmr=null;
function onViewportChange(){ clearTimeout(resizeTmr); resizeTmr=setTimeout(()=>map.invalidateSize(), 250); }
window.addEventListener('resize', onViewportChange);
window.addEventListener('orientationchange', onViewportChange);

let lastActiveTs=Date.now();
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState==='visible'){
    const away=Date.now()-lastActiveTs;
    map.invalidateSize();
    radarTick(away>60*1000);
    if(away>3*60*1000) fetchWx();
    if(!bzConn) initBz();
  } else lastActiveTs=Date.now();
});

// ── INIT: tutto parte in parallelo (prima un radar lento bloccava anche il meteo)
renderCount(); renderLog();
refreshRadarFrames();
fetchWx();
initBz();
loadFunghi();
setTimeout(requestGeolocation, 1000);
