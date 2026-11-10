// ── SERVICE WORKER ──────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      setInterval(() => reg.update(), 60 * 1000);
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) newSW.postMessage({ action: 'skipWaiting' });
        });
      });
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) { refreshing = true; window.location.reload(); }
      });
    } catch (err) { console.warn('[PWA] SW non registrato:', err); }
  });
}

// ── BANNER INSTALLAZIONE (non riappare per 7 giorni dopo la ✕) ──
let deferredPrompt = null;
const banner = document.getElementById('pwa-banner');
const PWA_DISMISS_KEY = 'mr_pwa_dismissed';
const pwaDismissedRecently = () => { try{ return Date.now() - (+localStorage.getItem(PWA_DISMISS_KEY)||0) < 7*24*3600*1000; }catch(_){ return false; } };
const dismissPwa = () => { banner.style.display='none'; try{ localStorage.setItem(PWA_DISMISS_KEY, Date.now()); }catch(_){} };

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  if(!pwaDismissedRecently()) setTimeout(() => { banner.style.display = 'flex'; }, 3000);
});
document.getElementById('pwa-install-btn').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  banner.style.display = 'none';
});
document.getElementById('pwa-dismiss-btn').addEventListener('click', dismissPwa);
window.addEventListener('appinstalled', () => { banner.style.display = 'none'; });

// iOS: istruzioni manuali
(function(){
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  if(isIOS && !isStandalone && !pwaDismissedRecently()){
    setTimeout(() => {
      banner.innerHTML = `<span>📲 <span style="color:#C8813A">Aggiungi alla Home:</span> tocca ⬆️ Condividi, poi "Aggiungi a Home"</span>
        <button id="pwa-dismiss-btn-ios" aria-label="Chiudi" style="background:none;border:1px solid rgba(200,129,58,0.3);color:#9bbad8;font-family:'Share Tech Mono',monospace;font-size:9.5px;padding:5px 8px;border-radius:2px;cursor:pointer">✕</button>`;
      banner.style.display = 'flex';
      document.getElementById('pwa-dismiss-btn-ios').addEventListener('click', dismissPwa);
    }, 3000);
  }
})();
