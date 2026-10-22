/* M1.2 website update notifier. Does not read, alter or delete any business data. */
(() => {
  'use strict';
  if (!/^https?:$/.test(location.protocol)) return;
  const VERSION = 'M1.2';
  const bannerRoot = document.getElementById('version-update-root');
  if (!bannerRoot) return;
  let checking = false;
  let lastChecked = 0;
  let newerVersion = '';
  let dismissed = '';
  const CHECK_INTERVAL = 15 * 60 * 1000;

  function showUpdate(version) {
    if (!version || version === VERSION || version === dismissed) return;
    if (newerVersion === version && bannerRoot.firstChild) return;
    newerVersion = version;
    bannerRoot.replaceChildren();
    const notice = document.createElement('section');
    notice.className = 'version-update-notice';
    notice.setAttribute('role', 'status');
    const text = document.createElement('div');
    text.className = 'version-update-copy';
    const title = document.createElement('strong');
    title.textContent = '检测到工作台新版本';
    const detail = document.createElement('span');
    detail.textContent = '版本 ' + version + ' 已可用。请先保存当前表单，再刷新加载新版本；现有任务数据不会被主动清除。';
    text.append(title, detail);
    const buttons = document.createElement('div');
    buttons.className = 'version-update-actions';
    const refresh = document.createElement('button');
    refresh.type = 'button';
    refresh.textContent = '刷新更新';
    refresh.className = 'btn btn-primary btn-small';
    refresh.addEventListener('click', () => {
      if (window.confirm('刷新会丢弃尚未保存的表单内容。请确认已经保存当前编辑，再继续更新。')) {
        location.reload();
      }
    });
    const later = document.createElement('button');
    later.type = 'button';
    later.textContent = '稍后';
    later.className = 'btn btn-outline btn-small';
    later.addEventListener('click', () => { dismissed = version; bannerRoot.replaceChildren(); });
    buttons.append(refresh, later);
    notice.append(text, buttons);
    bannerRoot.append(notice);
  }

  async function checkVersion(force = false) {
    if (checking || (!force && Date.now() - lastChecked < 60000)) return;
    checking = true;
    lastChecked = Date.now();
    try {
      const response = await fetch('./version.json', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (!data || typeof data.version !== 'string' || !/^M\d+(?:\.\d+)*$/.test(data.version)) return;
      if (data.version !== VERSION) showUpdate(data.version);
    } catch (_) {
      // Offline-first: a missing network is not a reason to block work.
    } finally {
      checking = false;
    }
  }

  async function registerWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            checkVersion(true);
          }
        });
      });
      // Check even if registration was already present and no navigation occurred.
      reg.update().catch(() => {});
    } catch (_) { /* Supports ordinary online mode even if SW unavailable. */ }
  }

  function start() {
    registerWorker();
    checkVersion(true);
    window.addEventListener('focus', () => checkVersion());
    window.addEventListener('online', () => checkVersion(true));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkVersion();
    });
    setInterval(() => checkVersion(), CHECK_INTERVAL);
  }
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
})();
