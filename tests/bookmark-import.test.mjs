import test from 'node:test';
import assert from 'node:assert/strict';
import '../bookmark-import.js';
const { plan, normalize } = globalThis.BookmarkImport;
const empty = () => ({version: 1, categories: []});
const entry = (category, url, name = 'Example') => ({category, url, name});
test('same-category normalized duplicates preserve existing fields; other categories and query/hash/protocol differences survive', () => {
  const data = {version: 1, categories: [{id:'cat',name:'Work',color:7,links:[{id:'old',name:'Original',url:'https://example.com'}]}]};
  const snapshot = JSON.stringify(data);
  const result = plan(data, [entry('Work','https://EXAMPLE.com/'),entry('Other','https://example.com'),entry('Work','http://example.com'),entry('Work','https://example.com/?q=1'),entry('Work','https://example.com/#part')]);
  assert.equal(result.stats.duplicate,1); assert.equal(result.stats.added,4);
  assert.equal(result.data.categories[0].color,7); assert.equal(result.data.categories[0].links[0].name,'Original');
  assert.equal(JSON.stringify(data),snapshot);
});
test('invalid protocols/URLs are skipped, names truncated, blank names get hostname, identifiers are unique', () => {
  const result = plan(empty(), [entry('a','javascript:alert(1)'),entry('a','file:///test'),entry('a','broken'),entry('x'.repeat(41),'https://example.com','n'.repeat(201)),entry('','https://other.com','')]);
  assert.equal(result.stats.invalid,3); assert.equal(result.stats.truncated,1);
  assert.equal(result.data.categories[0].name.length,40); assert.equal(result.data.categories[0].links[0].name.length,200);
  assert.equal(result.data.categories[1].name,'导入书签'); assert.equal(result.data.categories[1].links[0].name,'other.com');
  const ids=result.data.categories.flatMap(c=>[c.id,...c.links.map(l=>l.id)]);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(normalize('https://example.com/'+'a'.repeat(4096)),null);
});
test('over-capacity imports reject atomically, exact limits succeed', () => {
  const data = {version:1,categories:Array.from({length:200},(_,i)=>({id:'c'+i,name:'c'+i,color:1,links:[]}))};
  assert.throws(()=>plan(data,[entry('new','https://example.com')]),/容量/);
  assert.equal(data.categories.length,200);
  assert.equal(plan(data,[entry('c0','https://example.com')]).stats.added,1);
  const batch = Array.from({length:2000},(_,i)=>entry('one','https://example.com/'+i));
  assert.equal(plan(empty(),batch).stats.added,2000);
  assert.throws(()=>plan(empty(),[...batch,entry('one','https://other.com')]),/容量/);
});
