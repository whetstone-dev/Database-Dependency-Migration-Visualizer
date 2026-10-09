'use strict';
const STATE = JSON.parse(document.getElementById('dbdep-state').textContent);
const M = STATE.model, NS = 'http://www.w3.org/2000/svg', CAP = 350;
const $ = id => document.getElementById(id);
const nodes = new Map(M.nodes.map(n => [n.id, n])), edges = new Map(M.edges.map(e => [e.id, e]));
const evidence = new Map(M.evidence.map(e => [e.id, e]));
const reverse = new Map();
M.edges.forEach(e => {if (!reverse.has(e.target)) reverse.set(e.target, []); reverse.get(e.target).push(e);});
let selected = STATE.root || null, zoom = 1, panX = 0, panY = 0, drag = null;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
document.addEventListener('keydown', () => document.body.classList.add('keyboard-mode'));
document.addEventListener('pointerdown', () => document.body.classList.remove('keyboard-mode'));
function el(tag, text, cls, parent) {const n = document.createElement(tag); if (text !== null) n.textContent = text; if (cls) n.className = cls; if (parent) parent.append(n); return n;}
function svg(tag, attrs, text) {const n = document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v)); if(text!==undefined)n.textContent=text;return n;}
// Store one BFS predecessor per object rather than all O(N²) path arrays.
function reach(root) {const paths=new Map([[root,null]]),q=[root];for(let i=0;i<q.length;i++){for(const e of reverse.get(q[i])||[]){if(!paths.has(e.source)){paths.set(e.source,e.id);q.push(e.source);}}}paths.delete(root);return paths;}
function pathPreview(id, paths){const result=[];let steps=0;while(paths.has(id)){const eid=paths.get(id);if(result.length<16)result.push(eid);id=edges.get(eid).target;steps++;}return {edges:result,steps};}
function options(id,key){[...new Set(M.nodes.map(n=>n[key]))].sort().forEach(v=>{const o=el('option',v,null,$(id));o.value=v;});}
options('schema','schema');options('kind','kind');options('status','status');
for (const [key,label] of [['nodes','OBJECTS'],['edges','RELATIONS'],['findings','FINDINGS'],['unknowns','UNKNOWNS']]) {const d=el('div',null,'stat',$('stats'));el('strong',String(STATE.summary[key]),null,d);el('span',label,null,d);}
function transform(){$('scene').setAttribute('transform',`translate(${panX},${panY}) scale(${zoom})`);}
function draw(){
  const paths=selected?reach(selected):new Map(), direct=new Set((reverse.get(selected)||[]).map(e=>e.source));
  const text=$('search').value.toLowerCase(), depth=$('depth').value;
  const filtered=M.nodes.filter(n=>(!text||n.qualified_name.toLowerCase().includes(text)||n.id.toLowerCase().includes(text))&&(!$('schema').value||n.schema===$('schema').value)&&(!$('kind').value||n.kind===$('kind').value)&&(!$('status').value||n.status===$('status').value)&&(depth==='all'||n.id===selected||(depth==='direct'?direct.has(n.id):paths.has(n.id))));
  const shown=filtered.slice(0,CAP), pos=new Map();
  const schemas=[...new Set(shown.map(n=>n.schema))].sort(), allSchemas=[...new Set(filtered.map(n=>n.schema))].sort();let row=0;
  const scene=$('scene');scene.replaceChildren();
  for(const schema of schemas){scene.append(svg('text',{x:20,y:row*78+20,class:'schema-title'},schema.toUpperCase()));row++;
    const group=shown.filter(n=>n.schema===schema);group.forEach((n,i)=>pos.set(n.id,{x:20+(i%5)*256,y:(row+Math.floor(i/5))*78}));row+=Math.ceil(group.length/5)+1;}
  $('cap').textContent=!filtered.length?'No matching objects. Clear search or filters to explore the snapshot.':filtered.length>CAP?`Showing ${CAP} of ${filtered.length} matching objects. Schema totals: ${allSchemas.map(s=>s+': '+filtered.filter(n=>n.schema===s).length).join(', ')}. Narrow filters to inspect all objects; full JSON is preserved.`:`${shown.length} visible objects · ${paths.size} potential dependents · ${M.unknowns.length} unknowns`;
  const activeEdges=new Set(paths.values());
  M.edges.forEach(e=>{if(!pos.has(e.source)||!pos.has(e.target))return;const a=pos.get(e.source),b=pos.get(e.target);const path=svg('path',{d:`M${a.x+119},${a.y+57} C${a.x+119},${a.y+90} ${b.x+119},${b.y-20} ${b.x+119},${b.y}`,class:`edge ${e.kind==='foreign_key'?'fk':e.status==='PARSED'?'parsed':''} ${activeEdges.has(e.id)?'active':''}`});path.append(svg('title',{},`${e.kind} · ${e.status} · ${e.explanation}`));scene.append(path);});
  const changed=new Set(STATE.changes?[...STATE.changes.added,...STATE.changes.removed,...STATE.changes.modified]:[]);
  shown.forEach(n=>{const p=pos.get(n.id),g=svg('g',{class:`node ${n.id===selected?'selected':paths.has(n.id)?'affected':''} ${changed.has(n.id)?'changed':''}`,transform:`translate(${p.x},${p.y})`,tabindex:0,role:'button','aria-label':`${n.qualified_name}, ${n.kind}, ${n.status}`,'data-id':n.id});
    const label=n.kind==='column'?`${n.parent}.${n.name}`:n.kind==='query'?n.name.split(':ev:')[0].split('/').slice(-2).join('/'):n.name;
    g.append(svg('rect',{width:238,height:58,rx:2}),svg('text',{x:10,y:23},label.length>27?label.slice(0,24)+'…':label),svg('text',{x:10,y:43,class:'sub'},`${n.kind} / ${n.status}`),svg('title',{},n.qualified_name));g.addEventListener('click',()=>choose(n.id));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(n.id);}});scene.append(g);});
  const height=Math.max(780,row*78);$('graph').setAttribute('viewBox',`0 0 1300 ${height}`);transform();
}
function choose(id){selected=id;draw();inspect();const n=[...document.querySelectorAll('.node')].find(n=>n.getAttribute('data-id')===id);if(n)n.focus();}
function inspect(){const detail=$('detail');detail.replaceChildren();if(!selected||!nodes.has(selected)){el('h2','Select an object',null,detail);return;}const n=nodes.get(selected),paths=reach(selected);
  el('p','EVIDENCE INSPECTOR','eyebrow',detail);el('h2',n.qualified_name,null,detail);el('p',`${n.kind} · ${n.status} · ${paths.size} potential dependents`,null,detail);el('p',n.id,null,detail);
  for(const eid of n.evidence_ids){const e=evidence.get(eid),d=el('div',null,'evidence',detail);el('strong',e.status+' / '+e.origin,null,d);el('p',e.path?`${e.path}:${e.line_start}–${e.line_end}`:`${e.query_id} · ${e.captured_at} · ${e.catalog_address||''}`,null,d);el('p',e.explanation,null,d);el('p',e.source_hash,null,d);}
  el('h3','Dependency paths',null,detail);
  let displayed=0;
  for(const id of paths.keys()){if(displayed++>=40)break;const path=pathPreview(id,paths),d=el('div',null,'path',detail);const btn=el('button',nodes.get(id).qualified_name,null,d);btn.addEventListener('click',()=>choose(id));for(const eid of path.edges){const e=edges.get(eid);el('p',`${nodes.get(e.source).qualified_name} → ${nodes.get(e.target).qualified_name} (${e.kind}, ${e.status})`,null,d);el('p',e.evidence_ids.map(id=>{const ev=evidence.get(id);return ev.path?`${ev.path}:${ev.line_start}`:`${ev.query_id} / ${ev.catalog_address||''}`;}).join('; '),null,d);}if(path.steps>16)el('p',`${path.steps-16} further path steps omitted from this preview. Use CLI impact for the complete path.`,null,d);}
  if(paths.size>40)el('p',`Showing 40 of ${paths.size} paths. Use search to select another object or CLI impact for all complete paths.`,null,detail);
  el('h3','Unknown coverage',null,detail);M.unknowns.forEach(u=>el('p',u.explanation,'unknown',detail));
}
function findings(){const list=$('finding-list');list.replaceChildren();const risk=$('risk').value;for(const f of M.findings.filter(f=>!risk||f.risk_level===risk)){const d=el('article',null,`finding ${f.risk_level}`,list);el('h3',`${f.rule_id} · ${f.risk_level.toUpperCase()} · ${f.status}`,null,d);el('p',f.reason,null,d);el('p',f.remediation,null,d);el('p',`${f.risk_dimensions.join(', ')} · ${f.evidence_ids.join(', ')}`,'evidence',d);}if(!M.findings.length)el('p','No migration findings. A schema graph alone is not a safety approval.',null,list);}
M.unknowns.forEach(u=>el('p','UNKNOWN / '+u.explanation,'unknown',$('unknown-list')));
if(STATE.changes){for(const key of ['added','removed','modified']){el('h3',key.toUpperCase(),null,$('change-list'));STATE.changes[key].forEach(id=>el('p',nodes.has(id)?nodes.get(id).qualified_name:id,null,$('change-list')));}STATE.changes.rename_candidates.forEach(c=>el('p',c.explanation,'unknown',$('change-list')));}
STATE.plan.forEach((p,i)=>{const d=el('article',null,'phase',$('phase-list'));el('h2',`${i+1}. ${p.phase}`,null,d);const content=el('div',null,null,d);el('p',p.action,null,content);for(const [k,label] of [['preconditions','Preconditions'],['verification','Verification'],['recovery','Recovery']]){el('h3',label,null,content);el('p',p[k],null,content);}});
if(!STATE.plan.length)el('p','Review a proposed migration to produce a phased sequence.',null,$('phase-list'));
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',e=>{document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));for(const id of ['explorer','findings','sequence'])$(id).hidden=id!==b.dataset.tab;if(e.detail>0&&!reducedMotion.matches)$(b.dataset.tab).animate([{opacity:.5,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:160,easing:'cubic-bezier(0.23, 1, 0.32, 1)'});}));
for(const id of ['search','schema','kind','status','depth'])$(id).addEventListener(id==='search'?'input':'change',draw);
$('risk').addEventListener('change',findings);
function scale(f){zoom=Math.min(4,Math.max(.25,zoom*f));transform();}
$('zoom-in').addEventListener('click',()=>scale(1.2));$('zoom-out').addEventListener('click',()=>scale(1/1.2));$('reset').addEventListener('click',()=>{zoom=1;panX=panY=0;transform();});
$('graph').addEventListener('wheel',e=>{e.preventDefault();scale(e.deltaY<0?1.1:1/1.1);},{passive:false});
$('graph').addEventListener('keydown',e=>{const steps={ArrowLeft:[30,0],ArrowRight:[-30,0],ArrowUp:[0,30],ArrowDown:[0,-30]};if(steps[e.key]){e.preventDefault();panX+=steps[e.key][0];panY+=steps[e.key][1];transform();}if(e.key==='+'||e.key==='=')scale(1.2);if(e.key==='-')scale(1/1.2);});
$('graph').addEventListener('pointerdown',e=>{if(drag||e.target.closest('.node'))return;drag=[e.clientX,e.clientY,panX,panY];$('graph').setPointerCapture(e.pointerId);});
$('graph').addEventListener('pointermove',e=>{if(!drag)return;const box=$('graph').getBoundingClientRect(),v=$('graph').viewBox.baseVal;panX=drag[2]+(e.clientX-drag[0])*v.width/box.width;panY=drag[3]+(e.clientY-drag[1])*v.height/box.height;transform();});$('graph').addEventListener('pointerup',()=>drag=null);$('graph').addEventListener('pointercancel',()=>drag=null);
function download(name,data,type){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([data],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export-json').addEventListener('click',()=>download('model.dbdep.json',JSON.stringify(M,null,2),'application/json'));
$('export-svg').addEventListener('click',()=>{const clone=$('graph').cloneNode(true);clone.setAttribute('xmlns',NS);clone.removeAttribute('tabindex');const style=svg('style',{},document.querySelector('style').textContent);clone.prepend(style);download('dependencies.svg',new XMLSerializer().serializeToString(clone),'image/svg+xml');});
draw();inspect();findings();
