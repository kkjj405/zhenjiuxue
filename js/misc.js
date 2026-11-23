/* 针灸学 · 首页 / 收藏 / 搜索 / 打赏 / 我的 / 关于 */
(function () {
  'use strict';
  var Z = window.ZJ, UI = window.ZJ_UI;
  var esc = Z.esc, icon = UI.icon;
  var VER = window.ZJ_VERSION || { web: '1.0.0', app: '1.0.0' };

  /* ---------------- 首页 ---------------- */
  function renderHome(main) {
    UI.header({ title: '针灸学' });
    var st = Z.D.stats || {};
    var h = [];
    h.push('<div class="hero"><h1 class="serif">针灸学</h1>' +
      '<p>经络腧穴 · 针灸治疗 · 默写与选择题</p>' +
      '<div class="mini"><span><b>' + (st.points || 0) + '</b>腧穴</span>' +
      '<span><b>' + (st.diseases || 0) + '</b>病证</span>' +
      '<span><b>' + (st.units || 0) + '</b>治疗单元</span>' +
      '<span><b>' + (st.pairs || 0) + '</b>配穴对</span></div></div>');

    /* 两个大入口：经络腧穴 / 针灸治疗 */
    h.push('<div class="big-grid">' +
      '<a class="big" href="#/points"><div class="big-ic">' + icon('needle') + '</div>' +
      '<div class="big-t">经络腧穴</div><div class="big-s">15 节 · ' + (st.points || 0) + ' 穴<br>定位 / 解剖 / 主治 / 操作</div></a>' +
      '<a class="big" href="#/treat"><div class="big-ic">' + icon('book') + '</div>' +
      '<div class="big-t">针灸治疗</div><div class="big-s">6 节 · ' + (st.diseases || 0) + ' 证<br>治法 / 主穴 / 配穴</div></a>' +
      '</div>');

    var entries = [
      { href: '#/practice', ic: 'practice', t: '练习', s: '默写 / 选择题' },
      { href: '#/fav', ic: 'star', t: '收藏', s: '分组管理' },
      { href: '#/search', ic: 'search', t: '搜索', s: '腧穴 / 病证' },
      { href: '#/tip', ic: 'tip', t: '赞赏支持', s: '自愿 · 随意' }
    ];
    h.push('<div class="entry-grid">' + entries.map(function (e) {
      return '<a class="entry" href="' + e.href + '"><span class="e-ic">' + icon(e.ic) + '</span>' +
        '<span class="e-t">' + e.t + '</span><span class="e-s">' + e.s + '</span></a>';
    }).join('') + '</div>');

    var starN = Z.points.filter(function (p) { return p.star; }).length;
    h.push('<div class="card flat"><p class="small muted" style="margin:0">' +
      '内容基于《针灸学》（第六版）教材整理稿：经络腧穴各论 15 节 ' + (st.points || 0) +
      ' 个腧穴，针灸治疗各论 6 节 ' + (st.diseases || 0) + ' 个病证（含附病证 ' + (st.attach || 0) +
      '），共 ' + (st.units || 0) + ' 个治疗单元、' + (st.pairs || 0) + ' 条「X配…」配穴。' +
      '<br>穴名后带 <b>★</b> 者为教材标注的<b>临床常用穴</b>（共 ' + starN + ' 个）。仅供学习，不提供临床指导。' +
      '<br>如果觉得有用的话，可以给作者一点赞赏嘛，赞赏入口在「我的 → 赞赏支持」。</p></div>');
    main.innerHTML = h.join('');
  }

  /* ---------------- 收藏 ---------------- */
  function renderFav(main) {
    UI.header({
      title: '收藏', sub: Z.favList().length + ' 项',
      actions: [{
        icon: 'list', label: '新建分组', onClick: function () {
          UI.dialog({
            title: '新建收藏分组',
            html: '<input class="input" id="new-gname" placeholder="分组名称" style="width:100%">',
            buttons: [{ text: '取消', value: false }, { text: '创建', value: true, primary: true }]
          }).then(function (ok) {
            if (!ok) return;
            var inp = document.getElementById('new-gname');
            var name = ((inp && inp.value) || '').trim() || ('分组' + (Z.store.fav.groups.length + 1));
            Z.store.fav.groups.push({ id: 'g' + Date.now(), name: name });
            Z.save(true); renderFav(main); UI.toast('已创建「' + name + '」');
          });
        }
      }]
    });
    var h = [];
    if (!Z.favList().length) h.push(UI.emptyBox('还没有收藏', '在腧穴/病证卡片里点「收藏」即可；可自建分组'));
    else Z.store.fav.groups.forEach(function (g) {
      var ids = Z.favList(g.id);
      h.push('<div class="card"><div class="row between mb8"><b>' + esc(g.name) + '</b>' +
        '<span class="row" style="gap:6px"><span class="chip gray tiny">' + ids.length + ' 项</span>' +
        (Z.store.fav.groups.length > 1 && g.id !== 'g0' ? '<button class="btn xs danger" data-gdel="' + g.id + '">删组</button>' : '') +
        '</span></div>');
      if (!ids.length) h.push('<p class="tiny dim" style="margin:0">空分组</p>');
      ids.forEach(function (id) {
        var x = Z.byId[id]; if (!x) return;
        var isPt = !!x.location;
        h.push('<div class="fav-row"><a class="grow fav-nm" href="' + (isPt ? '#/point/' : '#/disease/') + id + '">' +
          esc(x.name) + '<span class="tiny dim"> ' + esc(isPt ? (x.meridianName || '') : (x.sectionName || '')) + '</span></a>' +
          '<button class="btn xs" data-gmv="' + id + '">移动</button>' +
          '<button class="btn xs danger" data-grm="' + id + '">删除</button></div>');
      });
      h.push('</div>');
    });
    main.innerHTML = h.join('');
    main.querySelectorAll('[data-grm]').forEach(function (b) {
      b.onclick = function () { Z.toggleFav(b.getAttribute('data-grm')); renderFav(main); UI.toast('已删除收藏'); };
    });
    main.querySelectorAll('[data-gmv]').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-gmv'), cur = Z.favGroup(id);
        var opts = Z.store.fav.groups.filter(function (g) { return g.id !== cur; });
        if (!opts.length) { UI.toast('只有一个分组'); return; }
        UI.dialog({
          title: '移动到分组',
          html: opts.map(function (g) { return '<button class="btn block" data-mvg="' + g.id + '" style="margin-bottom:8px">' + esc(g.name) + '</button>'; }).join(''),
          buttons: [{ text: '取消', value: false }]
        }).then(function () { });
        setTimeout(function () {
          document.querySelectorAll('[data-mvg]').forEach(function (mb) {
            mb.onclick = function () {
              Z.toggleFav(id); Z.toggleFav(id, mb.getAttribute('data-mvg'));
              UI.closeDialog(null); renderFav(main); UI.toast('已移动');
            };
          });
        }, 30);
      };
    });
    main.querySelectorAll('[data-gdel]').forEach(function (b) {
      b.onclick = function () {
        var gid = b.getAttribute('data-gdel');
        var g = Z.store.fav.groups.filter(function (x) { return x.id === gid; })[0];
        if (!g) return;
        UI.confirmDialog('删除分组', '「' + g.name + '」里的收藏会移到默认分组，确定删除？', '删除', '取消').then(function (ok) {
          if (!ok) return;
          Object.keys(Z.store.fav.items).forEach(function (id) { if (Z.store.fav.items[id] === gid) Z.store.fav.items[id] = 'g0'; });
          Z.store.fav.groups = Z.store.fav.groups.filter(function (x) { return x.id !== gid; });
          Z.save(true); renderFav(main);
        });
      };
    });
  }

  /* ---------------- 搜索（腧穴 + 病证） ---------------- */
  function renderSearch(main, p, q) {
    UI.header({ title: '搜索', back: true });
    var kw0 = (q && q.kw) || '';
    var h = ['<div class="searchbox mb10"><svg class="s-ico" viewBox="0 0 24 24">' +
      '<circle cx="11" cy="11" r="6.5" fill="none" stroke-width="1.9"/><path d="m16 16 4.5 4.5" stroke-width="1.9" stroke-linecap="round" fill="none"/></svg>' +
      '<input class="input" id="s-kw" placeholder="搜腧穴（穴名/编号/拼音）或病证名" value="' + esc(kw0) + '" autocomplete="off"></div>',
      '<div id="s-res"></div>'];
    main.innerHTML = h.join('');
    var inp = main.querySelector('#s-kw'), box = main.querySelector('#s-res');
    var timer = null, composing = false;
    function renderRes() {
      var kw = inp.value.trim();
      if (!kw) {
        box.innerHTML = '<div class="card flat"><p class="small muted" style="margin:0">' +
          '输入穴名（如 合谷）、编号（如 LU1 / GV14）、拼音（如 hegu）或病证名（如 头痛）。</p></div>';
        return;
      }
      var pts = Z.searchPoints(kw), dis = Z.searchDiseases(kw);
      if (!pts.length && !dis.length) { box.innerHTML = UI.emptyBox('没有找到「' + kw + '」', '试试更短的关键词'); return; }
      var out = [];
      if (pts.length) {
        out.push('<div class="tiny dim" style="margin:2px 4px 6px">腧穴 · ' + pts.length + ' 个</div><div class="card flat" style="padding:2px 0">' +
          pts.slice(0, 30).map(function (x) {
            return '<a class="fav-row" href="#/point/' + x.id + '"><span class="grow fav-nm">' + esc(x.name) +
              '<span class="tiny dim"> ' + esc(x.code || '') + ' · ' + esc(x.meridianName) + '</span></span><span class="at-go">打开 ›</span></a>';
          }).join('') + '</div>');
      }
      if (dis.length) {
        out.push('<div class="tiny dim" style="margin:12px 4px 6px">病证 · ' + dis.length + ' 个</div><div class="card flat" style="padding:2px 0">' +
          dis.map(function (x) {
            return '<a class="fav-row" href="#/disease/' + x.id + '"><span class="grow fav-nm">' +
              (x.kind === 'attach' ? '附：' : '') + esc(x.name) +
              '<span class="tiny dim"> ' + esc(x.sectionName) + '</span></span><span class="at-go">打开 ›</span></a>';
          }).join('') + '</div>');
      }
      box.innerHTML = out.join('');
    }
    inp.addEventListener('compositionstart', function () { composing = true; });
    inp.addEventListener('compositionend', function () { composing = false; renderRes(); });
    inp.oninput = function () { if (composing) return; clearTimeout(timer); timer = setTimeout(renderRes, 150); };
    inp.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); renderRes(); inp.blur(); } };
    renderRes();
  }

  /* ---------------- 打赏 ---------------- */
  function renderTip(main) {
    UI.header({ title: '赞赏支持', back: true });
    main.innerHTML = '<div class="card tip-card">' +
      '<p class="tip-t serif">制作不易，如果觉得有用的话，可以给作者一点赞赏嘛，多少都是可以的，' +
      '一块钱也是爱，当然没有打赏也是可以的，支持分享，支持白嫖，大家都是医学生，不必为难</p>' +
      '<div class="qr-wrap"><img src="qr.jpg" alt="赞赏码" class="qr-img"></div>' +
      '<p class="tiny dim center">微信 / 支付宝 扫码 · 完全自愿</p></div>';
  }

  /* ---------------- 我的 ---------------- */
  function renderMe(main) {
    UI.header({ title: '我的' });
    var h = ['<div class="card me-card"><div class="me-av">针</div><div class="grow">' +
      '<div class="me-nm">针灸学</div><div class="tiny dim">v' + esc(VER.web) + ' · ' +
      (Z.D.stats.points || 0) + ' 腧穴 · ' + (Z.D.stats.diseases || 0) + ' 病证</div></div></div>'];
    h.push('<div class="card list">' +
      '<a class="li" href="#/tip"><span class="li-ic">' + icon('tip') + '</span><span class="grow">' +
      '<span class="li-t">赞赏支持</span><span class="li-s">喜欢的话可以支持一下</span></span><span class="at-go">›</span></a>' +
      '<div class="li"><span class="li-ic">' + icon('refresh') + '</span><span class="grow">' +
      '<span class="li-t">检查更新</span><span class="li-s" id="upd-msg">点右侧按钮检查</span></span>' +
      '<button class="btn xs" id="upd-btn">检查</button></div></div>');
    h.push('<div class="card list">' +
      '<div class="li"><span class="li-ic">' + icon('note') + '</span><span class="grow">' +
      '<span class="li-t">备份与恢复</span><span class="li-s">导出/导入本机记录（笔记·收藏·隐藏·编辑·草稿）</span></span>' +
      '<button class="btn xs" id="bk-out">导出</button><button class="btn xs" id="bk-in">导入</button></div>' +
      '<div class="li"><span class="li-ic">' + icon('eyeoff') + '</span><span class="grow">' +
      '<span class="li-t">清空本机数据</span><span class="li-s">笔记 / 收藏 / 隐藏 / 编辑 / 草稿</span></span>' +
      '<button class="btn xs danger" id="clr">清空</button></div></div>');
    h.push('<div class="card list"><a class="li" href="#/about"><span class="li-ic">' + icon('list') + '</span>' +
      '<span class="grow"><span class="li-t">关于</span><span class="li-s">数据来源与免责声明</span></span><span class="at-go">›</span></a></div>');
    main.innerHTML = h.join('');
    var ub = main.querySelector('#upd-btn'); if (ub) ub.onclick = function () { doCheckUpdate(main); };
    var bo = main.querySelector('#bk-out'); if (bo) bo.onclick = doExport;
    var bi = main.querySelector('#bk-in'); if (bi) bi.onclick = function () { doImport(); };
    var cl = main.querySelector('#clr');
    if (cl) cl.onclick = function () {
      UI.confirmDialog('清空本机数据', '将删除笔记、收藏、隐藏、编辑与练习草稿，且不可恢复。确定？', '清空', '取消').then(function (ok) {
        if (!ok) return;
        localStorage.removeItem('zj.data.v1'); UI.toast('已清空，重新载入…');
        setTimeout(function () { location.reload(); }, 700);
      });
    };
  }

  function cmpVer(a, b) {
    var pa = String(a || '0').split('.'), pb = String(b || '0').split('.');
    for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
      var x = parseInt(pa[i] || 0, 10), y = parseInt(pb[i] || 0, 10);
      if (x !== y) return x > y ? 1 : -1;
    }
    return 0;
  }
  function doCheckUpdate(main) {
    var msg = main.querySelector('#upd-msg');
    function say(t) { if (msg) msg.innerHTML = t; }
    if (window.NativeBridge && window.NativeBridge.checkUpdate) {
      say('正在检查…');
      try { window.NativeBridge.checkUpdate(); } catch (e) { say('检查失败：' + e.message); }
      return;
    }
    say('正在检查…');
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        var remote = j.web || j.version || '';
        if (cmpVer(remote, VER.web) > 0) {
          say('发现新版本 v' + remote + '，正在更新…');
          if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.getRegistration().then(function (reg) {
              if (reg) reg.update();
              setTimeout(function () { location.reload(); }, 1200);
            });
          } else setTimeout(function () { location.reload(); }, 800);
        } else { say('已是最新版本（v' + VER.web + '）'); UI.toast('已是最新版本'); }
      })
      .catch(function (e) { say('检查失败：' + (e.message || '网络不可用') + '（不影响使用）'); });
  }
  window.__onUpdateResult = function (json) {
    var o = {}; try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { }
    var msg = document.querySelector('#upd-msg');
    var t = o.msg || (o.ok ? '已是最新版本' : '检查失败');
    if (msg) msg.textContent = t;
    UI.toast(t);
    if (o.updated) setTimeout(function () { try { window.NativeBridge.reload(); } catch (e) { location.reload(); } }, 900);
  };
  window.__onAutoUpdate = function (json) {
    var o = {}; try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { }
    if (o.updated) {
      UI.dialog({ title: '更新完成', text: '新版本资源已下载完成，重启后生效。',
        buttons: [{ text: '稍后', value: false }, { text: '立即重启', value: true, primary: true }] })
        .then(function (ok) { if (ok) { try { window.NativeBridge.reload(); } catch (e) { location.reload(); } } });
    }
  };

  function doExport() {
    var obj = { app: 'zjx', version: VER.app, ts: Date.now(), data: Z.store };
    var blob = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '针灸学备份_' + Z.nowText().replace(/[: ]/g, '-') + '.json';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
    UI.toast('已导出备份');
  }
  function doImport() {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var o = JSON.parse(fr.result); var data = o.data || o;
          if (!data || typeof data !== 'object' || !data.notes) throw new Error('格式不对');
          Object.keys(Z.store).forEach(function (k) { delete Z.store[k]; });
          Object.keys(data).forEach(function (k) { Z.store[k] = data[k]; });
          Z.save(true); UI.toast('导入成功，正在刷新…');
          setTimeout(function () { location.reload(); }, 800);
        } catch (e) { UI.dialog({ title: '导入失败', text: '文件不是本应用的备份，或已损坏。' }); }
      };
      fr.readAsText(f);
    };
    inp.click();
  }

  function renderAbout(main) {
    UI.header({ title: '关于', back: true });
    var st = Z.D.stats || {};
    main.innerHTML = '<div class="card">' +
      '<h3 class="serif" style="margin:0 0 8px">针灸学 · 学习卡片</h3>' +
      '<p class="small">本程序内容基于《针灸学》（第六版）教材整理稿（经络腧穴各论 + 针灸治疗各论）。仅供学习使用，不提供临床指导。</p>' +
      '<p class="small">穴名后带 <b>★</b> 者为教材标注的<b>临床常用穴</b>（共 ' +
      Z.points.filter(function (p) { return p.star; }).length + ' 个）。</p>' +
      '<p class="small muted">数据范围：经络腧穴各论 15 节 ' + (st.points || 0) + ' 穴；针灸治疗各论 6 节 ' +
      (st.diseases || 0) + ' 证（含附 ' + (st.attach || 0) + '），' + (st.units || 0) + ' 个治疗单元、' +
      (st.pairs || 0) + ' 条配穴关系。</p>' +
      '<p class="small muted">版本 v' + esc(VER.web) + ' · 记录仅保存在本机 · 支持离线使用</p></div>';
  }

  UI.VIEWS.home = renderHome;
  UI.VIEWS.fav = renderFav;
  UI.VIEWS.search = renderSearch;
  UI.VIEWS.tip = renderTip;
  UI.VIEWS.me = renderMe;
  UI.VIEWS.about = renderAbout;
})();
