/* 针灸学 · 练习：默写 / 选择题（双板块） / 草稿 / 退出守卫 */
(function () {
  'use strict';
  var Z = window.ZJ, UI = window.ZJ_UI;
  var esc = Z.esc, icon = UI.icon;

  var LETTERS = 'ABCDEFGHIJKLMN', MAX_OPT = 12, MAX_DRAFTS = 5;
  var st = { scope: 'point', fields: [], sel: {}, order: 'random', open: {} };
  var run = null;

  function letter(i) { return LETTERS.charAt(i) || '?'; }
  function modeLabel(m) { return m === 'mo' ? '默写' : '选择题'; }
  function scopeLabel(s) { return s === 'point' ? '腧穴' : '治疗'; }
  function fieldsLabel(fields) {
    var names = { location: '定位', anatomy: '解剖', indications: '主治', manipulation: '操作', zhifa: '治法', main: '主穴', aux: '配穴' };
    return fields.map(function (f) { return names[f] || f; }).join(' + ');
  }

  /* ---------- 选项池 ---------- */
  function poolPoints(field) {
    var out = [];
    Z.points.forEach(function (p) {
      var v = Z.viewPoint(p)[field];
      if (v) out.push(v);
    });
    return Z.uniq(out);
  }
  function poolZhifa() {
    var out = [];
    Z.diseases.forEach(function (d) {
      Z.viewDisease(d).units.forEach(function (u) { if (u.zhifa) out.push(u.zhifa); });
    });
    return Z.uniq(out);
  }
  function poolMain() {
    var out = [];
    Z.diseases.forEach(function (d) {
      Z.viewDisease(d).units.forEach(function (u) { if (u.main) out.push(u.main); });
    });
    return Z.uniq(out);
  }
  function poolAux() {
    var out = [];
    Z.diseases.forEach(function (d) {
      Z.viewDisease(d).units.forEach(function (u) {
        if (u.auxPairs && u.auxPairs.length) u.auxPairs.forEach(function (p) { if (p.points) out.push(p.points); });
        else if (u.aux) out.push(u.aux);
      });
    });
    return Z.uniq(out);
  }
  function pickDecoys(pool, correct, n) {
    var p = Z.uniq(pool).filter(function (x) { return correct.indexOf(x) < 0; });
    return Z.shuffle(p).slice(0, n);
  }

  /* ---------- 题目项生成 ---------- */
  function buildItems() {
    var items = [];
    var ids = Object.keys(st.sel);
    if (st.scope === 'point') {
      Z.points.forEach(function (p) {
        if (!st.sel[p.id]) return;
        var v = Z.viewPoint(p);
        st.fields.forEach(function (f) {
          items.push({ kind: 'point', pid: p.id, field: f, title: v.name, answer: v[f] || '' });
        });
      });
    } else {
      Z.diseases.forEach(function (d) {
        if (!st.sel[d.id]) return;
        var v = Z.viewDisease(d);
        (v.units || []).forEach(function (u, ui) {
          var base = v.name + (u.title && u.title !== v.name ? '·' + u.title : '');
          if (st.fields.indexOf('zhifa') >= 0 && u.zhifa) {
            items.push({ kind: 'zhifa', did: d.id, ui: ui, title: base, answer: u.zhifa });
          }
          if (st.fields.indexOf('main') >= 0) {
            if (u.mainLines && u.mainLines.length) {
              u.mainLines.forEach(function (l) {
                items.push({ kind: 'main', did: d.id, ui: ui, title: v.name + '·' + l.key,
                             key: l.key, answer: l.points });
              });
            } else if (u.main) {
              items.push({ kind: 'main', did: d.id, ui: ui, title: base, answer: u.main });
            }
          }
          if (st.fields.indexOf('aux') >= 0) {
            if (u.auxPairs && u.auxPairs.length) {
              u.auxPairs.forEach(function (p) {
                items.push({ kind: 'aux', did: d.id, ui: ui, title: v.name + '·' + p.key,
                             key: p.key, answer: p.points });
              });
            } else if (u.aux) {
              items.push({ kind: 'aux', did: d.id, ui: ui, title: base, answer: u.aux });
            }
          }
        });
      });
    }
    if (st.order === 'random') items = Z.shuffle(items);
    return items;
  }

  function fieldLabel(kind, field) {
    if (kind === 'point') {
      return { location: '定位', anatomy: '解剖', indications: '主治', manipulation: '操作' }[field] || field;
    }
    return { zhifa: '治法', main: '主穴', aux: '配穴' }[kind] || kind;
  }
  function itemStem(q) {
    if (q.kind === 'point') {
      return { tag: fieldLabel('point', q.field), name: q.title, ask: '「' + q.title + '」的' + fieldLabel('point', q.field) + '是？' };
    }
    if (q.kind === 'aux') return { tag: '配穴', name: q.title, ask: '「' + (q.key || q.title) + '」配什么穴？' };
    if (q.kind === 'main') return { tag: '主穴', name: q.title, ask: '「' + (q.key ? q.title : q.title) + '」的主穴是？' };
    return { tag: '治法', name: q.title, ask: '「' + q.title + '」的治法是？' };
  }

  /* ---------- 选择题生成（按项缓存） ---------- */
  function buildQuestion(q) {
    var pool, correct = q.answer;
    if (q.kind === 'point') pool = poolPoints(q.field);
    else if (q.kind === 'zhifa') pool = poolZhifa();
    else if (q.kind === 'main') pool = poolMain();
    else pool = poolAux();
    var decoys = pickDecoys(pool, [correct], 3);
    var opts = Z.shuffle([correct].concat(decoys));
    var s = itemStem(q);
    return { opts: opts, correct: [opts.indexOf(correct)], chosen: [], done: false, tag: s.tag, ask: s.ask };
  }

  /* ---------- 草稿 ---------- */
  function captureDom() {
    if (!run || run.mode !== 'mo') return;
    var q = run.items[run.idx];
    if (!q) return;
    var box = document.getElementById('mo-box');
    if (!box) return;
    var ta = box.querySelector('[data-mo]');
    if (ta) run.answers[run.idx] = ta.value;
  }
  function saveDraft(silent) {
    if (!run) return false;
    captureDom();
    var snap = JSON.parse(JSON.stringify({
      mode: run.mode, scope: run.scope, fields: run.fields, items: run.items,
      idx: run.idx, answers: run.answers, submitted: run.submitted, qcache: run.qcache,
      ts: Date.now(), done: run.done, key: run.key,
      title: scopeLabel(run.scope) + ' · ' + modeLabel(run.mode) + ' · ' + fieldsLabel(run.fields) +
        '（' + run.items.length + ' 题）',
      progress: doneCount() + '/' + run.items.length
    }));
    Z.store.drafts = Z.store.drafts.filter(function (x) { return x.key !== snap.key; });
    Z.store.drafts.unshift(snap);
    if (Z.store.drafts.length > MAX_DRAFTS) Z.store.drafts = Z.store.drafts.slice(0, MAX_DRAFTS);
    Z.save(true);
    if (!silent) UI.toast('练习已保存，可在「练习」页继续');
    return true;
  }
  function doneCount() {
    if (!run) return 0;
    if (run.mode === 'mo') return Object.keys(run.submitted || {}).length;
    return (run.qcache || []).filter(function (q) { return q && q.done; }).length;
  }

  /* ---------- 练习首页 ---------- */
  function renderHome(main) {
    UI.header({ title: '练习', sub: '默写 · 选择题' });
    var h = ['<div class="tile-grid">' +
      '<a class="tile" href="#/setup?m=mo&s=point"><div class="t-ic">✍</div><div class="t-t">默写 · 腧穴</div>' +
      '<div class="t-s">定位 / 解剖 / 主治 / 操作</div></a>' +
      '<a class="tile" href="#/setup?m=mo&s=disease"><div class="t-ic">✍</div><div class="t-t">默写 · 治疗</div>' +
      '<div class="t-s">治法 / 主穴 / 配穴</div></a>' +
      '<a class="tile" href="#/setup?m=tc&s=point"><div class="t-ic">☑</div><div class="t-t">选择 · 腧穴</div>' +
      '<div class="t-s">四字段选择题</div></a>' +
      '<a class="tile" href="#/setup?m=tc&s=disease"><div class="t-ic">☑</div><div class="t-t">选择 · 治疗</div>' +
      '<div class="t-s">含「X配什么穴」题型</div></a></div>'];
    var drafts = Z.store.drafts || [];
    h.push('<div class="card"><div class="row between mb8"><b>未完成练习</b><span class="tiny dim">最多 ' + MAX_DRAFTS + ' 份</span></div>');
    if (!drafts.length) h.push('<p class="small muted">暂无。练习中途退出会自动保存到这里。</p>');
    else drafts.forEach(function (dr, i) {
      h.push('<div class="draft-row"><div class="grow"><div class="d-t">' + esc(dr.title || '练习') + '</div>' +
        '<div class="tiny dim">' + esc(Z.nowText(dr.ts)) + ' · 进度 ' + esc(dr.progress || '') + '</div></div>' +
        '<button class="btn xs primary" data-dres="' + i + '">继续</button>' +
        '<button class="btn xs danger" data-ddel="' + i + '">删除</button></div>');
    });
    h.push('</div>');
    h.push('<div class="card flat"><p class="small muted" style="margin:0">' +
      '退出练习时已回答的内容会自动保存；保存的练习记录都能在「练习」页面找到。</p></div>');
    main.innerHTML = h.join('');
    main.querySelectorAll('[data-dres]').forEach(function (b) {
      b.onclick = function () {
        var dr = Z.store.drafts[+b.getAttribute('data-dres')];
        if (!dr) return;
        run = JSON.parse(JSON.stringify(dr));
        st.scope = run.scope; st.fields = run.fields.slice();
        UI.go('#/run/' + run.mode);
      };
    });
    main.querySelectorAll('[data-ddel]').forEach(function (b) {
      b.onclick = function () {
        var i = +b.getAttribute('data-ddel');
        UI.confirmDialog('删除草稿', '确定删除这份未完成练习？', '删除', '取消').then(function (ok) {
          if (!ok) return;
          Z.store.drafts.splice(i, 1); Z.save(true); renderHome(main);
        });
      };
    });
  }

  /* ---------- 范围选择：按目录折叠 / 整节批量 ---------- */
  function pickGroups(scope) {
    var gs = [];
    if (scope === 'point') {
      Z.meridians.forEach(function (m) {
        var ids = (m.pointIds || []).filter(function (pid) { return Z.byId[pid]; });
        if (ids.length) gs.push({ key: m.id, name: m.no + '　' + m.name, ids: ids, kind: 'point' });
      });
    } else {
      Z.sections.forEach(function (sec) {
        var ids = (sec.diseaseIds || []).filter(function (did) { return Z.byId[did]; });
        if (ids.length) gs.push({ key: sec.id, name: sec.no + '　' + sec.name, ids: ids, kind: 'disease' });
      });
    }
    return gs;
  }
  function pickGroupsHTML(scope) {
    var out = [];
    pickGroups(scope).forEach(function (g) {
      var opened = !!st.open[g.key];
      var sel = g.ids.filter(function (id) { return st.sel[id]; }).length;
      out.push('<div class="pick-chap' + (opened ? ' open' : '') + '" data-gk="' + g.key + '">' +
        '<div class="pc-hd"><span class="pc-caret">▸</span>' +
        '<span class="pc-name">' + esc(g.name) + '</span>' +
        '<span class="pc-cnt"><b>' + sel + '</b>/' + g.ids.length + '</span>' +
        '<label class="pc-all" title="整节全选/取消"><input type="checkbox" data-gall="' + g.key + '"' +
        (sel && sel === g.ids.length ? ' checked' : '') + '></label></div>' +
        '<div class="pc-bd">' +
        g.ids.map(function (id) {
          var x = Z.byId[id];
          var nm = g.kind === 'point' ? Z.viewPoint(x).name : ((x.kind === 'attach' ? '附：' : '') + x.name);
          var sub = g.kind === 'point' ? (Z.viewPoint(x).code || '') : (x.kind === 'attach' ? '附' : '');
          return '<label class="pick"><input type="checkbox" data-sel="' + id + '"' + (st.sel[id] ? ' checked' : '') + '>' +
            '<span class="pk-nm">' + esc(nm) + '</span>' +
            (sub ? '<span class="tiny dim">' + esc(sub) + '</span>' : '') + '</label>';
        }).join('') + '</div></div>');
    });
    return out.join('');
  }
  function syncGroup(gk, scope) {
    var g = pickGroups(scope).filter(function (x) { return x.key === gk; })[0];
    if (!g) return;
    var sel = g.ids.filter(function (id) { return st.sel[id]; }).length;
    var box = document.querySelector('.pick-chap[data-gk="' + gk + '"]');
    if (!box) return;
    var cnt = box.querySelector('.pc-cnt');
    if (cnt) cnt.innerHTML = '<b>' + sel + '</b>/' + g.ids.length;
    var all = box.querySelector('[data-gall]');
    if (all) { all.checked = sel === g.ids.length; all.indeterminate = sel > 0 && sel < g.ids.length; }
  }

  /* ---------- 设置页 ---------- */
  function renderSetup(main, p, q) {
    var mode = (q && q.m === 'tc') ? 'tc' : 'mo';
    var scope = (q && q.s === 'disease') ? 'disease' : 'point';
    st.scope = scope;
    st.fields = [];
    st.sel = {};
    UI.header({ title: modeLabel(mode) + ' · ' + scopeLabel(scope), back: true });
    var h = [];
    h.push('<div class="card"><div class="row between mb8"><b>范围</b><span class="tiny dim">已选 <b id="sc-n">0</b> 项</span></div>');
    h.push('<div class="row wrap" style="gap:6px;margin-bottom:8px">' +
      '<button class="btn xs" id="sel-all">全选全部</button><button class="btn xs" id="sel-none">清空</button>' +
      '<span class="tiny dim" style="align-self:center">点节名展开/折叠，节右侧方框可整节目录批量勾选</span></div>');
    h.push('<div class="pick-list">' + pickGroupsHTML(scope) + '</div></div>');
    h.push('<div class="card"><b>内容</b><div class="row wrap" style="gap:6px;margin-top:8px">' +
      (scope === 'point'
        ? ['location', 'anatomy', 'indications', 'manipulation'].map(function (f) {
            return '<button class="chip" data-fld="' + f + '">' + fieldLabel('point', f) + '</button>';
          }).join('')
        : ['zhifa', 'main', 'aux'].map(function (f) {
            return '<button class="chip" data-fld="' + f + '">' + fieldLabel('disease', f) + '</button>';
          }).join('')) +
      '</div><p class="tiny dim" style="margin:8px 0 0">' +
      (scope === 'point' ? '按穴名默写所选字段。' : '按病证（多证型/多单元自动拆成多题干）默写治法、主穴、配穴；配穴会按「X配…」逐条出题。') +
      '</p></div>');
    h.push('<div class="card"><b>顺序</b><div class="row" style="gap:6px;margin-top:8px">' +
      '<button class="chip on" data-ord="random">随机</button><button class="chip" data-ord="catalog">按目录</button></div></div>');
    h.push('<button class="btn primary block" id="start-btn" style="height:46px">开始练习</button>');
    main.innerHTML = h.join('');

    function updateStart() {
      var okS = Object.keys(st.sel).length > 0 && st.fields.length > 0;
      var b = main.querySelector('#start-btn'); if (b) b.disabled = !okS;
      var n = main.querySelector('#sc-n'); if (n) n.textContent = Object.keys(st.sel).length;
    }
    function refreshSelUI() {
      var scope2 = scope;
      pickGroups(scope2).forEach(function (g) { syncGroup(g.key, scope2); });
    }
    main.querySelectorAll('.pc-hd').forEach(function (hd) {
      hd.onclick = function (e) {
        if (e.target.closest && e.target.closest('.pc-all')) return;
        var box = hd.closest('.pick-chap');
        var gk = box.getAttribute('data-gk');
        st.open[gk] = !st.open[gk];
        box.classList.toggle('open', !!st.open[gk]);
      };
    });
    main.querySelectorAll('[data-gall]').forEach(function (all) {
      all.onchange = function () {
        var gk = all.getAttribute('data-gall');
        var g = pickGroups(scope).filter(function (x) { return x.key === gk; })[0];
        if (!g) return;
        g.ids.forEach(function (id) { if (all.checked) st.sel[id] = 1; else delete st.sel[id]; });
        main.querySelectorAll('.pick-chap[data-gk="' + gk + '"] [data-sel]').forEach(function (ck) {
          ck.checked = !!all.checked && !!st.sel[ck.getAttribute('data-sel')];
        });
        syncGroup(gk, scope); updateStart();
      };
    });
    main.querySelectorAll('[data-sel]').forEach(function (ck) {
      ck.onchange = function () {
        var id = ck.getAttribute('data-sel');
        if (ck.checked) st.sel[id] = 1; else delete st.sel[id];
        var box = ck.closest('.pick-chap');
        if (box) syncGroup(box.getAttribute('data-gk'), scope);
        updateStart();
      };
    });
    main.querySelector('#sel-all').onclick = function () {
      (scope === 'point' ? Z.points : Z.diseases).forEach(function (x) { st.sel[x.id] = 1; });
      main.querySelectorAll('[data-sel]').forEach(function (ck) { ck.checked = true; });
      refreshSelUI(); updateStart();
    };
    main.querySelector('#sel-none').onclick = function () {
      st.sel = {};
      main.querySelectorAll('[data-sel]').forEach(function (ck) { ck.checked = false; });
      refreshSelUI(); updateStart();
    };
    main.querySelectorAll('[data-fld]').forEach(function (b) {
      b.onclick = function () {
        var f = b.getAttribute('data-fld'), i = st.fields.indexOf(f);
        if (i >= 0) st.fields.splice(i, 1); else st.fields.push(f);
        b.classList.toggle('on', st.fields.indexOf(f) >= 0);
        updateStart();
      };
    });
    main.querySelectorAll('[data-ord]').forEach(function (b) {
      b.onclick = function () {
        st.order = b.getAttribute('data-ord');
        main.querySelectorAll('[data-ord]').forEach(function (x) { x.classList.toggle('on', x === b); });
      };
    });
    main.querySelector('#start-btn').onclick = function () {
      var items = buildItems();
      if (!items.length) { UI.toast('所选范围没有可练习内容'); return; }
      run = {
        mode: mode, scope: scope, fields: st.fields.slice(), items: items, idx: 0,
        answers: {}, submitted: {}, qcache: {}, ts: Date.now(), done: false,
        key: Date.now() + '-' + Math.random().toString(36).slice(2, 6)
      };
      UI.go('#/run/' + mode);
    };
    updateStart();
  }

  /* ---------- 运行页 ---------- */
  function renderRun(main) {
    if (!run) { UI.go('#/practice'); return; }
    var q = run.items[run.idx];
    if (!q) { finishRun(); return; }
    UI.header({
      title: modeLabel(run.mode) + ' · ' + (run.idx + 1) + '/' + run.items.length,
      sub: scopeLabel(run.scope) + ' · ' + fieldsLabel(run.fields),
      back: true,
      actions: [{ text: '结束', label: '结束练习', onClick: requestFinish }]
    });
    var s = itemStem(q);
    var h = [];
    h.push('<div class="card flat" style="padding:9px 12px"><div class="row between">' +
      '<span class="small muted">已完成 ' + doneCount() + ' / ' + run.items.length + ' 题</span>' +
      '<span class="small muted">' + esc(s.name) + '</span></div>' +
      '<div class="pbar"><i style="width:' + (run.items.length ? Math.round(doneCount() * 100 / run.items.length) : 0) + '%"></i></div></div>');
    if (run.mode === 'mo') {
      h.push('<div class="card"><div class="q-hd"><span class="q-nm">' + esc(s.name) + '</span>' +
        '<span class="chip gray tiny">' + esc(s.tag) + '</span></div>');
      h.push('<div class="q-stem" style="margin:8px 0 6px">' + esc(s.ask) + '</div>');
      h.push('<div id="mo-box"><textarea class="textarea mo-ta" data-mo placeholder="默写' + esc(s.tag) + '…">' +
        esc(run.answers[run.idx] || '') + '</textarea></div>');
      h.push('<div class="row" style="gap:8px;margin-top:10px"><button class="btn primary grow" id="mo-submit">提交，显示答案</button></div>');
      if (run.submitted[run.idx]) {
        h.push('<div class="ans-box"><div class="ans-h">参考答案</div><div class="rich">' + Z.renderRich(q.answer) + '</div></div>');
      }
      h.push('</div>');
    } else {
      var qq = run.qcache[run.idx] || (run.qcache[run.idx] = buildQuestion(q));
      h.push('<div class="card"><div class="q-hd"><span class="q-nm">' + esc(s.name) + '</span>' +
        '<span class="chip gray tiny">' + esc(qq.tag) + '</span></div>');
      h.push('<div class="q-stem" style="margin:8px 0 10px">' + esc(qq.ask) + '</div><div class="q-opts">');
      qq.opts.forEach(function (o, oi) {
        var cls = '';
        if (qq.done) {
          if (qq.correct.indexOf(oi) >= 0) cls = ' right';
          if (qq.chosen.indexOf(oi) >= 0 && qq.correct.indexOf(oi) < 0) cls = ' wrong';
          if (qq.chosen.indexOf(oi) >= 0 && qq.correct.indexOf(oi) >= 0) cls = ' right chosen';
        } else if (qq.chosen.indexOf(oi) >= 0) cls = ' chosen';
        h.push('<button class="q-opt' + cls + '" data-qo="' + oi + '"' + (qq.done ? ' disabled' : '') + '>' +
          '<span class="q-lt">' + letter(oi) + '</span><span class="q-ot">' + esc(o) + '</span></button>');
      });
      h.push('</div>');
      if (!qq.done) h.push('<div class="q-ft"><button class="btn xs primary" id="tc-submit">提交本题</button></div>');
      else {
        var okAll = qq.chosen.length === qq.correct.length && qq.chosen.every(function (c) { return qq.correct.indexOf(c) >= 0; });
        h.push('<div class="q-res' + (okAll ? ' ok' : ' bad') + '">' + (okAll ? '✓ 回答正确' : '✗ 回答有误') +
          '<span class="tiny dim"> 正确答案：' + qq.correct.map(function (i) { return letter(i); }).join('') + '</span></div>');
      }
      h.push('</div>');
    }
    h.push('<div class="pager-row"><button class="btn sm" id="r-prev"' + (run.idx <= 0 ? ' disabled' : '') + '>‹ 上一题</button>' +
      '<button class="btn sm" id="r-next">' + (run.idx >= run.items.length - 1 ? '完成练习 ›' : '下一题 ›') + '</button></div>');
    main.innerHTML = h.join('');
    bindRun(main, q);
  }

  function bindRun(main, q) {
    var pv = main.querySelector('#r-prev');
    if (pv) pv.onclick = function () { captureDom(); run.idx--; UI.replaceHash('#/run/' + run.mode); };
    var nx = main.querySelector('#r-next');
    if (nx) nx.onclick = function () {
      captureDom();
      if (run.idx >= run.items.length - 1) { finishRun(); return; }
      run.idx++; UI.replaceHash('#/run/' + run.mode);
    };
    var sb = main.querySelector('#mo-submit');
    if (sb) sb.onclick = function () {
      captureDom(); run.submitted[run.idx] = true; UI.replaceHash('#/run/' + run.mode);
    };
    main.querySelectorAll('[data-qo]').forEach(function (b) {
      b.onclick = function () {
        var qq = run.qcache[run.idx]; if (!qq || qq.done) return;
        var oi = +b.getAttribute('data-qo');
        qq.chosen = [oi];
        var box = b.closest('.q-opts');
        if (box) box.querySelectorAll('[data-qo]').forEach(function (ob) {
          ob.classList.toggle('chosen', +ob.getAttribute('data-qo') === oi);
        });
      };
    });
    var ts = main.querySelector('#tc-submit');
    if (ts) ts.onclick = function () {
      var qq = run.qcache[run.idx]; if (!qq || qq.done) return;
      if (!qq.chosen.length) { UI.toast('先选一个选项'); return; }
      qq.done = true;
      var y = window.scrollY;
      UI.replaceHash('#/run/' + run.mode);
      window.scrollTo(0, y);
    };
  }

  /* ---------- 结束/退出 ---------- */
  function finishRun() {
    if (!run) { UI.go('#/practice'); return; }
    captureDom();
    var done = doneCount(), total = run.items.length;
    var all = done >= total;
    var mode = run.mode;
    if (!all) saveDraft(true);
    else { Z.store.drafts = Z.store.drafts.filter(function (x) { return x.key !== run.key; }); Z.save(true); }
    run = null;
    if (all) {
      UI.dialog({
        title: '练习完成',
        text: '已完成全部 ' + total + ' 题。',
        buttons: [{ text: '回练习页', value: true, primary: true }]
      }).then(function () { UI.go('#/practice'); });
    } else { UI.toast('已保存，可在「练习」页继续'); UI.go('#/practice'); }
  }
  function requestFinish() {
    if (!run) { UI.go('#/practice'); return; }
    var done = doneCount();
    if (done < run.items.length) {
      UI.confirmDialog('还没做完', '已完成 ' + done + '/' + run.items.length + '。现在结束并保存？', '结束并保存', '继续练习')
        .then(function (ok) { if (ok) finishRun(); });
    } else finishRun();
  }

  var guardOpen = false;
  function beforeRoute(hash) {
    if (!run || run.done) return true;
    if (hash.indexOf('#/run/') === 0) return true;
    if (guardOpen) return false;
    guardOpen = true;
    var prevHash = location.hash || ('#/run/' + run.mode);
    captureDom();
    UI.dialog({
      title: '退出练习',
      text: '退出后已回答的内容会自动保存，保存的练习记录都能在「练习」页面找到。',
      buttons: [{ text: '继续练习', value: false }, { text: '退出并保存', value: true, primary: true }]
    }).then(function (ok) {
      guardOpen = false;
      if (ok) {
        saveDraft(true); run = null;
        if (location.hash === hash) UI.render();
        else location.hash = hash;
      } else {
        try { history.replaceState(null, '', prevHash); } catch (e) { }
      }
    });
    return false;
  }
  window.addEventListener('beforeunload', function (e) {
    if (run && !run.done) { captureDom(); saveDraft(true); e.preventDefault(); e.returnValue = ''; }
  });

  UI.VIEWS.practice = renderHome;
  UI.VIEWS.setup = renderSetup;
  UI.VIEWS.run = renderRun;
  window.ZJ_PRACTICE = { beforeRoute: beforeRoute, _set: function (scope, fields, sel, order) { st.scope = scope || st.scope; st.fields = fields || []; st.sel = sel || {}; if (order) st.order = order; }, _buildItems: buildItems, _buildQuestion: buildQuestion, _stem: itemStem };
})();
