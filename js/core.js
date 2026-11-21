/* 针灸学 · 数据层 / 本地存储 / 渲染 / 工具函数 */
(function () {
  'use strict';
  var D = window.ZJ_DATA;
  if (!D) {
    document.body.innerHTML = '<div class="empty">数据文件加载失败，请重新打开应用</div>';
    return;
  }
  var points = D.points || [];
  var diseases = D.diseases || [];
  var meridians = D.meridians || [];
  var sections = D.sections || [];
  var luo = D.luo || [];
  var byId = Object.create(null);
  points.forEach(function (p) { byId[p.id] = p; });
  diseases.forEach(function (d) { byId[d.id] = d; });
  meridians.forEach(function (m) { byId[m.id] = m; });

  /* ---------------- 本地存储 ---------------- */
  var KEY = 'zj.data.v1';
  var DEFAULT = {
    notes: {}, hidden: {}, edits: {},
    fav: { groups: [{ id: 'g0', name: '默认分组' }], items: {} },
    pos: { last: '' }, drafts: [], settings: { order: 'random' },
    meta: { firstOpen: 0, lastVersion: '', annOpen: false }
  };
  var store = load();
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return clone(DEFAULT);
      var o = JSON.parse(raw);
      Object.keys(DEFAULT).forEach(function (k) {
        if (o[k] === undefined || o[k] === null) o[k] = clone(DEFAULT[k]);
      });
      if (!o.fav || !Array.isArray(o.fav.groups) || !o.fav.groups.length) o.fav = clone(DEFAULT.fav);
      if (!o.fav.items) o.fav.items = {};
      if (!Array.isArray(o.drafts)) o.drafts = [];
      return o;
    } catch (e) { return clone(DEFAULT); }
  }
  var saveTimer = null;
  function save(now) {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (now) { persist(); return; }
    saveTimer = setTimeout(persist, 120);
  }
  function persist() {
    saveTimer = null;
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { }
  }
  window.addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') persist();
  });

  /* ---------------- 工具 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function inline(s) {
    return esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function uniq(arr) {
    var seen = Object.create(null), out = [];
    arr.forEach(function (x) { if (!seen[x]) { seen[x] = 1; out.push(x); } });
    return out;
  }
  function nowText(ts) {
    var d = new Date(ts || Date.now());
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
      p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function clip(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n) + '…' : s;
  }

  /* ---------------- markdown-lite 文本 → 块 ---------------- */
  function parseMdText(text) {
    var lines = String(text || '').split(/\r?\n/);
    var blocks = [], para = [];
    var i = 0;
    function flush() { if (para.length) { blocks.push({ t: 'p', x: para.join('\n') }); para = []; } }
    while (i < lines.length) {
      var s = lines[i].replace(/^\s+|\s+$/g, '');
      if (!s) { flush(); i++; continue; }
      if (s.charAt(0) === '|') {
        flush();
        var rows = [];
        while (i < lines.length && lines[i].replace(/^\s+|\s+$/g, '').charAt(0) === '|') {
          var cells = lines[i].replace(/^\s+|\s+$/g, '').replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); });
          if (!cells.every(function (c) { return /^-+$/.test(c) || c === ''; })) rows.push(cells);
          i++;
        }
        if (rows.length) blocks.push({ t: 'table', caption: '', head: rows[0], rows: rows.slice(1) });
        continue;
      }
      var mb = s.match(/^\*\*(.+)\*\*$/);
      if (mb) { flush(); blocks.push({ t: 'b', x: mb[1] }); i++; continue; }
      if (s.charAt(0) === '>') {
        flush(); var q = [];
        while (i < lines.length && lines[i].replace(/^\s+|\s+$/g, '').charAt(0) === '>') {
          q.push(lines[i].replace(/^\s+|\s+$/g, '').replace(/^>\s?/, '')); i++;
        }
        blocks.push({ t: 'q', x: q.join('\n') }); continue;
      }
      if (/^[-*]\s+/.test(s)) {
        flush(); var items = [];
        while (i < lines.length && /^[-*]\s+/.test(lines[i].replace(/^\s+|\s+$/g, ''))) {
          items.push(lines[i].replace(/^\s+|\s+$/g, '').replace(/^[-*]\s+/, '')); i++;
        }
        blocks.push({ t: 'ul', items: items }); continue;
      }
      if (/^\d+[.．、)]\s*/.test(s)) {
        flush(); var oitems = [];
        while (i < lines.length && /^\d+[.．、)]\s*/.test(lines[i].replace(/^\s+|\s+$/g, ''))) {
          oitems.push(lines[i].replace(/^\s+|\s+$/g, '')); i++;
        }
        blocks.push({ t: 'ol', items: oitems }); continue;
      }
      para.push(s); i++;
    }
    flush();
    return blocks;
  }

  /* ---------------- 块 → HTML ---------------- */
  function tableHTML(bl) {
    var h = [];
    if (bl.caption) h.push('<div class="tbl-cap">' + inline(bl.caption) + '</div>');
    h.push('<div class="tbl-wrap"><table><thead><tr>');
    (bl.head || []).forEach(function (c) { h.push('<th>' + inline(c) + '</th>'); });
    h.push('</tr></thead><tbody>');
    (bl.rows || []).forEach(function (r) {
      h.push('<tr>');
      r.forEach(function (c, ci) { h.push('<td' + (ci === 0 ? ' class="fc"' : '') + '>' + inline(c) + '</td>'); });
      h.push('</tr>');
    });
    h.push('</tbody></table></div>');
    return h.join('');
  }
  function blockHTML(bl) {
    if (!bl || !bl.t) return '';
    switch (bl.t) {
      case 'p': {
        var hx = inline(bl.x).replace(/\n/g, '<br>');
        hx = hx.replace(/^(主症|兼症|治法|主穴|配穴|方义|操作)：/, '<b class="fl">$1：</b>');
        return '<p>' + hx + '</p>';
      }
      case 'b': return '<div class="rich-b">' + inline(bl.x) + '</div>';
      case 'q': return '<blockquote>' + inline(bl.x).replace(/\n/g, '<br>') + '</blockquote>';
      case 'ul': return '<ul class="rich-ul">' + (bl.items || []).map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</ul>';
      case 'ol': return '<div class="rich-ol">' + (bl.items || []).map(function (x) {
        var m = String(x).match(/^(\d+)[.．、)]\s*([\s\S]*)$/);
        return '<div class="ol-i"><span class="ol-n">' + (m ? m[1] + '.' : '·') + '</span><span class="ol-x">' +
          inline(m ? m[2] : x) + '</span></div>';
      }).join('') + '</div>';
      case 'h': return '<div class="rich-h lv' + (bl.lv || 5) + '">' + inline(bl.x) + '</div>';
      case 'table': return tableHTML(bl);
      default: return '';
    }
  }
  function renderRich(input) {
    var blocks = Array.isArray(input) ? input : parseMdText(input);
    return blocks.map(blockHTML).join('');
  }
  function fieldText(input) {
    if (typeof input === 'string') return input;
    if (!Array.isArray(input)) return '';
    var out = [];
    input.forEach(function (bl) {
      if (typeof bl === 'string') { out.push(bl); return; }
      if (!bl || !bl.t) return;
      if (bl.t === 'p' || bl.t === 'q') out.push((bl.t === 'q' ? '> ' : '') + bl.x);
      else if (bl.t === 'b') out.push('**' + bl.x + '**');
      else if (bl.t === 'ul') bl.items.forEach(function (x) { out.push('- ' + x); });
      else if (bl.t === 'ol') bl.items.forEach(function (x) { out.push(x); });
      else if (bl.t === 'h') out.push(bl.x);
      else if (bl.t === 'table') {
        out.push('| ' + bl.head.join(' | ') + ' |');
        out.push('| ' + bl.head.map(function () { return '---'; }).join(' | ') + ' |');
        bl.rows.forEach(function (r) { out.push('| ' + r.join(' | ') + ' |'); });
      }
    });
    return out.join('\n');
  }

  /* ---------------- 排序（目录顺序） ---------------- */
  var pointOrder = points.map(function (p) { return p.id; });
  var diseaseOrder = diseases.map(function (d) { return d.id; });
  var pIdx = Object.create(null), dIdx = Object.create(null);
  pointOrder.forEach(function (id, i) { pIdx[id] = i; });
  diseaseOrder.forEach(function (id, i) { dIdx[id] = i; });

  /* ---------------- 收藏 / 隐藏 / 笔记 ---------------- */
  function isFav(id) { return !!store.fav.items[id]; }
  function favGroup(id) { return store.fav.items[id] || null; }
  function toggleFav(id, groupId) {
    if (store.fav.items[id]) delete store.fav.items[id];
    else store.fav.items[id] = groupId || (store.fav.groups[0] && store.fav.groups[0].id) || 'g0';
    save(true);
  }
  function favList(groupId) {
    return Object.keys(store.fav.items)
      .filter(function (id) { return byId[id] && (!groupId || store.fav.items[id] === groupId); })
      .sort(function (a, b) { return (pIdx[a] != null ? pIdx[a] : 1e6 + (dIdx[a] || 0)) - (pIdx[b] != null ? pIdx[b] : 1e6 + (dIdx[b] || 0)); });
  }
  function isHidden(id) { return !!store.hidden[id]; }
  function setHidden(id, v) { if (v) store.hidden[id] = 1; else delete store.hidden[id]; save(true); }
  function hiddenCount() { return Object.keys(store.hidden).length; }
  function note(id) { var n = store.notes[id]; return n ? n.t : ''; }
  function setNote(id, text) {
    if (text && text.trim()) store.notes[id] = { t: text, ts: Date.now() };
    else delete store.notes[id];
    save(true);
  }
  function noteCount() { return Object.keys(store.notes).length; }

  /* ---------------- 搜索 ---------------- */
  function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ''); }
  function searchPoints(kw) {
    kw = norm(kw);
    if (!kw) return [];
    var res = [];
    points.forEach(function (p) {
      var n = norm(p.name), code = norm(p.code), py = norm(p.pinyinPlain || p.pinyin), sp = norm(p.special), mn = norm(p.meridianName);
      var score = -1;
      if (n === kw || code === kw || py === kw) score = 0;
      else if (n.indexOf(kw) === 0 || code.indexOf(kw) === 0 || py.indexOf(kw) === 0) score = 1;
      else if (n.indexOf(kw) >= 0 || code.indexOf(kw) >= 0 || py.indexOf(kw) >= 0 || sp.indexOf(kw) >= 0 || mn.indexOf(kw) >= 0) score = 2;
      if (score >= 0) res.push({ p: p, score: score, idx: pIdx[p.id] || 0 });
    });
    res.sort(function (a, b) { return a.score - b.score || a.idx - b.idx; });
    return res.map(function (x) { return x.p; });
  }
  function searchDiseases(kw) {
    kw = norm(kw);
    if (!kw) return [];
    var res = [];
    diseases.forEach(function (d) {
      var n = norm(d.name), sec = norm(d.sectionName);
      var score = -1;
      if (n === kw) score = 0;
      else if (n.indexOf(kw) === 0) score = 1;
      else if (n.indexOf(kw) >= 0 || sec.indexOf(kw) >= 0) score = 2;
      if (score >= 0) res.push({ d: d, score: score, idx: dIdx[d.id] || 0 });
    });
    res.sort(function (a, b) { return a.score - b.score || a.idx - b.idx; });
    return res.map(function (x) { return x.d; });
  }

  /* ---------------- 视图（合并用户编辑） ---------------- */
  function viewPoint(p) {
    var e = store.edits[p.id] || {};
    return {
      id: p.id, name: p.name, pinyin: p.pinyin, pinyinPlain: p.pinyinPlain, code: p.code,
      special: p.special, star: p.star, meridian: p.meridian, meridianName: p.meridianName,
      sectionNo: p.sectionNo, group: p.group,
      location: e.location != null ? e.location : p.location,
      anatomy: e.anatomy != null ? e.anatomy : p.anatomy,
      indications: e.indications != null ? e.indications : p.indications,
      manipulation: e.manipulation != null ? e.manipulation : p.manipulation,
      hasEdit: Object.keys(e).length > 0
    };
  }
  function viewDisease(d) {
    var e = store.edits[d.id] || {};
    var eu = e.units || {};
    var units = (d.units || []).map(function (u, i) {
      var o = eu[i] || {};
      return {
        title: u.title,
        zhifa: o.zhifa != null ? o.zhifa : u.zhifa,
        main: o.main != null ? o.main : u.main.flat,
        aux: o.aux != null ? o.aux : u.aux.raw,
        fangyi: o.fangyi != null ? o.fangyi : u.fangyi,
        caozuo: o.caozuo != null ? o.caozuo : u.caozuo,
        mainLines: u.main.lines, auxPairs: u.aux.pairs
      };
    });
    return {
      id: d.id, name: d.name, kind: d.kind, sectionId: d.sectionId, sectionName: d.sectionName,
      overview: e.overview != null ? e.overview : d.overview,
      bianzheng: e.bianzheng != null ? e.bianzheng : d.bianzheng,
      other: e.other != null ? e.other : d.other,
      anliao: e.anliao != null ? e.anliao : d.anliao,
      units: units,
      hasEdit: Object.keys(e).length > 0
    };
  }
  function clearEdits(id) { delete store.edits[id]; save(true); }

  /* ---------------- 上一个/下一个（跳过隐藏） ---------------- */
  function navigate(order, idxMap, id, dir) {
    var i = idxMap[id];
    if (i == null) return null;
    var n = order.length;
    for (var step = 1; step <= n; step++) {
      var j = (i + dir * step + n * 2) % n;
      var cand = order[j];
      if (!isHidden(cand)) return cand;
    }
    return null;
  }
  function navPoint(id, dir) { return navigate(pointOrder, pIdx, id, dir); }
  function navDisease(id, dir) { return navigate(diseaseOrder, dIdx, id, dir); }

  /* ---------------- 练习计数 ---------------- */
  function practiceTotal(rec) {
    if (!rec) return 0;
    if (rec.mode === 'mo') return (rec.items || []).length;
    return (rec.qs || []).length;
  }
  function practiceDone(rec) {
    if (!rec) return 0;
    if (rec.mode === 'mo') return Object.keys(rec.submitted || {}).length;
    var n = 0, qs = rec.qs || {};
    Object.keys(qs).forEach(function (k) { if (qs[k] && qs[k].done) n++; });
    return n;
  }

  window.ZJ = {
    D: D, points: points, diseases: diseases, meridians: meridians, sections: sections, luo: luo,
    byId: byId, pointOrder: pointOrder, diseaseOrder: diseaseOrder,
    pIdx: pIdx, dIdx: dIdx,
    store: store, save: save, persist: persist,
    esc: esc, inline: inline, shuffle: shuffle, uniq: uniq, nowText: nowText, clip: clip,
    parseMdText: parseMdText, renderRich: renderRich, fieldText: fieldText, tableHTML: tableHTML,
    viewPoint: viewPoint, viewDisease: viewDisease, clearEdits: clearEdits,
    isFav: isFav, favGroup: favGroup, toggleFav: toggleFav, favList: favList,
    isHidden: isHidden, setHidden: setHidden, hiddenCount: hiddenCount,
    note: note, setNote: setNote, noteCount: noteCount,
    searchPoints: searchPoints, searchDiseases: searchDiseases,
    navPoint: navPoint, navDisease: navDisease,
    practiceTotal: practiceTotal, practiceDone: practiceDone
  };
})();
