/* 针灸学 · 腧穴目录 / 治疗目录 / 卡片 / 笔记 / 收藏 / 编辑 / 隐藏 */
(function () {
  'use strict';
  var Z = window.ZJ, UI = window.ZJ_UI;
  var esc = Z.esc, icon = UI.icon;

  var st = { manage: false, sel: {}, kw: '' };

  function removeManageBar() { var b = document.getElementById('fbar'); if (b) b.remove(); }
  function toggleSel(id) { if (st.sel[id]) delete st.sel[id]; else st.sel[id] = 1; }
  function selCount() { return Object.keys(st.sel).length; }

  function paintManageBar(main) {
    if (!st.manage) { removeManageBar(); return; }
    var bar = document.getElementById('fbar');
    if (!bar) { bar = document.createElement('div'); bar.id = 'fbar'; document.getElementById('app').appendChild(bar); }
    var n = selCount(), hid = Z.hiddenCount();
    bar.innerHTML = '<button class="btn sm" data-mb="all">全选</button>' +
      '<button class="btn sm" data-mb="none">清空</button><span class="grow"></span>' +
      '<button class="btn sm danger" data-mb="hide"' + (n ? '' : ' disabled') + '>隐藏' + (n ? '(' + n + ')' : '') + '</button>' +
      (hid ? '<button class="btn sm" data-mb="unhide">取消隐藏</button>' : '');
    bar.querySelector('[data-mb="all"]').onclick = function () {
      (Z.points || []).forEach(function (p) { st.sel[p.id] = 1; });
      UI.render();
    };
    bar.querySelector('[data-mb="none"]').onclick = function () { st.sel = {}; UI.render(); };
    bar.querySelector('[data-mb="hide"]').onclick = function () {
      var ids = Object.keys(st.sel); if (!ids.length) return;
      ids.forEach(function (id) { Z.setHidden(id, true); });
      UI.toast('已隐藏 ' + ids.length + ' 项'); st.sel = {}; UI.render();
    };
    var uh = bar.querySelector('[data-mb="unhide"]');
    if (uh) uh.onclick = function () {
      var ids = Object.keys(st.sel).filter(function (id) { return Z.isHidden(id); });
      if (!ids.length) { UI.toast('勾选里没有已隐藏项'); return; }
      ids.forEach(function (id) { Z.setHidden(id, false); });
      UI.toast('已取消隐藏 ' + ids.length + ' 项'); st.sel = {}; UI.render();
    };
  }

  /* ================= 腧穴目录 ================= */
  function pointRow(p, manage) {
    var hid = Z.isHidden(p.id), flags = [];
    if (p.star) flags.push('<span class="flag star" title="教材标注的临床常用穴">★</span>');
    if (hid) flags.push('<span class="flag" title="已隐藏">⊘</span>');
    if (Z.isFav(p.id)) flags.push('<span class="flag" style="color:#b8892f">☆</span>');
    if (Z.note(p.id)) flags.push('<span class="flag" style="color:#2f5d56">✎</span>');
    if (Object.keys(Z.store.edits[p.id] || {}).length) flags.push('<span class="flag" title="已修改">✐</span>');
    return '<div class="dr' + (hid ? ' hid' : '') + (st.sel[p.id] ? ' sel' : '') + '" data-dr="' + p.id + '">' +
      (manage ? '<label class="ck"><input type="checkbox" data-ck="' + p.id + '"' + (st.sel[p.id] ? ' checked' : '') + '></label>' : '') +
      '<span class="nm">' + esc(p.name) + '</span>' +
      '<span class="code tiny">' + esc(p.code || '') + '</span>' +
      '<span class="flags">' + flags.join('') + '</span></div>';
  }

  function pointsListHTML() {
    var kw = st.kw, out = [];
    var hitCount = 0;
    Z.meridians.forEach(function (m, mi) {
      var rows = [];
      var grp = '';
      (m.pointIds || []).forEach(function (pid) {
        var p = Z.byId[pid];
        if (!p) return;
        if (kw && p.name.indexOf(kw) < 0 && (p.code || '').toLowerCase().indexOf(kw.toLowerCase()) < 0 &&
            (p.pinyinPlain || '').indexOf(kw.toLowerCase()) < 0) return;
        if (p.group && p.group !== grp && m.name.indexOf('经外奇穴') >= 0) {
          grp = p.group;
          rows.push('<div class="sub-grp">' + esc(grp) + '</div>');
        }
        rows.push(pointRow(p, st.manage));
        hitCount++;
      });
      if (rows.length) {
        out.push('<div class="chap open" data-chap="' + mi + '"><div class="chap-hd"><span class="cn">' +
          esc(m.no) + '　' + esc(m.name) + '</span><span class="chip gray tiny">' + rows.filter(function (r) { return r.indexOf('data-dr') >= 0; }).length + ' 穴</span></div>' +
          '<div class="chap-bd">' + rows.join('') + '</div></div>');
      }
    });
    if (!hitCount) return UI.emptyBox('没有找到「' + kw + '」', '试试穴名 / 编号（如 LU1）/ 拼音（如 hegu）');
    return (kw ? '<div class="tiny dim" style="margin:0 4px 8px">匹配 <b>' + hitCount + '</b> 个腧穴</div>' : '') +
      out.join('') + '<div class="small dim center" style="margin:12px 0 4px">— 共 ' + Z.points.length +
      ' 个腧穴（' + Z.meridians.length + ' 节）—</div>';
  }

  function bindList(main, scope) {
    main.querySelectorAll('[data-dr]').forEach(function (el) {
      el.onclick = function (e) {
        var id = el.getAttribute('data-dr');
        if (st.manage) {
          if (e.target.closest && e.target.closest('.ck')) return;
          toggleSel(id); el.classList.toggle('sel', !!st.sel[id]);
          var ck = el.querySelector('input'); if (ck) ck.checked = !!st.sel[id];
          paintManageBar(main);
          return;
        }
        UI.go((scope === 'point' ? '#/point/' : '#/disease/') + id);
      };
    });
    main.querySelectorAll('[data-ck]').forEach(function (ck) {
      ck.onclick = function (e) {
        e.stopPropagation();
        var id = ck.getAttribute('data-ck');
        toggleSel(id);
        var row = ck.closest('.dr'); if (row) row.classList.toggle('sel', !!st.sel[id]);
        paintManageBar(main);
      };
    });
  }

  function renderPoints(main) {
    UI.header({
      title: '经络腧穴', sub: Z.points.length + ' 穴',
      actions: [{ icon: 'search', label: '搜索', onClick: function () { UI.go('#/search?tab=point'); } },
                { text: st.manage ? '完成' : '管理', label: '批量管理', onClick: function () { st.manage = !st.manage; st.sel = {}; renderPoints(main); } }]
    });
    var h = [];
    if (Z.hiddenCount() && !st.manage) {
      h.push('<div class="card" style="padding:10px 12px"><div class="row between"><div class="small muted">已隐藏 ' + Z.hiddenCount() +
        ' 项（目录带删除线、卡片切换跳过）</div><button class="btn xs" id="show-hidden">去取消隐藏</button></div></div>');
    }
    h.push('<div class="searchbox mb10"><svg class="s-ico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" fill="none" stroke-width="1.9"/><path d="m16 16 4.5 4.5" stroke-width="1.9" stroke-linecap="round" fill="none"/></svg>' +
      '<input class="input" id="cat-kw" placeholder="查腧穴：穴名 / 编号 / 拼音" value="' + esc(st.kw) + '" autocomplete="off"></div>');
    var starN = Z.points.filter(function (p) { return p.star; }).length;
    h.push('<div class="legend">穴名后带 ★ 者为教材标注的<b>临床常用穴</b>（共 ' + starN + ' 个）</div>');
    h.push('<div id="cat-list">' + pointsListHTML() + '</div>');
    main.innerHTML = h.join('');
    main.className = st.manage ? 'has-bar' : '';
    bindList(main, 'point');
    var kw = main.querySelector('#cat-kw');
    if (kw) {
      var composing = false, timer = null;
      function apply() {
        st.kw = kw.value.trim();
        main.querySelector('#cat-list').innerHTML = pointsListHTML();
        bindList(main, 'point');
        if (st.manage) paintManageBar(main);
      }
      kw.addEventListener('compositionstart', function () { composing = true; });
      kw.addEventListener('compositionend', function () { composing = false; clearTimeout(timer); timer = setTimeout(apply, 160); });
      kw.oninput = function () { if (composing) return; clearTimeout(timer); timer = setTimeout(apply, 160); };
      kw.onkeydown = function (e) {
        if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); apply(); kw.blur(); }
        if (e.key === 'Escape') { kw.value = ''; st.kw = ''; clearTimeout(timer); apply(); }
      };
    }
    var sh = main.querySelector('#show-hidden');
    if (sh) sh.onclick = function () { st.manage = true; st.sel = {}; UI.render(); UI.toast('进入管理：勾选已隐藏项再点「取消隐藏」'); };
    if (st.manage) paintManageBar(main); else removeManageBar();
  }

  /* ================= 腧穴卡片 ================= */
  function sec(title, body) {
    if (!body) return '';
    return '<section class="sec"><h2 class="sec-h">' + esc(title) + '</h2><div class="rich">' + Z.renderRich(body) + '</div></section>';
  }
  function renderPoint(main, p) {
    var id = p[0], raw = Z.byId[id];
    if (!raw) { main.innerHTML = UI.emptyBox('腧穴不存在'); return; }
    var v = Z.viewPoint(raw);
    UI.header({ title: v.name, sub: v.meridianName, back: true, backTo: '#/points' });
    var hid = Z.isHidden(v.id);
    var h = [];
    if (hid) h.push('<div class="notice mb10"><span>该穴已隐藏。</span><button class="btn xs" id="unhide-now">取消隐藏</button></div>');
    if (v.hasEdit) h.push('<div class="notice mb10"><span>内容已按你的编辑显示。</span><button class="btn xs" id="reset-now">恢复原文</button></div>');
    h.push('<div class="card card-main"><div class="ct-hd"><div class="ct-name">' + esc(v.name) + '</div>' +
      '<div class="ct-sub">' + esc(v.pinyin || '') + '</div></div>');
    h.push('<div class="meta-row">' + (v.code ? '<span class="chip solid">' + esc(v.code) + '</span>' : '') +
      (v.special ? '<span class="chip">' + esc(v.special) + '</span>' : '') +
      '<span class="chip gray">' + esc(v.meridianName) + '</span>' +
      (v.star ? '<span class="chip star-chip">★ 临床常用穴</span>' : '') + '</div>');
    h.push('<div class="ct-body">' + sec('定位', v.location) + sec('解剖', v.anatomy) +
      sec('主治', v.indications) + sec('操作', v.manipulation) + '</div>');
    h.push('<div class="ct-acts">' +
      '<button class="btn sm" data-act="note">' + icon('note') + '笔记</button>' +
      '<button class="btn sm' + (Z.isFav(v.id) ? ' on' : '') + '" data-act="fav">' + icon('star') + (Z.isFav(v.id) ? '已藏' : '收藏') + '</button>' +
      '<button class="btn sm" data-act="edit">' + icon('edit') + '编辑</button>' +
      '<button class="btn sm" data-act="hide">' + icon('hide') + '隐藏</button></div>');
    h.push('<div id="card-panel"></div></div>');
    var prev = Z.navPoint(v.id, -1), next = Z.navPoint(v.id, 1);
    h.push('<div class="pager-row"><button class="btn sm" id="d-prev"' + (prev ? '' : ' disabled') + '>‹ 上一穴</button>' +
      '<button class="btn sm" id="d-next"' + (next ? '' : ' disabled') + '>下一穴 ›</button></div>');
    h.push('<div class="tiny dim center" style="margin-top:8px">' +
      (raw.meridian ? '<a href="#/meridian/' + raw.meridian + '" class="link">查看所属经脉（循行·病候·经穴歌）›</a>' : '') + '</div>');
    main.innerHTML = h.join('');
    bindCard(main, 'point', v);
  }

  /* ================= 治疗目录 ================= */
  function diseaseRow(d, manage) {
    var hid = Z.isHidden(d.id), flags = [];
    if (d.kind === 'attach') flags.push('<span class="chip gray tiny" style="height:19px;padding:0 6px">附</span>');
    if (hid) flags.push('<span class="flag" title="已隐藏">⊘</span>');
    if (Z.isFav(d.id)) flags.push('<span class="flag" style="color:#b8892f">☆</span>');
    if (Z.note(d.id)) flags.push('<span class="flag" style="color:#2f5d56">✎</span>');
    if (Object.keys(Z.store.edits[d.id] || {}).length) flags.push('<span class="flag" title="已修改">✐</span>');
    return '<div class="dr' + (d.kind === 'attach' ? ' attach' : '') + (hid ? ' hid' : '') + (st.sel[d.id] ? ' sel' : '') + '" data-dr="' + d.id + '">' +
      (manage ? '<label class="ck"><input type="checkbox" data-ck="' + d.id + '"' + (st.sel[d.id] ? ' checked' : '') + '></label>' : '') +
      '<span class="nm">' + esc(d.name) + '</span><span class="flags">' + flags.join('') + '</span></div>';
  }
  function treatListHTML() {
    var kw = st.kw, out = [], hit = 0;
    Z.sections.forEach(function (sec) {
      var rows = [];
      (sec.diseaseIds || []).forEach(function (did) {
        var d = Z.byId[did];
        if (!d) return;
        if (kw && d.name.indexOf(kw) < 0 && (d.sectionName || '').indexOf(kw) < 0) return;
        rows.push(diseaseRow(d, st.manage)); hit++;
      });
      if (rows.length) out.push('<div class="chap open"><div class="chap-hd"><span class="cn">' + esc(sec.no) + '　' + esc(sec.name) +
        '</span><span class="chip gray tiny">' + rows.length + ' 证</span></div><div class="chap-bd">' + rows.join('') + '</div></div>');
    });
    if (!hit) return UI.emptyBox('没有找到「' + kw + '」', '试试病证名（如 头痛）');
    return (kw ? '<div class="tiny dim" style="margin:0 4px 8px">匹配 <b>' + hit + '</b> 个病证</div>' : '') + out.join('') +
      '<div class="small dim center" style="margin:12px 0 4px">— 共 ' + Z.diseases.length + ' 个病证（含附 ' +
      Z.diseases.filter(function (d) { return d.kind === 'attach'; }).length + ' 个）—</div>';
  }

  function renderTreat(main) {
    UI.header({
      title: '针灸治疗', sub: Z.diseases.length + ' 证',
      actions: [{ icon: 'search', label: '搜索', onClick: function () { UI.go('#/search?tab=disease'); } },
                { text: st.manage ? '完成' : '管理', label: '批量管理', onClick: function () { st.manage = !st.manage; st.sel = {}; renderTreat(main); } }]
    });
    var h = [];
    if (Z.hiddenCount() && !st.manage) {
      h.push('<div class="card" style="padding:10px 12px"><div class="row between"><div class="small muted">已隐藏 ' + Z.hiddenCount() +
        ' 项</div><button class="btn xs" id="show-hidden">去取消隐藏</button></div></div>');
    }
    h.push('<div class="searchbox mb10"><svg class="s-ico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" fill="none" stroke-width="1.9"/><path d="m16 16 4.5 4.5" stroke-width="1.9" stroke-linecap="round" fill="none"/></svg>' +
      '<input class="input" id="cat-kw" placeholder="查病证名（如 头痛 / 面瘫）" value="' + esc(st.kw) + '" autocomplete="off"></div>');
    h.push('<div id="cat-list">' + treatListHTML() + '</div>');
    main.innerHTML = h.join('');
    main.className = st.manage ? 'has-bar' : '';
    bindList(main, 'disease');
    var kw = main.querySelector('#cat-kw');
    if (kw) {
      var composing = false, timer = null;
      function apply() {
        st.kw = kw.value.trim();
        main.querySelector('#cat-list').innerHTML = treatListHTML();
        bindList(main, 'disease');
        if (st.manage) paintManageBar(main);
      }
      kw.addEventListener('compositionstart', function () { composing = true; });
      kw.addEventListener('compositionend', function () { composing = false; clearTimeout(timer); timer = setTimeout(apply, 160); });
      kw.oninput = function () { if (composing) return; clearTimeout(timer); timer = setTimeout(apply, 160); };
      kw.onkeydown = function (e) {
        if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); apply(); kw.blur(); }
        if (e.key === 'Escape') { kw.value = ''; st.kw = ''; clearTimeout(timer); apply(); }
      };
    }
    var sh = main.querySelector('#show-hidden');
    if (sh) sh.onclick = function () { st.manage = true; st.sel = {}; UI.render(); };
    if (st.manage) paintManageBar(main); else removeManageBar();
  }

  /* ================= 病证卡片 ================= */
  var cardState = { page: 0, panel: null, panelId: '' };
  var PAGES = ['概述', '辨证', '治疗', '其他·按语'];

  function unitHTML(u, i) {
    var h = ['<div class="unit"><div class="unit-hd"><span class="unit-n">' + (i + 1) + '</span>' +
      '<span class="unit-t">' + esc(u.title || '') + '</span></div>'];
    if (u.zhifa) h.push('<p><b class="fl">治法：</b>' + Z.inline(u.zhifa) + '</p>');
    if (u.mainLines && u.mainLines.length) {
      h.push('<p><b class="fl">主穴：</b></p><div class="kv">');
      u.mainLines.forEach(function (l) {
        h.push('<div class="kv-row"><span class="kv-k">' + esc(l.key || '—') + '</span><span class="kv-v">' + Z.inline(l.points) + '</span></div>');
      });
      h.push('</div>');
    } else if (u.main) {
      h.push('<p><b class="fl">主穴：</b>' + Z.inline(u.main) + '</p>');
    }
    if (u.auxPairs && u.auxPairs.length) {
      h.push('<p><b class="fl">配穴：</b></p><div class="kv">');
      u.auxPairs.forEach(function (p) {
        h.push('<div class="kv-row"><span class="kv-k">' + esc(p.key) + '</span><span class="kv-v">配 ' + Z.inline(p.points) + '</span></div>');
      });
      h.push('</div>');
    } else if (u.aux) {
      h.push('<p><b class="fl">配穴：</b>' + Z.inline(u.aux) + '</p>');
    }
    if (u.fangyi) h.push('<p class="fj"><b class="fl">方义：</b>' + Z.inline(u.fangyi) + '</p>');
    if (u.caozuo) h.push('<p class="fj"><b class="fl">操作：</b>' + Z.inline(u.caozuo) + '</p>');
    h.push('</div>');
    return h.join('');
  }

  function diseasePageHTML(v, page) {
    var h = [];
    if (page === 0) h.push(sec('病证概述', v.overview));
    else if (page === 1) h.push(sec('辨证', v.bianzheng));
    else if (page === 2) {
      if (!v.units.length) h.push('<div class="empty">本证无独立针灸治疗内容（见其附病证）</div>');
      else {
        h.push('<section class="sec"><h2 class="sec-h">基本治疗</h2><div class="rich">' +
          v.units.map(function (u, i) { return unitHTML(u, i); }).join('') + '</div></section>');
      }
    } else {
      h.push(sec('其他治疗', v.other));
      h.push(sec('按语', v.anliao));
    }
    return h.join('') || '<div class="empty">本页暂无内容</div>';
  }

  function renderDisease(main, p, q) {
    var id = p[0], raw = Z.byId[id];
    if (!raw) { main.innerHTML = UI.emptyBox('病证不存在'); return; }
    var v = Z.viewDisease(raw);
    var page = (q && q.p != null) ? Math.min(Math.max(0, parseInt(q.p, 10) || 0), 3)
                                  : Math.min(Math.max(0, cardState.page | 0), 3);
    cardState.page = page;
    UI.header({ title: v.name, sub: v.sectionName, back: true, backTo: '#/treat' });
    var hid = Z.isHidden(v.id);
    var h = [];
    if (hid) h.push('<div class="notice mb10"><span>该病证已隐藏。</span><button class="btn xs" id="unhide-now">取消隐藏</button></div>');
    if (v.hasEdit) h.push('<div class="notice mb10"><span>内容已按你的编辑显示。</span><button class="btn xs" id="reset-now">恢复原文</button></div>');
    h.push('<div class="card card-main"><div class="ct-hd"><div class="ct-name">' + esc(v.name) + '</div>' +
      '<div class="ct-sub">' + esc(v.sectionName) + ' · ' + v.units.length + ' 个治疗单元</div></div>');
    var tabs = [];
    for (var i = 0; i < 4; i++) {
      tabs.push('<button class="pg-tab' + (i === page ? ' on' : '') + '" data-pg="' + i + '"><span class="pg-i">' +
        (i + 1) + '</span><span class="pg-t">' + PAGES[i] + '</span></button>');
    }
    h.push('<div class="pg-tabs">' + tabs.join('') + '</div>');
    h.push('<div class="ct-body" id="ct-body">' + diseasePageHTML(v, page) + '</div>');
    h.push('<div class="pager"><button class="btn sm" id="pg-prev"' + (page <= 0 ? ' disabled' : '') + '>‹ 上一页</button>' +
      '<span class="pg-now">第 ' + (page + 1) + '/4 页</span>' +
      '<button class="btn sm" id="pg-next"' + (page >= 3 ? ' disabled' : '') + '>下一页 ›</button></div>');
    h.push('<div class="ct-acts">' +
      '<button class="btn sm" data-act="note">' + icon('note') + '笔记</button>' +
      '<button class="btn sm' + (Z.isFav(v.id) ? ' on' : '') + '" data-act="fav">' + icon('star') + (Z.isFav(v.id) ? '已藏' : '收藏') + '</button>' +
      '<button class="btn sm" data-act="edit">' + icon('edit') + '编辑</button>' +
      '<button class="btn sm" data-act="hide">' + icon('hide') + '隐藏</button></div>');
    h.push('<div id="card-panel"></div></div>');
    var prev = Z.navDisease(v.id, -1), next = Z.navDisease(v.id, 1);
    h.push('<div class="pager-row"><button class="btn sm" id="d-prev"' + (prev ? '' : ' disabled') + '>‹ 上一证</button>' +
      '<button class="btn sm" id="d-next"' + (next ? '' : ' disabled') + '>下一证 ›</button></div>');
    main.innerHTML = h.join('');
    bindCard(main, 'disease', v);
  }

  /* ================= 经脉卡 ================= */
  function renderMeridian(main, p) {
    var m = Z.meridians.filter(function (x) { return x.id === p[0]; })[0];
    if (!m) { main.innerHTML = UI.emptyBox('经脉不存在'); return; }
    UI.header({ title: m.name.replace('及其腧穴', '').replace('及其相关腧穴', ''), sub: m.no, back: true, backTo: '#/points' });
    var c = m.channels || {};
    var h = ['<div class="card card-main"><div class="ct-hd"><div class="ct-name">' +
      esc(m.name.replace('及其腧穴', '').replace('及其相关腧穴', '')) + '</div><div class="ct-sub">' + esc(m.no) + '</div></div><div class="ct-body">'];
    if (m.name.indexOf('十五络脉') >= 0 && Z.luo.length) {
      h.push('<section class="sec"><h2 class="sec-h">十五络脉（络穴）</h2><div class="rich">' +
        Z.luo.map(function (l) {
          return '<div class="luo"><div class="luo-h"><span class="luo-n">' + esc(l.no) + '</span>' +
            '<span class="luo-t">' + esc(l.name) + ' —— ' + esc(l.collateral) + '</span></div>' +
            '<p>' + Z.inline(l.text) + '</p></div>';
        }).join('') + '</div></section>');
    }
    if (c.jingmai) h.push(sec('经脉循行', c.jingmai));
    if (c.binghou) h.push(sec('经脉病候', c.binghou));
    if (c.zhuzhi) h.push(sec('主治概要', c.zhuzhi));
    if (c.jiaohui) h.push(sec('交会腧穴', c.jiaohui));
    if (c.jingxuege) h.push(sec('经穴歌', c.jingxuege));
    if ((m.pointIds || []).length) {
      h.push('<section class="sec"><h2 class="sec-h">本经腧穴（' + m.pointIds.length + '）</h2><div class="att-list">' +
        m.pointIds.map(function (pid) {
          var pt = Z.byId[pid];
          return pt ? '<a class="att-link" href="#/point/' + pid + '"><span class="at-nm">' + esc(pt.name) +
            '<span class="tiny dim"> ' + esc(pt.code || '') + '</span></span><span class="at-go">查看 ›</span></a>' : '';
        }).join('') + '</div></section>');
    }
    h.push('</div></div>');
    main.innerHTML = h.join('');
  }

  /* ================= 卡片通用绑定 ================= */
  function bindCard(main, kind, v) {
    var isPoint = kind === 'point';
    function gotoPage(i) {
      i = Math.min(Math.max(0, i), 3);
      cardState.page = i;
      UI.replaceHash(isPoint ? '#/point/' + v.id : '#/disease/' + v.id + '?p=' + i);
    }
    main.querySelectorAll('[data-pg]').forEach(function (b) { b.onclick = function () { gotoPage(+b.getAttribute('data-pg')); }; });
    var pi = main.querySelector('#pg-prev'); if (pi) pi.onclick = function () { gotoPage(cardState.page - 1); };
    var nx = main.querySelector('#pg-next'); if (nx) nx.onclick = function () { gotoPage(cardState.page + 1); };
    var dp = main.querySelector('#d-prev');
    if (dp) dp.onclick = function () {
      var id = isPoint ? Z.navPoint(v.id, -1) : Z.navDisease(v.id, -1);
      if (id) { cardState.page = 0; UI.replaceHash((isPoint ? '#/point/' : '#/disease/') + id + (isPoint ? '' : '?p=0')); }
    };
    var dn = main.querySelector('#d-next');
    if (dn) dn.onclick = function () {
      var id = isPoint ? Z.navPoint(v.id, 1) : Z.navDisease(v.id, 1);
      if (id) { cardState.page = 0; UI.replaceHash((isPoint ? '#/point/' : '#/disease/') + id + (isPoint ? '' : '?p=0')); }
    };
    var uh = main.querySelector('#unhide-now');
    if (uh) uh.onclick = function () { Z.setHidden(v.id, false); UI.toast('已取消隐藏'); UI.render(); };
    var rs = main.querySelector('#reset-now');
    if (rs) rs.onclick = function () {
      UI.confirmDialog('恢复原文', '将清除该项的全部修改，恢复教材原文。确定吗？', '恢复', '取消').then(function (ok) {
        if (ok) { Z.clearEdits(v.id); UI.toast('已恢复原文'); UI.render(); }
      });
    };
    main.querySelectorAll('[data-act]').forEach(function (b) {
      b.onclick = function () { cardState.panel = b.getAttribute('data-act'); cardState.panelId = v.id; UI.render(); };
    });
    if (cardState.panel && cardState.panelId === v.id) bindPanel(main, kind, v);
  }

  /* ================= 面板 ================= */
  function panelHTML(kind, v, panel) {
    if (panel === 'note') {
      return '<div class="panel" id="card-panel"><div class="p-hd"><span>笔记</span>' +
        '<button class="btn xs ghost" data-pc="close">收起</button></div>' +
        '<textarea class="textarea" id="note-txt" placeholder="写点自己的记忆点、易错点…">' + esc(Z.note(v.id)) + '</textarea>' +
        '<div class="p-ft"><button class="btn sm" data-pc="note-del">清除</button>' +
        '<button class="btn sm primary" data-pc="note-save">保存笔记</button></div></div>';
    }
    if (panel === 'fav') {
      var cur = Z.isFav(v.id);
      var gs = Z.store.fav.groups.map(function (g) {
        var on = cur && Z.favGroup(v.id) === g.id;
        return '<button class="chip' + (on ? ' on' : '') + '" data-fg="' + g.id + '">' + esc(g.name) + (on ? ' ✓' : '') + '</button>';
      }).join('');
      return '<div class="panel" id="card-panel"><div class="p-hd"><span>收藏到分组</span>' +
        '<button class="btn xs ghost" data-pc="close">收起</button></div><div class="row wrap" style="gap:6px">' + gs + '</div>' +
        '<div class="p-ft"><button class="btn sm" data-pc="fav-new">新建分组</button>' +
        (cur ? '<button class="btn sm danger" data-pc="fav-del">取消收藏</button>' : '') + '</div></div>';
    }
    if (panel === 'hide') {
      var hid = Z.isHidden(v.id);
      return '<div class="panel" id="card-panel"><div class="p-hd"><span>' + (hid ? '取消隐藏' : '隐藏') + '</span>' +
        '<button class="btn xs ghost" data-pc="close">收起</button></div><p class="small muted">' +
        (hid ? '取消隐藏后重新出现在目录。' : '隐藏后目录显示删除线、上下切换跳过它，可在目录「管理」批量取消。') +
        '</p><div class="p-ft"><button class="btn sm primary" data-pc="hide-do">' + (hid ? '取消隐藏' : '确认隐藏') + '</button></div></div>';
    }
    return editPanelHTML(kind, v);
  }

  function editPanelHTML(kind, v) {
    var h = ['<div class="panel" id="card-panel"><div class="p-hd"><span>编辑内容</span>' +
      '<button class="btn xs ghost" data-pc="close">收起</button></div><p class="tiny dim">保存后仅本机生效，可随时「恢复原文」。</p>'];
    if (kind === 'point') {
      [['location', '定位'], ['anatomy', '解剖'], ['indications', '主治'], ['manipulation', '操作']].forEach(function (f) {
        h.push('<div class="ef"><label>' + f[1] + '</label><textarea class="textarea" data-f="' + f[0] + '">' +
          esc(v[f[0]] || '') + '</textarea></div>');
      });
    } else {
      [['overview', '病证概述'], ['bianzheng', '辨证'], ['other', '其他治疗'], ['anliao', '按语']].forEach(function (f) {
        h.push('<div class="ef"><label>' + f[1] + '</label><textarea class="textarea" data-f="' + f[0] + '">' +
          esc(Z.fieldText(v[f[0]])) + '</textarea></div>');
      });
      (v.units || []).forEach(function (u, i) {
        h.push('<details class="sy-ed"><summary>治疗单元 ' + (i + 1) + '：' + esc(u.title) + '</summary>' +
          '<div class="ef"><label>治法</label><textarea class="textarea" data-u="' + i + '" data-uf="zhifa">' + esc(u.zhifa) + '</textarea></div>' +
          '<div class="ef"><label>主穴</label><textarea class="textarea" data-u="' + i + '" data-uf="main">' + esc(u.main) + '</textarea></div>' +
          '<div class="ef"><label>配穴</label><textarea class="textarea" data-u="' + i + '" data-uf="aux">' + esc(u.aux) + '</textarea></div>' +
          '<div class="ef"><label>方义</label><textarea class="textarea" data-u="' + i + '" data-uf="fangyi">' + esc(u.fangyi) + '</textarea></div>' +
          '<div class="ef"><label>操作</label><textarea class="textarea" data-u="' + i + '" data-uf="caozuo">' + esc(u.caozuo) + '</textarea></div>' +
          '</details>');
      });
    }
    h.push('<div class="p-ft"><button class="btn sm" data-pc="edit-reset">恢复原文</button>' +
      '<button class="btn sm primary" data-pc="edit-save">保存修改</button></div></div>');
    return h.join('');
  }

  function bindPanel(main, kind, v) {
    var host = document.getElementById('card-panel');
    if (!host) return;
    /* 关键：把面板 HTML 真正注入占位容器（之前漏了这一步，导致四个按钮点了没反应） */
    var wrap = document.createElement('div');
    wrap.innerHTML = panelHTML(kind, v, cardState.panel);
    var fresh = wrap.firstElementChild;
    if (!fresh) return;
    host.parentNode.replaceChild(fresh, host);
    var panel = fresh;
    var close = function () { cardState.panel = null; UI.render(); };
    panel.querySelectorAll('[data-pc="close"]').forEach(function (b) { b.onclick = close; });
    var sv = panel.querySelector('[data-pc="note-save"]');
    if (sv) sv.onclick = function () { Z.setNote(v.id, panel.querySelector('#note-txt').value); UI.toast('笔记已保存'); close(); };
    var dl = panel.querySelector('[data-pc="note-del"]');
    if (dl) dl.onclick = function () { Z.setNote(v.id, ''); UI.toast('已清除笔记'); close(); };
    panel.querySelectorAll('[data-fg]').forEach(function (b) {
      b.onclick = function () {
        var gid = b.getAttribute('data-fg');
        if (Z.isFav(v.id) && Z.favGroup(v.id) === gid) Z.toggleFav(v.id);
        else { if (Z.isFav(v.id)) Z.toggleFav(v.id); Z.toggleFav(v.id, gid); }
        UI.toast('已更新收藏'); close();
      };
    });
    var nf = panel.querySelector('[data-pc="fav-new"]');
    if (nf) nf.onclick = function () {
      UI.dialog({
        title: '新建收藏分组',
        html: '<input class="input" id="new-gname" placeholder="分组名称" style="width:100%">',
        buttons: [{ text: '取消', value: false }, { text: '创建', value: true, primary: true }]
      }).then(function (ok) {
        if (!ok) return;
        var inp = document.getElementById('new-gname');
        var name = ((inp && inp.value) || '').trim() || ('分组' + (Z.store.fav.groups.length + 1));
        var gid = 'g' + Date.now();
        Z.store.fav.groups.push({ id: gid, name: name });
        Z.toggleFav(v.id, gid); Z.save(true);
        UI.toast('已创建「' + name + '」'); close();
      });
    };
    var fd = panel.querySelector('[data-pc="fav-del"]');
    if (fd) fd.onclick = function () { Z.toggleFav(v.id); UI.toast('已取消收藏'); close(); };
    var hd = panel.querySelector('[data-pc="hide-do"]');
    if (hd) hd.onclick = function () {
      var cur = Z.isHidden(v.id); Z.setHidden(v.id, !cur);
      UI.toast(cur ? '已取消隐藏' : '已隐藏'); close();
    };
    var er = panel.querySelector('[data-pc="edit-reset"]');
    if (er) er.onclick = function () {
      UI.confirmDialog('恢复原文', '将清除该项的全部修改，恢复教材原文。确定吗？', '恢复', '取消').then(function (ok) {
        if (ok) { Z.clearEdits(v.id); UI.toast('已恢复原文'); close(); }
      });
    };
    var es = panel.querySelector('[data-pc="edit-save"]');
    if (es) es.onclick = function () {
      var e = {};
      panel.querySelectorAll('textarea[data-f]').forEach(function (ta) {
        var key = ta.getAttribute('data-f');
        var orig = Z.fieldText(v[key]);
        if (ta.value.trim() !== String(orig).trim()) e[key] = ta.value;
      });
      var eu = {};
      panel.querySelectorAll('textarea[data-u]').forEach(function (ta) {
        var i = ta.getAttribute('data-u'), f = ta.getAttribute('data-uf');
        var cur = (v.units || [])[i];
        if (!cur) return;
        if (String(ta.value) !== String(cur[f] == null ? '' : cur[f])) {
          eu[i] = eu[i] || {}; eu[i][f] = ta.value;
        }
      });
      if (Object.keys(eu).length) e.units = eu;
      if (!Object.keys(e).length) { UI.toast('没有改动'); return; }
      Z.store.edits[v.id] = e; Z.save(true); UI.toast('已保存修改'); close();
    };
  }

  window.ZJ_CARDS = { removeManageBar: removeManageBar, cardState: cardState };
  UI.VIEWS.points = renderPoints;
  UI.VIEWS.point = renderPoint;
  UI.VIEWS.treat = renderTreat;
  UI.VIEWS.disease = renderDisease;
  UI.VIEWS.meridian = renderMeridian;
})();
