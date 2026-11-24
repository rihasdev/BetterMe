import { readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
async function walk(dir) {
  const paths = await readdir(dir, {withFileTypes:true});
  return (await Promise.all(paths.map(x => x.isDirectory() ? walk(dir+'/'+x.name) : dir+'/'+x.name))).flat();
}
const assets = (await walk('dist')).filter(x=>!x.endsWith('/sw.js')).map(x=>x.slice(4)).sort();
const version = createHash('sha256').update(assets.join('|')+Date.now()).digest('hex').slice(0,12);
await writeFile('dist/sw.js', `const CACHE='betterme-${version}', ASSETS=${JSON.stringify(assets)};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('betterme-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==self.location.origin)return;
  if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.open(CACHE).then(c=>c.match('/index.html'))));return;}
  if(ASSETS.includes(u.pathname))e.respondWith(caches.open(CACHE).then(c=>c.match(u.pathname)).then(r=>r||fetch(e.request)));
});`);
