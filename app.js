/* ==========================================================================
   启航导航 · app.js
   经典脚本（非 module），避免 file:// 下的模块加载限制。
   模型：一个分类 = 一页。分类导航在头部，内容区只渲染当前分类。
        搜索时临时跨全部分类，按分类分组展示，清空后回到原分类。
   图标：抓得到就显示真图标；抓不到、或你没手动传，就退回「识别色方块 + 首字」。
   数据流：GET /api/data 读 → 内存里改 → POST /api/data 整份写回。
   ========================================================================== */
(function () {
  'use strict';

  var API = '/api/data';
  var ICON_API = '/api/icon';
  var SESSION_API = '/api/session';
  var ACCOUNTS_API = '/api/accounts';
  var HASH_PREFIX = '#/c/';
  var PALETTE_SIZE = 8;      // CSS 里的 --cat-1 .. --cat-8（R-1.10）
  var MAX_ICON_BYTES = 512 * 1024;

  /* ---------- 图标：全部内联 SVG（R-5.1，禁止 emoji 与图标字体） ---------- */
  var ICON = {
    edit: '<svg viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9.2 1.6 11.4 3.8 4.7 10.5 1.5 11.5 2.5 8.3Z"/></svg>',
    del: '<svg viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M1.8 3.4h9.4M5 3.4V2h3v1.4M3 3.4l.6 8h5.8l.6-8"/></svg>',
    plus: '<svg viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M7.5 2v11M2 7.5h11"/></svg>',
    go: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 2.5h6.5V9M11.2 2.8 3 11"/></svg>'
  };

  /* ---------- DOM ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var elGate = $('gate'), elPage = $('page'), elGrid = $('grid'), elEmpty = $('empty'), elCatnav = $('catnav');
  var elGateUsername = $('gate-username');
  var elAccountName = $('account-name'), elManageAccounts = $('manage-accounts');
  var elAccountsModal = $('accounts-modal'), elAccountsList = $('accounts-list');
  var elAccountForm = $('account-form'), elAccountsMessage = $('accounts-message');
  var elResetForm = $('reset-password-form'), resetUsername = null;
  var accountBusy = false;
  var elGateForm = $('gate-form'), elGatePwd = $('gate-pwd'), elGateErr = $('gate-err'), elGateSubmit = $('gate-submit');
  var elQ = $('q'), elSearchBox = $('search-box'), elQClear = $('q-clear');
  var elEngine = $('search-engine');
  var engines = { baidu: 'https://www.baidu.com/s?wd=', bing: 'https://www.bing.com/search?q=', google: 'https://www.google.com/search?q=', duckduckgo: 'https://duckduckgo.com/?q=' };
  var importPlan = null, importRevision = 0;
  function preferenceKey() { return 'nav-engine:' + state.user.username.toLowerCase(); }
  function updateSearch() {
    state.query = elEngine.value === 'local' ? elQ.value : '';
    elQ.placeholder = elEngine.value === 'local' ? '搜索站点、网址或分类' : '输入关键词，搜索网络';
    render();
  }
  function closeImport() {
    if ($('import-modal').classList.contains('is-open')) { elSave.disabled = false; elDiscard.disabled = false; }
    importRevision++; importPlan = null; $('import-modal').classList.remove('is-open');
    $('import-confirm').disabled = true;
  }
  var elEditToggle = $('edit-toggle'), elEditLabel = $('edit-label'), elLogout = $('logout');
  var elSavebar = $('savebar'), elSavebarText = $('savebar-text'), elSave = $('save'), elDiscard = $('discard');
  var elAddCat = $('add-cat');
  var elLinkModal = $('link-modal'), elLinkForm = $('link-form'), elLinkTitle = $('link-modal-title');
  var elLnName = $('ln-name'), elLnUrl = $('ln-url'), elLnDesc = $('ln-desc');
  var elIconFile = $('ln-icon-file'), elIconClear = $('ln-icon-clear');
  var elIconPreview = $('ln-icon-preview'), elIconHint = $('ln-icon-hint');
  var elCatModal = $('cat-modal'), elCatForm = $('cat-form'), elCatTitle = $('cat-modal-title');
  var elCatName = $('cat-name'), elCatSwatches = $('cat-swatches');

  /* ---------- 状态 ---------- */
  var state = {
    user: null,
    data: { version: 1, categories: [] },
    editing: false,
    dirty: false,
    query: '',
    selectedId: null
  };

  var linkTarget = null; // { mode, catId, linkId, id, pendingIcon, clearIcon }
  var catTarget = null;  // { mode, catId, color }
  var iconVer = {};      // linkId -> 时间戳，用于换图标后让浏览器重新拉

  /* ---------- 工具 ---------- */
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function catById(id) {
    for (var i = 0; i < state.data.categories.length; i++) {
      if (state.data.categories[i].id === id) return state.data.categories[i];
    }
    return null;
  }
  function firstChar(name) { return (name || '?').trim().charAt(0).toUpperCase(); } // R-5.2 兜底：色块 + 首字
  function hostOf(url) { try { return new URL(url).host.replace(/^www\./, ''); } catch (e) { return ''; } }
  function iconUrl(id) {
    return ICON_API + '?id=' + encodeURIComponent(id) + (iconVer[id] ? '&v=' + iconVer[id] : '');
  }
  function nextColor() {
    var used = state.data.categories.map(function (c) { return c.color; });
    for (var i = 1; i <= PALETTE_SIZE; i++) { if (used.indexOf(i) === -1) return i; }
    return (state.data.categories.length % PALETTE_SIZE) + 1;
  }
  function setDirty(v) {
    state.dirty = v;
    elSavebar.classList.toggle('is-open', v);
    elSavebarText.textContent = v ? '有未保存的修改' : '';
  }
  function parseHash() {
    return location.hash.indexOf(HASH_PREFIX) === 0 ? location.hash.slice(HASH_PREFIX.length) : null;
  }

  /* ---------- 接口 ---------- */
  function api(method, body) {
    var headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    return fetch(API, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (json) {
          return { status: res.status, ok: res.ok, json: json };
        });
      });
  }

  /* ---------- 渲染：分类导航 ---------- */
  function renderNav(searching) {
    elCatnav.textContent = '';
    if (!state.data.categories.length) return;
    state.data.categories.forEach(function (cat) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = cat.name;
      b.setAttribute('aria-label', '切换到分类 ' + cat.name);
      if (!searching && cat.id === state.selectedId) b.setAttribute('aria-current', 'true');
      b.addEventListener('click', function () { selectCat(cat.id, true); });
      elCatnav.appendChild(b);
    });
  }

  /* ---------- 渲染：站点链接（紧凑行式） ---------- */
  function siteLink(cat, link) {
    var a = document.createElement('a');
    a.className = 'site-link';
    a.style.setProperty('--cat', 'var(--cat-' + (cat.color || 1) + ')');
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener';
    // 描述不再占一行，放进悬停提示
    a.title = link.desc ? (link.name + ' · ' + link.desc) : (link.name + ' · ' + hostOf(link.url));

    var mark = document.createElement('span');
    mark.className = 'site-mark';
    mark.setAttribute('aria-hidden', 'true');

    var letter = document.createElement('span');
    letter.className = 'site-mark-letter';
    letter.textContent = firstChar(link.name);
    mark.appendChild(letter);

    // 真图标叠在色块上；加载成功才显示，失败就留着「色块 + 首字」
    var img = document.createElement('img');
    img.className = 'site-icon';
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = iconUrl(link.id);
    img.addEventListener('load', function () { mark.classList.add('has-icon'); });
    img.addEventListener('error', function () { img.remove(); });
    mark.appendChild(img);

    a.appendChild(mark);

    var name = document.createElement('span');
    name.className = 'site-name';
    name.textContent = link.name;
    a.appendChild(name);

    var tools = document.createElement('span');
    tools.className = 'site-tools';
    tools.innerHTML =
      '<button class="icon-btn" type="button" data-act="edit" title="编辑">' + ICON.edit + '</button>' +
      '<button class="icon-btn danger" type="button" data-act="del" title="删除">' + ICON.del + '</button>';
    a.appendChild(tools);

    tools.querySelector('[data-act="edit"]').addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      openLinkModal('edit', cat.id, link.id);
    });
    tools.querySelector('[data-act="del"]').addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      delLink(cat, link);
    });
    a.addEventListener('click', function (e) { if (state.editing) e.preventDefault(); });
    return a;
  }

  function renderBlock(cat, links, subText) {
    var sec = document.createElement('section');
    sec.className = 'block';

    var head = document.createElement('div');
    head.className = 'block-head';
    var dot = document.createElement('span');
    dot.className = 'block-dot';
    dot.setAttribute('aria-hidden', 'true');
    head.appendChild(dot);

    var title = document.createElement('h2');
    title.className = 'block-title';
    title.textContent = cat.name;
    head.appendChild(title);

    if (subText) {
      var sub = document.createElement('span');
      sub.className = 'block-sub';
      sub.textContent = subText;
      head.appendChild(sub);
    }

    var tools = document.createElement('span');
    tools.className = 'block-tools';
    if (state.editing) {
      var be = document.createElement('button');
      be.type = 'button'; be.className = 'icon-btn'; be.title = '重命名分类';
      be.innerHTML = ICON.edit;
      be.addEventListener('click', function () { openCatModal('edit', cat); });
      var bd = document.createElement('button');
      bd.type = 'button'; bd.className = 'icon-btn danger'; bd.title = '删除分类';
      bd.innerHTML = ICON.del;
      bd.addEventListener('click', function () { delCat(cat); });
      tools.appendChild(be); tools.appendChild(bd);
    }
    head.appendChild(tools);
    sec.appendChild(head);

    var grid = document.createElement('div');
    grid.className = 'sites';
    links.forEach(function (l) { grid.appendChild(siteLink(cat, l)); });

    if (state.editing && cat.id === state.selectedId && !state.query) {
      var add = document.createElement('button');
      add.type = 'button';
      add.className = 'site-add';
      add.innerHTML = ICON.plus + '<span>新增站点</span>';
      add.addEventListener('click', function () { openLinkModal('add', cat.id, null); });
      grid.appendChild(add);
    }
    sec.appendChild(grid);
    return sec;
  }

  /* ---------- 渲染主流程 ---------- */
  function render() {
    var q = state.query.trim().toLowerCase();
    renderNav(!!q);
    elGrid.textContent = '';
    var total = 0;

    if (q) {
      state.data.categories.forEach(function (cat) {
        var hit = cat.links.filter(function (l) {
          return (l.name + ' ' + l.url + ' ' + cat.name + ' ' + (l.desc || '')).toLowerCase().indexOf(q) !== -1;
        });
        if (!hit.length) return;
        total += hit.length;
        elGrid.appendChild(renderBlock(cat, hit, hit.length + ' 个结果'));
      });
      elEmpty.hidden = total !== 0;
      elEmpty.textContent = '没有匹配的结果';
      elAddCat.hidden = true;
      return;
    }

    if (!state.data.categories.length) {
      elEmpty.hidden = false;
      elEmpty.textContent = state.editing ? '还没有分类，点下面的「新增分类」开始' : '还没有任何分类';
      elAddCat.hidden = !state.editing;
      return;
    }
    var cat = catById(state.selectedId) || state.data.categories[0];
    state.selectedId = cat.id;
    elGrid.appendChild(renderBlock(cat, cat.links, cat.links.length + ' 个站点'));
    elEmpty.hidden = true;
    elAddCat.hidden = !state.editing;
  }

  /* ---------- 切换分类 ---------- */
  function selectCat(id, push) {
    if (!catById(id)) return;
    state.selectedId = id;
    if (state.query) { state.query = ''; elQ.value = ''; elSearchBox.classList.remove('has-value'); }
    if (push) {
      var h = HASH_PREFIX + id;
      if (location.hash !== h) { location.hash = h; return; } // 交给 hashchange 去 render
    }
    render();
  }

  window.addEventListener('hashchange', function () {
    var id = parseHash();
    var first = state.data.categories[0];

    if (id === null) {
      state.selectedId = first ? first.id : null;
      render();
      return;
    }
    var cat = catById(id);
    if (cat) { state.selectedId = cat.id; render(); return; }
    // 无效 hash（例如分类在别的设备上被删了，书签还指着它）：回落到第一个并修好地址
    if (!first) { render(); return; }
    state.selectedId = first.id;
    history.replaceState(null, '', location.pathname + location.search + HASH_PREFIX + first.id);
    render();
  });

  /* ---------- 增删改 ---------- */
  function delLink(cat, link) {
    cat.links = cat.links.filter(function (l) { return l.id !== link.id; });
    setDirty(true);
    render();
  }
  function delCat(cat) {
    state.data.categories = state.data.categories.filter(function (c) { return c.id !== cat.id; });
    var first = state.data.categories[0];
    var next = first ? first.id : null;
    state.selectedId = next;
    if (next) {
      var h = HASH_PREFIX + next;
      if (location.hash !== h) location.hash = h;
    } else {
      history.replaceState(null, '', location.pathname + location.search);
    }
    setDirty(true);
    render();
  }

  /* ---------- 弹窗：链接 ---------- */
  function paintIconPreview() {
    elIconPreview.textContent = '';
    elIconPreview.classList.remove('is-empty');
    var src = null;
    if (linkTarget.pendingIcon) {
      src = URL.createObjectURL(linkTarget.pendingIcon);
    } else if (!linkTarget.clearIcon && linkTarget.mode === 'edit') {
      src = iconUrl(linkTarget.id);
    }
    if (!src) {
      elIconPreview.classList.add('is-empty');
      var letter = document.createElement('span');
      letter.textContent = firstChar(elLnName.value);
      elIconPreview.appendChild(letter);
      elIconHint.textContent = '留空则自动抓取网站图标';
      return;
    }
    var img = document.createElement('img');
    img.alt = '';
    img.src = src;
    elIconPreview.appendChild(img);
  }

  function openLinkModal(mode, catId, linkId) {
    var link = null;
    if (mode === 'edit') {
      var cat = catById(catId);
      link = cat.links.filter(function (l) { return l.id === linkId; })[0];
    }
    linkTarget = {
      mode: mode,
      catId: catId,
      linkId: linkId,
      id: mode === 'add' ? uid() : linkId, // 新增时先定 id，图标才有地方放
      pendingIcon: null,
      clearIcon: false
    };
    elLinkTitle.textContent = mode === 'edit' ? '编辑站点' : '新增站点';
    elLnName.value = link ? link.name : '';
    elLnUrl.value = link ? link.url : '';
    elLnDesc.value = link && link.desc ? link.desc : '';
    elIconFile.value = '';
    elIconHint.textContent = '留空则自动抓取网站图标';
    paintIconPreview();
    elLinkModal.classList.add('is-open');
    elLnName.focus();
  }

  function closeLinkModal() { elLinkModal.classList.remove('is-open'); linkTarget = null; }

  /* 把弹窗里选的图标落到服务端；返回 Promise<null | 错误文案> */
  function applyIconChange(id) {
    if (!linkTarget.pendingIcon && !linkTarget.clearIcon) return Promise.resolve(null);
    var url = ICON_API + '?id=' + encodeURIComponent(id);
    var opts = { headers: {} };
    if (linkTarget.pendingIcon) {
      var f = linkTarget.pendingIcon;
      if (f.size > MAX_ICON_BYTES) return Promise.resolve('图片太大（上限 512 KB）');
      opts.method = 'POST';
      opts.headers['Content-Type'] = f.type || 'image/x-icon';
      opts.body = f;
    } else {
      opts.method = 'DELETE';
    }
    return fetch(url, opts).then(function (r) {
      if (r.status === 401) return '登录已失效，请重新登录';
      if (!r.ok) return r.json().catch(function () { return {}; })
        .then(function (j) { return '图标上传失败：' + (j.error || r.status); });
      iconVer[id] = Date.now(); // 让浏览器重新拉这张图
      return null;
    }).catch(function () { return '图标上传失败：连不上服务'; });
  }

  /* ---------- 弹窗：分类 ---------- */
  function openCatModal(mode, cat) {
    catTarget = { mode: mode, catId: cat ? cat.id : null, color: cat ? (cat.color || 1) : nextColor() };
    elCatTitle.textContent = mode === 'edit' ? '重命名分类' : '新增分类';
    elCatName.value = cat ? cat.name : '';
    buildSwatches();
    elCatModal.classList.add('is-open');
    elCatName.focus();
  }
  function closeCatModal() { elCatModal.classList.remove('is-open'); catTarget = null; }
  function buildSwatches() {
    elCatSwatches.textContent = '';
    var make = function (n) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.style.background = 'var(--cat-' + n + ')';
      b.setAttribute('aria-label', '识别色 ' + n);
      b.setAttribute('aria-pressed', String(catTarget.color === n));
      b.addEventListener('click', function () { catTarget.color = n; buildSwatches(); });
      elCatSwatches.appendChild(b);
    };
    for (var n = 1; n <= PALETTE_SIZE; n++) make(n);
  }

  /* ---------- 登录 ---------- */
  function showGate(message) {
    elPage.hidden = true;
    elGate.hidden = false;
    elGateErr.hidden = !message;
    if (message) elGateErr.textContent = message;
    elGatePwd.value = '';
    elGateUsername.focus();
  }

  function applyData(data) {
    state.data = data && data.categories ? data : { version: 1, categories: [] };
    var fromHash = parseHash();
    if (fromHash && catById(fromHash)) {
      state.selectedId = fromHash;
    } else {
      state.selectedId = state.data.categories.length ? state.data.categories[0].id : null;
    }
    try { elEngine.value = localStorage.getItem(preferenceKey()) || 'bing'; } catch (_) { elEngine.value = 'bing'; }
    if (elEngine.value !== 'local' && !engines[elEngine.value]) elEngine.value = 'bing';
    setDirty(false);
    updateSearch();
  }

  function requestJson(url, method, body) {
    return fetch(url, { method: method, credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        return { status: r.status, ok: r.ok, json: j };
      });
    });
  }

  function closeAccountsModal() {
    elAccountsModal.classList.remove('is-open');
    elAccountForm.reset(); elResetForm.reset(); elResetForm.hidden = true;
    resetUsername = null;
  }

  function clearAccountState() {
    closeImport();
    state.user = null;
    state.data = { version: 1, categories: [] };
    state.editing = false; state.selectedId = null; state.query = '';
    iconVer = {};
    elQ.value = ''; elSearchBox.classList.remove('has-value');
    elAccountName.textContent = ''; elManageAccounts.hidden = true;
    elCatnav.textContent = ''; elGrid.textContent = '';
    elEditToggle.setAttribute('aria-pressed', 'false'); elEditLabel.textContent = '编辑';
    document.body.classList.remove('edit-mode');
    closeLinkModal(); closeCatModal(); closeAccountsModal();
    elAccountsList.textContent = '';
    elSave.disabled = false; elSave.textContent = '保存';
    setDirty(false);
  }

  function expired(message) { clearAccountState(); showGate(message || '登录已失效，请重新登录'); }

  function loadData() {
    var owner = state.user;
    return api('GET').then(function (r) {
      if (owner !== state.user) return;
      if (r.status === 401) { expired(); return; }
      if (!r.ok || !r.json || !r.json.data) throw new Error('读取数据失败（' + r.status + '）');
      applyData(r.json.data);
      elGate.hidden = true; elPage.hidden = false;
    });
  }

  function enterAccount(user) {
    clearAccountState();
    state.user = user;
    elAccountName.textContent = user.username;
    elManageAccounts.hidden = user.role !== 'admin';
    // Clear the previous account's category from the address bar.
    history.replaceState(null, '', location.pathname + location.search);
    return loadData();
  }

  elGateForm.addEventListener('submit', function (e) {
    e.preventDefault();
    elGateSubmit.disabled = true;
    requestJson(SESSION_API, 'POST', { username: elGateUsername.value.trim(), password: elGatePwd.value })
      .then(function (r) {
        elGatePwd.value = '';
        if (!r.ok) { showGate(r.json.error || '登录失败'); return; }
        return enterAccount(r.json.user);
      }).catch(function (err) { expired(err.message || '连不上服务'); })
      .finally(function () { elGateSubmit.disabled = false; });
  });

  elLogout.addEventListener('click', function () {
    elLogout.disabled = true;
    requestJson(SESSION_API, 'DELETE').then(function (r) {
      if (!r.ok) throw new Error('退出失败，请重试');
      history.replaceState(null, '', location.pathname + location.search);
      expired(''); elGateErr.hidden = true;
    }).catch(function (err) { window.alert(err.message || '退出失败，请检查网络后重试'); })
      .finally(function () { elLogout.disabled = false; });
  });

  function renderAccounts(users) {
    elAccountsList.textContent = '';
    users.forEach(function (user) {
      var row = document.createElement('div'); row.className = 'account-row';
      var name = document.createElement('span'); name.className = 'account-row-name';
      name.textContent = user.username + (user.role === 'admin' ? ' · 管理员' : '') + (user.disabled ? ' · 已停用' : '');
      row.appendChild(name);
      var reset = document.createElement('button'); reset.type = 'button'; reset.className = 'btn-ghost';
      reset.textContent = '重置密码';
      reset.addEventListener('click', function () {
        if (accountBusy) return;
        resetUsername = user.username; elResetForm.hidden = false;
        $('reset-password-title').textContent = '重置 ' + user.username + ' 的密码';
        $('reset-password').value = ''; $('reset-password').focus();
      });
      row.appendChild(reset);
      if (user.role !== 'admin') {
        var toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'btn-ghost';
        toggle.textContent = user.disabled ? '启用' : '停用';
        toggle.addEventListener('click', function () {
          if (accountBusy) return;
          mutateAccounts('PATCH', { username: user.username, action: 'status', disabled: !user.disabled });
        });
        row.appendChild(toggle);
      }
      elAccountsList.appendChild(row);
    });
  }

  function mutateAccounts(method, body) {
    var owner = state.user;
    if (accountBusy) return;
    accountBusy = true;
    elAccountsMessage.textContent = '正在保存…';
    Array.prototype.forEach.call(elAccountsModal.querySelectorAll('button'), function (b) { b.disabled = true; });
    requestJson(ACCOUNTS_API, method, body).then(function (r) {
      if (owner !== state.user) return;
      if (r.status === 401) { expired(); return; }
      if (!r.ok) { elAccountsMessage.textContent = r.json.error || '操作失败'; return; }
      if (r.json.reauthenticate) { expired('密码已更新，请重新登录'); return; }
      renderAccounts(r.json.users); elAccountForm.reset(); elResetForm.reset(); elResetForm.hidden = true;
      elAccountsMessage.textContent = '已保存';
    }).catch(function () { elAccountsMessage.textContent = '操作失败：连不上服务'; })
      .finally(function () {
        accountBusy = false;
        Array.prototype.forEach.call(elAccountsModal.querySelectorAll('button'), function (b) { b.disabled = false; });
      });
  }

  elManageAccounts.addEventListener('click', function () {
    elAccountsMessage.textContent = '正在读取账号…'; elAccountsList.textContent = '';
    elAccountsModal.classList.add('is-open');
    requestJson(ACCOUNTS_API, 'GET').then(function (r) {
      if (r.status === 401) { expired(); return; }
      if (!r.ok) { elAccountsMessage.textContent = r.json.error || '读取失败'; return; }
      renderAccounts(r.json.users); elAccountsMessage.textContent = '';
    }).catch(function () { elAccountsMessage.textContent = '读取失败：连不上服务'; });
  });
  elAccountForm.addEventListener('submit', function (e) {
    e.preventDefault();
    mutateAccounts('POST', { username: $('new-username').value.trim(), password: $('new-password').value });
  });
  elResetForm.addEventListener('submit', function (e) {
    e.preventDefault();
    mutateAccounts('PATCH', { username: resetUsername, action: 'password', password: $('reset-password').value });
  });
  $('cancel-reset').addEventListener('click', function () { elResetForm.hidden = true; elResetForm.reset(); resetUsername = null; });

  elEditToggle.addEventListener('click', function () {
    state.editing = !state.editing;
    elEditToggle.setAttribute('aria-pressed', String(state.editing));
    elEditLabel.textContent = state.editing ? '完成' : '编辑';
    document.body.classList.toggle('edit-mode', state.editing);
    render();
  });

  elQ.addEventListener('input', function () {
    state.query = elEngine.value === 'local' ? elQ.value : '';
    elSearchBox.classList.toggle('has-value', !!elQ.value);
    render();
  });
  elQClear.addEventListener('click', function () {
    elQ.value = ''; state.query = '';
    elSearchBox.classList.remove('has-value');
    elQ.focus();
    render();
  });
  elEngine.addEventListener('change', function () {
    if (state.user) { try { localStorage.setItem(preferenceKey(), elEngine.value); } catch (_) {} }
    updateSearch();
  });
  $('search-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var query = elQ.value.trim();
    if (query && engines[elEngine.value]) window.open(engines[elEngine.value] + encodeURIComponent(query), '_blank', 'noopener,noreferrer');
    else updateSearch();
  });
  elQ.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      elQ.value = ''; state.query = '';
      elSearchBox.classList.remove('has-value');
      render(); elQ.blur();
    }
  });

  elAddCat.addEventListener('click', function () { openCatModal('add', null); });

  // 名称边打边更新兜底首字
  elLnName.addEventListener('input', function () {
    if (linkTarget && !linkTarget.pendingIcon && (linkTarget.mode === 'add' || linkTarget.clearIcon)) paintIconPreview();
  });
  elIconFile.addEventListener('change', function () {
    if (!linkTarget) return;
    var f = elIconFile.files && elIconFile.files[0];
    if (!f) return;
    linkTarget.pendingIcon = f;
    linkTarget.clearIcon = false;
    elIconHint.textContent = '已选择：' + f.name + '（' + Math.round(f.size / 1024) + ' KB），点确定后上传';
    paintIconPreview();
  });
  elIconClear.addEventListener('click', function () {
    if (!linkTarget) return;
    linkTarget.pendingIcon = null;
    linkTarget.clearIcon = true;
    elIconFile.value = '';
    elIconHint.textContent = '已改回自动抓取（手动图标会被删除）';
    paintIconPreview();
  });

  elLinkForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var url = elLnUrl.value.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    var cat = catById(linkTarget.catId);
    if (!cat) return;
    var target = linkTarget;
    var owner = state.user;
    var id = target.mode === 'add' ? target.id : target.linkId;

    applyIconChange(id).then(function (err) {
      if (owner !== state.user || target !== linkTarget) return;
      if (err) { elIconHint.textContent = err; return; } // 图标失败就不关弹窗
      if (target.mode === 'add') {
        cat.links.push({ id: id, name: elLnName.value.trim(), url: url, desc: elLnDesc.value.trim() });
      } else {
        cat.links = cat.links.map(function (l) {
          if (l.id !== target.linkId) return l;
          return { id: l.id, name: elLnName.value.trim(), url: url, desc: elLnDesc.value.trim() };
        });
      }
      setDirty(true);
      closeLinkModal();
      render();
    });
  });

  elCatForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = elCatName.value.trim();
    if (!name) return;
    var newId = null;
    if (catTarget.mode === 'add') {
      newId = uid();
      state.data.categories.push({ id: newId, name: name, color: catTarget.color, links: [] });
    } else {
      var cat = catById(catTarget.catId);
      cat.name = name;
      cat.color = catTarget.color;
    }
    setDirty(true);
    closeCatModal();
    if (newId) { selectCat(newId, true); } else { render(); }
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-close]'), function (btn) {
    btn.addEventListener('click', function () { closeLinkModal(); closeCatModal(); closeAccountsModal(); });
  });
  [elLinkModal, elCatModal, elAccountsModal].forEach(function (m) {
    m.addEventListener('click', function (e) {
      if (e.target === m) { closeLinkModal(); closeCatModal(); closeAccountsModal(); }
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeLinkModal(); closeCatModal(); closeAccountsModal(); }
  });

  elSave.addEventListener('click', function () {
    var owner = state.user;
    elSave.disabled = true;
    elSave.textContent = '保存中';
    api('POST', state.data).then(function (r) {
      if (owner !== state.user) return;
      elSave.disabled = false;
      elSave.textContent = '保存';
      if (r.status === 401) { expired(); return; }
      if (!r.ok) { elSavebarText.textContent = '保存失败（' + r.status + '）'; return; }
      setDirty(false);
    }).catch(function () {
      elSave.disabled = false;
      elSave.textContent = '保存';
      if (owner === state.user) elSavebarText.textContent = '保存失败：连不上服务';
    });
  });

  elDiscard.addEventListener('click', function () { loadData().catch(function (err) { elSavebarText.textContent = err.message; }); });

  $('import-bookmarks').addEventListener('click', function () {
    if (elSave.disabled) return;
    closeImport(); elSave.disabled = true; elDiscard.disabled = true; $('bookmark-file').value = ''; $('import-summary').textContent = '';
    $('import-preview').textContent = ''; $('import-modal').classList.add('is-open'); $('bookmark-file').focus();
  });
  $('import-cancel').addEventListener('click', function () { closeImport(); $('import-bookmarks').focus(); });
  $('import-modal').addEventListener('click', function (e) { if (e.target === this) closeImport(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeImport(); });
  $('bookmark-file').addEventListener('change', async function () {
    var revision = ++importRevision, owner = state.user, file = this.files[0];
    importPlan = null; $('import-confirm').disabled = true; $('import-preview').textContent = '';
    if (!file) return;
    $('import-summary').textContent = '正在读取…';
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('文件超过 10 MB，请分批导出');
      var html = await file.text();
      if (revision !== importRevision || owner !== state.user) return;
      importPlan = BookmarkImport.plan(state.data, BookmarkImport.parse(html));
      var stats = importPlan.stats;
      $('import-summary').textContent = '新增 ' + stats.added + ' 个站点、' + stats.categories + ' 个分类；跳过重复 ' + stats.duplicate + ' 个、无效 ' + stats.invalid + ' 个（仅支持 HTTP/HTTPS，网址最长 4096 字符）；名称截短 ' + stats.truncated + ' 个。空文件夹不导入。';
      importPlan.data.categories.forEach(function (cat) {
        var previous = catById(cat.id), count = cat.links.length - (previous ? previous.links.length : 0);
        if (!count) return;
        var item = document.createElement('li'); item.textContent = cat.name + '：新增 ' + count + ' 个站点';
        $('import-preview').appendChild(item);
      });
      $('import-confirm').disabled = !stats.added;
    } catch (err) { if (revision === importRevision && owner === state.user) $('import-summary').textContent = err.message; }
  });
  $('import-confirm').addEventListener('click', function () {
    if (!importPlan || !state.user) return;
    state.data = importPlan.data;
    if (!state.selectedId && state.data.categories.length) state.selectedId = state.data.categories[0].id;
    state.editing = true; document.body.classList.add('edit-mode');
    elEditToggle.setAttribute('aria-pressed', 'true'); elEditLabel.textContent = '完成';
    closeImport(); setDirty(true); render(); $('import-bookmarks').focus();
  });

  /* ---------- 启动 ---------- */
  // Remove the legacy plaintext passphrase; authentication now lives in an HttpOnly cookie.
  try { localStorage.removeItem('nav-password'); } catch (e) {}
  requestJson(SESSION_API, 'GET').then(function (r) {
    if (!r.ok) { showGate(''); return; }
    state.user = r.json.user;
    elAccountName.textContent = state.user.username;
    elManageAccounts.hidden = state.user.role !== 'admin';
    return loadData();
  }).catch(function (err) { expired(err.message || '连不上服务'); });
})();
