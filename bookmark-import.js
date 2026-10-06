(function (root) {
  'use strict';
  function normalize(url) {
    try {
      var parsed = new URL(url);
      return /^(https?):$/.test(parsed.protocol) && parsed.href.length <= 4096 ? parsed.href : null;
    } catch (_) { return null; }
  }
  function parse(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    if (!doc.querySelector('dl')) throw new Error('请选择 Edge 等浏览器导出的 HTML 书签文件');
    var entries = [];
    // Browser exports omit DT closing tags. Follow document order and DL ancestry,
    // rather than assuming each folder's list is a sibling of its heading.
    Array.from(doc.querySelectorAll('a')).forEach(function (a) {
      var path = [];
      var list = a.closest('dl');
      if (!list) return;
      for (var parent = list; parent; parent = parent.parentElement && parent.parentElement.closest('dl')) {
        var heading = parent.previousElementSibling;
        if (heading && heading.tagName === 'P') heading = heading.previousElementSibling;
        if (!heading || heading.tagName !== 'H3') {
          var container = parent.parentElement;
          if (container && container.tagName === 'DT') heading = Array.from(container.children).find(function (el) { return el.tagName === 'H3'; });
        }
        if (heading && heading.tagName === 'H3') path.unshift(heading.textContent.trim() || '未命名文件夹');
      }
      entries.push({ category: path.join(' / ') || '导入书签', name: a.textContent.trim(), url: a.getAttribute('href') || '' });
    });
    if (!entries.length) throw new Error('文件中没有可导入的书签');
    return entries;
  }
  function plan(data, entries) {
    var result = JSON.parse(JSON.stringify(data));
    var stats = { added: 0, duplicate: 0, invalid: 0, truncated: 0, categories: 0 };
    var used = new Set();
    result.categories.forEach(function (c) { used.add(c.id); c.links.forEach(function (l) { used.add(l.id); }); });
    function id() {
      var value;
      do { value = 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12); } while (used.has(value));
      used.add(value); return value;
    }
    var seen = new Map();
    result.categories.forEach(function (c) { seen.set(c.id, new Set(c.links.map(function (l) { return normalize(l.url); }))); });
    entries.forEach(function (entry) {
      var url = normalize(entry.url);
      if (!url) { stats.invalid++; return; }
      var category = entry.category.trim() || '导入书签';
      var name = entry.name.trim() || new URL(url).hostname;
      if (category.length > 40 || name.length > 200) stats.truncated++;
      category = category.slice(0, 40); name = name.slice(0, 200);
      var cat = result.categories.find(function (c) { return c.name === category; });
      if (!cat) {
        cat = { id: id(), name: category, color: result.categories.length % 8 + 1, links: [] };
        result.categories.push(cat); seen.set(cat.id, new Set()); stats.categories++;
      }
      if (seen.get(cat.id).has(url)) { stats.duplicate++; return; }
      seen.get(cat.id).add(url);
      cat.links.push({ id: id(), name: name, url: url, desc: '' }); stats.added++;
    });
    if (result.categories.length > 200 || result.categories.some(function (c) { return c.links.length > 2000; })) {
      throw new Error('导入后超过容量（最多 200 个分类，每分类 2000 个站点），请精简文件后重试；本次未导入');
    }
    return { data: result, stats: stats };
  }
  root.BookmarkImport = { parse: parse, plan: plan, normalize: normalize };
})(globalThis);
