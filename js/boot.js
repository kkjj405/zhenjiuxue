/* 针灸学 · 启动与路由派发 */
(function () {
  'use strict';
  var Z = window.ZJ, UI = window.ZJ_UI;
  if (!Z || !UI) return;
  var VER = window.ZJ_VERSION || { web: '1.0.0' };
  try {
    if (!Z.store.meta.firstOpen) Z.store.meta.firstOpen = Date.now();
    if (Z.store.meta.lastVersion && Z.store.meta.lastVersion !== VER.web) {
      setTimeout(function () { UI.toast('已更新到 v' + VER.web); }, 600);
    }
    Z.store.meta.lastVersion = VER.web;
    Z.save();
  } catch (e) { }
  UI.tabbar('home');
  function onHash() {
    var h = location.hash || '#/home';
    if (window.ZJ_PRACTICE && window.ZJ_PRACTICE.beforeRoute &&
      window.ZJ_PRACTICE.beforeRoute(h) === false) return;
    document.onkeydown = null;
    if (window.ZJ_CARDS) window.ZJ_CARDS.removeManageBar();
    UI.render();
  }
  window.addEventListener('hashchange', onHash);
  if (!location.hash) {
    try { history.replaceState(null, '', '#/home'); } catch (e) { location.hash = '#/home'; }
  }
  UI.render();
})();
