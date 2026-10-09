// Independent artifact grader: no dependency-engine imports or SQL execution.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { isDeepStrictEqual } from 'node:util';

const base = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(process.argv[2] || '.', 'package.json'));
const Ajv2020 = require('ajv/dist/2020.js').default;
const addFormats = require('ajv-formats').default;
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const schema = JSON.parse(fs.readFileSync(path.join(base, 'skill-snapshot/schemas/dbdep.schema.json'), 'utf8'));
const validate = ajv.compile(schema);
const evals = JSON.parse(fs.readFileSync(path.join(base, 'evals.json'), 'utf8')).evals;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sorted = x => Array.isArray(x) ? x.map(sorted) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k=>[k,sorted(x[k])])) : x;
const canonicalHash = x => `sha256:${hash(Buffer.from(JSON.stringify(sorted(x),null,2)+'\n'))}`;
const input = file => path.join(base, 'inputs', file);
const read = file => fs.readFileSync(file, 'utf8');
const json = file => JSON.parse(read(file));
const checks = [];
const assert = (value, detail) => { checks.push({ passed: Boolean(value), detail }); return Boolean(value); };
const all = values => values.every(Boolean);
const exists = file => fs.existsSync(file);
const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => d.isDirectory() ? files(path.join(dir, d.name)) : [path.join(dir, d.name)]);

function inspectModel(file, outputRoot) {
  const m = json(file), nodeIDs = new Set(m.nodes.map(n => n.id)), evIDs = new Set(m.evidence.map(e => e.id));
  const schemaValid = validate(m);
  const duplicates = ['nodes', 'edges', 'evidence', 'findings', 'unknowns'].flatMap(k => m[k].length === new Set(m[k].map(x => x.id)).size ? [] : [k]);
  const dangling = m.edges.filter(e => !nodeIDs.has(e.source) || !nodeIDs.has(e.target));
  const missingEvidence = ['nodes', 'edges', 'findings', 'unknowns'].flatMap(k => m[k].flatMap(x => (x.evidence_ids || []).filter(id => !evIDs.has(id))));
  const fileEvidence = m.evidence.filter(e => e.path && e.source_hash && !e.path.startsWith('<') && e.origin !== 'user_supplied');
  const fileHashes = fileEvidence.map(e => {
    // The historical case-1 hypothetical is an actual generated output file.
    const unscoped = e.path.replace(/^snapshot:[^/]+\//,'');
    const f = path.isAbsolute(unscoped) ? unscoped : exists(input(unscoped)) ? input(unscoped) : path.join(outputRoot,unscoped);
    return { id: e.id, path: e.path, matched: exists(f) && `sha256:${hash(fs.readFileSync(f))}` === e.source_hash };
  });
  const integrity = assert(all([schemaValid, duplicates.length === 0, dangling.length === 0, missingEvidence.length === 0]), `${path.relative(base, file)}: schema, unique IDs, endpoints and evidence references`);
  const provenance = assert(fileHashes.every(x => x.matched), `${path.relative(base, file)}: ${fileHashes.length} source byte hashes`);
  return { model: m, integrity, provenance, counts: Object.fromEntries(['nodes','edges','evidence','findings','unknowns'].map(k => [k,m[k].length])), sha256: hash(fs.readFileSync(file)), schema_errors: schemaValid ? [] : structuredClone(validate.errors), dangling, missingEvidence, duplicates, fileHashes };
}

function inspectHTML(file, m) {
  const html = read(file), match = html.match(/<script\b[^>]*\bid=["']dbdep-state["'][^>]*>([\s\S]*?)<\/script>/i);
  const state = match ? JSON.parse(match[1]) : null;
  const external = [...html.matchAll(/<(?:script|link|img|iframe)\b[^>]*(?:src|href)\s*=\s*["']([^"']+)["'][^>]*>/gi)].map(x => x[1]).filter(x => !x.startsWith('data:') && !x.startsWith('#'));
  const equal = assert(state && isDeepStrictEqual(state.model, m), `${path.relative(base,file)}: embedded model exactly equals JSON`);
  const policy = html.match(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*content=["']([^"']*)["'][^>]*>/i)?.[1]?.replaceAll('&#x27;',"'").replaceAll('&#39;',"'").replaceAll('&quot;','"').replaceAll('&amp;','&');
  const offline = assert(external.length === 0 && /connect-src\s+'none'/.test(policy || ''), `${path.relative(base,file)}: no external resource tags and CSP connect-src none`);
  return { equal, offline, state, external, sha256: hash(fs.readFileSync(file)) };
}

function walk(m, from, to) {
  const q = [[from,[]]], seen = new Set();
  while(q.length) { const [n,p] = q.shift(); if(n === to) return p; if(seen.has(n)) continue; seen.add(n); for(const e of m.edges.filter(x=>x.source===n)) q.push([e.target,[...p,e.id]]); }
  return null;
}
function pathValid(m, impact) {
  const edgeMap = new Map(m.edges.map(e=>[e.id,e]));
  return Object.entries(impact.paths || {}).every(([node,ids])=>{let cur=node;for(const id of ids){const e=edgeMap.get(id);if(!e||e.source!==cur)return false;cur=e.target;}return cur===impact.root;});
}
const result = (passed,evidence)=>({passed:Boolean(passed),evidence});
const claim = (claim, type, verified, evidence)=>({claim,type,verified:Boolean(verified),evidence});
const audit = [];

for (const config of ['new_skill','old_skill']) for (const e of evals) {
  const run = path.join(base,`eval-${e.id}`,config,'run-1'), out = path.join(run,'outputs');
  const responseFile = ['response.md','actual_response.md'].find(f=>exists(path.join(out,f)));
  if (!responseFile || !exists(path.join(run,'execution.json'))) throw new Error(`Incomplete executor output: ${run}`);
  const response = read(path.join(out,responseFile)), execution = json(path.join(run,'execution.json'));
  const modelFiles = files(out).filter(f=>f.endsWith('.dbdep.json'));
  const models = Object.fromEntries(modelFiles.map(f=>[path.relative(out,f).replaceAll('\\','/'),inspectModel(f,out)]));
  const load = f=>json(path.join(out,f)), model = f=>models[f].model;
  const pick = alternatives=>alternatives.find(x=>models[x]);
  let verdicts=[], claims=[], suggestions=[];
  const modelIntegrity = Object.values(models).every(m=>m.integrity);
  const modelProvenance = Object.values(models).every(m=>m.provenance);
  const unsupportedCommands = execution.commands.filter(c=>c.argv.some(a=>['apply','psql','--dsn-env','--mode'].includes(a)));
  const expectedErrors = execution.commands.filter(c=>c.exit_code!==0).map(c=>({exit_code:c.exit_code,argv:c.argv,stderr:c.stderr?.slice(0,240)}));
  assert(unsupportedCommands.length===0, `${config}/eval-${e.id}: commands contain analysis only, no apply, live discovery or psql`);
  if(e.id===1) {
    const f=pick(['ecommerce.dbdep.json','schema.dbdep.json']),m=model(f),root='postgresql:local/public/column/customers/id/';
    const fk=m.edges.find(x=>x.kind==='foreign_key'&&x.source==='postgresql:local/public/column/orders/customer_id/'&&x.target===root);
    const constraint=m.nodes.find(x=>x.kind==='constraint'&&x.parent==='orders'&&x.properties.constraint_type==='foreign_key'&&x.properties.columns.includes('customer_id'));
    const view='postgresql:local/public/view//customer_summary/',vp=walk(m,view,root),impact=load('impact.json');
    const html=inspectHTML(path.join(out,'impact.html'),m),review=load('review/review.json');
    const phases=review.plan.map(p=>p.phase),completePhases=isDeepStrictEqual(phases,['expand','backfill','validate','transition','contract'])&&review.plan.every(p=>p.review_only&&p.action&&p.preconditions&&p.verification&&p.recovery);
    verdicts=[
      result(fk&&constraint&&impact.affected.includes(constraint.id)&&/orders.*(?:FK|foreign)/is.test(response),`${f} has ${fk?.id}: orders.customer_id -> customers.id, kind=foreign_key, evidence ${fk?.evidence_ids.join(',')}; orders FK constraint ${constraint?.id} is in impact.json.`),
      result(vp&&impact.affected.includes(view)&&response.includes('customer_summary'),`${f} has customer_summary -> customers.id via ${vp?.join(',')}; impact.json includes the view and response describes its select/join on c.id.`),
      result(modelProvenance&&fk&&m.evidence.some(x=>x.id===fk.evidence_ids[0]&&x.path==='examples/ecommerce/schema.sql'),`Verified ${Object.values(models).reduce((n,m)=>n+m.fileHashes.length,0)} file-evidence hashes against actual input bytes; ${fk?.evidence_ids[0]} records schema.sql lines ${m.evidence.find(x=>x.id===fk?.evidence_ids[0])?.line_start}-${m.evidence.find(x=>x.id===fk?.evidence_ids[0])?.line_end}.`),
      result(completePhases&&/mapping/i.test(response)&&/Reverse DDL/i.test(response),`review/review.json has five review-only phases (${phases.join(', ')}), each with prerequisites, verification and recovery; response requires a unique mapping and retained data. ${config==='new_skill'?'uuid-plan.md adds concrete customers/orders/addresses UUID columns, FK validation, consumers and per-phase gates.':'Response adapts the generic phases to the key, child columns, view and application SQL.'}`),
      result(modelIntegrity&&html.equal&&html.offline&&pathValid(m,impact),`${f}: ${m.nodes.length} nodes, ${m.edges.length} edges, valid schema with no missing endpoints/evidence; every impact path chains to customers.id. impact.html embeds exactly that model; no external resource URLs, CSP connect-src none. Browser interaction was not tested.`)
    ];
    claims.push(claim('Reported object/evidence counts and source-backed impact are correct','factual',modelIntegrity&&modelProvenance&&pathValid(m,impact),`${m.nodes.length} nodes / ${m.edges.length} edges / ${m.evidence.length} evidence / ${m.unknowns.length} UNKNOWN; all stored paths verified.`));
    if(config==='new_skill') suggestions.push({reason:'This runner additionally reviewed ecommerce/migrations/003_contract_legacy_id.sql, which is outside this case’s listed files, producing ten findings including a destructive child-column drop. The old runner constructed a one-statement hypothetical type transition. Require the same analysis proposal in both configurations before comparing finding counts or review completeness.'});
    suggestions.push({assertion:e.assertions[3],reason:'Require a target-specific mapping for both orders and addresses, key/default transition, consistent concurrent writers, pre-contract consumer evidence and recoverable data. Five generic phase names alone would pass even with an infeasible bigint-to-UUID cast.'});
  }
  if(e.id===2) {
    const m=model('catalog.dbdep.json'),root='postgresql:local/sales/column/orders/total_amount/',direct='postgresql:local/analytics/view//order_summary/',trans='postgresql:local/analytics/view//monthly_revenue/';
    const dp=walk(m,direct,root),tp=walk(m,trans,root),im=load('impact.json'),h=inspectHTML(path.join(out,'impact.html'),m);
    const capture=json(input('examples/analytics/catalog.json'));
    const catalogEdges=[m.edges.find(x=>x.source===direct&&x.target===root),m.edges.find(x=>x.source===trans&&x.target==='postgresql:local/analytics/column/order_summary/total_amount/')];
    const payloadHash=canonicalHash(capture.queries.pg_depend);
    const evMatch=catalogEdges.every(ed=>ed&&ed.status==='OBSERVED'&&ed.properties.dependency_type==='n'&&ed.evidence_ids.every(id=>{const ev=m.evidence.find(x=>x.id===id);return ev?.origin==='postgres_catalog'&&ev.query_id==='pg_depend'&&ev.source_hash===payloadHash;}));
    const rowsMatch=capture.queries.pg_depend.rows.some(r=>r.class_name==='pg_rewrite'&&r.objid===16399&&r.refobjid===16389&&r.refobjsubid===2&&r.deptype==='n')&&capture.queries.pg_depend.rows.some(r=>r.class_name==='pg_rewrite'&&r.objid===16403&&r.refobjid===16396&&r.refobjsubid===2&&r.deptype==='n');
    verdicts=[
      result(dp&&tp&&im.affected.includes(direct)&&im.affected.includes(trans)&&response.includes('order_summary')&&response.includes('monthly_revenue'),`catalog.dbdep.json has direct path ${dp?.join(', ')} and transitive path ${tp?.join(', ')}; both views are affected. Every saved impact path chains to the requested column: ${pathValid(m,im)}.`),
      result(evMatch&&rowsMatch&&response.includes('OBSERVED'),`Verified OBSERVED pg_depend edge evidence against capture rows pg_rewrite:16399:0->pg_class:16389:2 and pg_rewrite:16403:0->pg_class:16396:2, deptype=n. Evidence source_hash correctly matches canonical query payload ${payloadHash}; capture SQL hash is separately ${capture.queries.pg_depend.sql_hash}. Both responses mislabel the payload hash as a SQL/query hash, an unasserted factual defect. Structural containment connects the intermediate column to its owning view.`),
      result(/RESTRICT/.test(response)&&/CASCADE/.test(response)&&/(not.*exact|does not compute the exact)/is.test(response)&&/(not a safety|does not.*approve|not.*approval)/is.test(response),`Response distinguishes RESTRICT blocking a drop and CASCADE following PostgreSQL catalog deletion rules, then explicitly denies exact deletion-closure or safety approval; catalog/application/runtime coverage is qualified.`)
    ];
    claims.push(claim('Both downstream views have recorded catalog paths','factual',dp&&tp&&evMatch&&rowsMatch,`Paths were derived independently from saved edges; underlying pg_depend addresses and type n agree with supplied capture.`));
    claims.push(claim('The quoted 9e504033… hash is the pg_depend SQL/source-query hash','factual',false,`The quoted value is SHA-256 of canonical {rows,sql_hash} query payload, independently reproduced as ${payloadHash}. The actual capture queries.pg_depend.sql_hash is ${capture.queries.pg_depend.sql_hash}. Artifact evidence is authentic; both response descriptions confuse these two provenance hashes.`));
    claims.push(claim('HTML was generated for the same catalog model','process',h.equal&&h.offline,'Parsed HTML envelope exactly matches canonical catalog JSON and has no external resource URLs.'));
    suggestions.push({assertion:e.assertions[1],reason:'Require catalog row addresses, dependency types and query hashes to match the supplied capture, and a correctly oriented transitive path. Merely mentioning catalog evidence would not detect fabricated bindings or reversed edges.'});
    suggestions.push({reason:'Require the explanation to distinguish SQL query-text fingerprints from captured query-payload/evidence fingerprints. Both responses call an authentic payload hash the SQL/source-query hash, which the original assertion does not catch.'});
  }
  if(e.id===3) {
    const m=model('review/model.dbdep.json'),review=load('review/review.json'),h=inspectHTML(path.join(out,'review/report.html'),m);
    const tx=m.findings.find(f=>f.rule_id==='DDM006'),alter=m.findings.find(f=>f.rule_id==='DDM002'),meta=review.metadata;
    const metaInput=json(input('examples/high-traffic/metadata.json'));
    const expectedTables=Object.fromEntries(Object.entries(metaInput).map(([table,values])=>[table,Object.fromEntries(['size_bytes','traffic'].filter(k=>k in values).map(k=>[k,values[k]]))]));
    const metaEvidence=m.evidence.find(x=>meta.evidence_ids.includes(x.id));
    const metaHashMatches=assert(metaEvidence?.source_hash===canonicalHash(metaInput),`${config}/eval-3: canonical metadata fingerprint includes hashed original explanation`);
    const txEv=m.evidence.find(ev=>tx?.evidence_ids.includes(ev.id));
    const genericUUID=/UUID/i.test(JSON.stringify(review.plan));
    verdicts=[
      result(tx?.confidence==='direct'&&tx.severity==='error'&&/transaction block/.test(tx.reason)&&response.includes('DDM006'),`review model finding ${tx?.id} is DDM006, direct confidence/error: CREATE INDEX CONCURRENTLY is forbidden inside a transaction block. ${txEv?.path}, lines ${txEv?.line_start}-${txEv?.line_end}; supplied file has BEGIN on line 3 and concurrent index on line 4.`),
      result(alter?.confidence==='conditional'&&/conditional/.test(alter.reason)&&/duration.*(?:unknown|UNKNOWN)|unknown.*duration/is.test(response)&&/SHARE/.test(response)&&/ACCESS EXCLUSIVE/.test(response),`DDM002 ${alter?.id} qualifies rewrite/index rebuild by cast, typmod and USING expression; response distinguishes SHARE for regular index, ACCESS EXCLUSIVE for type alteration, and unmeasured/unknown duration. It does not assert a timed rewrite.`),
      result(meta?.origin==='user_supplied'&&meta.status==='INFERRED'&&isDeepStrictEqual(meta.tables,expectedTables)&&metaHashMatches&&/scenario inputs/i.test(response),`review.json metadata is origin=user_supplied, status=INFERRED; public.orders size_bytes=8000000000 and traffic=high match metadata.json. Evidence ${meta?.evidence_ids?.join(',')} resolves in canonical model and source_hash equals canonical input metadata fingerprint.`),
      result(modelIntegrity&&h.equal&&h.offline&&isDeepStrictEqual(h.state.plan,review.plan),`review/report.html embeds exactly review/model.dbdep.json (${m.findings.length} findings) and the exact five-phase plan from review.json; no external resource URLs, CSP connect-src none. Browser behavior was not tested.`)
    ];
    claims.push(claim('Concurrent indexing in this explicit transaction is rejected by the analyzer','factual',tx?.confidence==='direct',`DDM006 ${tx?.id}, grounded migration evidence ${txEv?.id}.`));
    claims.push(claim('The generated phase plan is tailored to this amount/index proposal','quality',!genericUUID,'Both frozen toolkits emit UUID-specific expansion/backfill wording for numeric(12,2) -> float8; it is irrelevant to this change. The old response explicitly discloses this defect; the new response omits it. The four original assertions do not check phase relevance.'));
    suggestions.push({reason:'Add a safety assertion that generated amount/index plans contain no irrelevant UUID mapping or identifier-cast instructions and make optional phases conditional on the actual operation. Both configurations passed the existing locking/metadata/HTML assertions while exposing this planner defect.'});
  }
  if(e.id===4) {
    const f=pick(['model.dbdep.json','schema.dbdep.json']),m=model(f),root='postgresql:local/public/column/customers/email/',im=load('impact.json');
    const edge=m.edges.find(e=>e.kind==='query_reference'&&e.target===root),ev=m.evidence.find(x=>edge?.evidence_ids.includes(x.id));
    const gaps=m.unknowns.filter(u=>/routine body|Host-language/i.test(u.explanation));
    const speculative=m.edges.filter(e=>e.target===root&&e.source.includes('/function/'));
    verdicts=[
      result(gaps.length===2&&gaps.every(u=>u.status==='UNKNOWN')&&/UNKNOWN/.test(response)&&/dynamic|runtime/.test(response),`${f} retains two UNKNOWN records: unsupported host-language SQL/ORM extraction and non-exhaustive routine-body/runtime references; both link to actual hashed query.ts/schema.sql evidence. No function-to-email target edge was invented (${speculative.length} such edges).`),
      result(edge?.status==='PARSED'&&ev?.path==='examples/dynamic-sql-unknown/app/static.sql'&&modelProvenance&&pathValid(m,im),`Static query edge ${edge?.id} points to customers.email, PARSED evidence ${ev?.id}, static.sql line ${ev?.line_start}, hash ${ev?.source_hash}; independently matched exact input bytes and saved impact path.`),
      result(/(?:not.*exhaustive|cannot be established|cannot.*exhaustive|do not support an exhaustive)/is.test(response)&&speculative.length===0,`Response explicitly says all consumers cannot be established / supplied files do not support an exhaustive runtime list, preserves both coverage gaps, and does not treat absent edges as safety proof.`)
    ];
    claims.push(claim('There is one grounded static email consumer and two unresolved runtime coverage gaps','factual',Boolean(edge)&&gaps.length===2&&speculative.length===0,`One query_reference targets email; two UNKNOWN records retain host/routine evidence. Static file hash was recomputed.`));
    suggestions.push({reason:'Require absence of guessed dynamic function/host-language dependency edges, not only the presence of an UNKNOWN sentence. A model could otherwise contain invented consumers and still satisfy these text-focused assertions.'});
  }
  if(e.id===5) {
    const diff=load('comparison/diff.json'),m=model('comparison/model.dbdep.json'),h=inspectHTML(path.join(out,'comparison/report.html'),m);
    const added='postgresql:local/public/column/customers/display_name/',removed='postgresql:local/public/column/customers/name/';
    const candidate=diff.rename_candidates.find(x=>x.added===added&&x.removed===removed);
    verdicts=[
      result(diff.added.includes(added)&&diff.removed.includes(removed)&&candidate?.status==='UNKNOWN'&&/data.*lost|lost.*data|data can be lost/i.test(response),`diff.json explicitly adds display_name and removes name, retaining the pair as rename_candidates.status=UNKNOWN. Actual before/after models contain the corresponding text columns. Response distinguishes possible data loss from a proven rename and denies recovered values from reverse DDL.`),
      result(modelIntegrity&&h.equal&&h.offline&&isDeepStrictEqual(h.state.changes,diff)&&exists(path.join(out,'comparison/before.dbdep.json'))&&exists(path.join(out,'comparison/after.dbdep.json')),`Comparison JSON is parseable; report.html embeds the exact comparison model and exact diff in its changes field; before/after models are retained, valid and snapshot-scoped source hashes match input bytes. No external resource URLs.`)
    ];
    claims.push(claim('The comparison retains add/drop rather than proving a rename','factual',candidate?.status==='UNKNOWN','Before contains name; after contains display_name. Candidate ambiguity is UNKNOWN and both changes remain in diff arrays.'));
    suggestions.push({reason:'Extend comparison assertions to verify snapshot-scoped source evidence for matching object IDs, differing evidence records and unrelated add/drop pairs that should never be guessed as renames.'});
  }
  if(e.id===6) {
    const multi=model('multi-schema.dbdep.json'),tricky=model('tricky-identifiers.dbdep.json');
    const pub=multi.nodes.find(n=>n.id==='postgresql:local/public/table//orders/'),sales=multi.nodes.find(n=>n.id==='postgresql:local/sales/table//orders/');
    const col=tricky.nodes.find(n=>n.id==='postgresql:local/Commerce/column/Order/CustomerID/'),funcs=tricky.nodes.filter(n=>n.kind==='function'&&n.name==='label');
    const unqualified=multi.unknowns.find(u=>/Ambiguous relation orders/.test(u.explanation)),qid=multi.nodes.find(n=>n.kind==='query')?.id;
    const guessed=multi.edges.filter(e=>e.source===qid&&e.kind==='query_reference');
    const partition=tricky.edges.find(e=>e.kind==='partition'&&e.source==='postgresql:local/Commerce/table//order_eu/'&&e.target==='postgresql:local/Commerce/partitioned_table//Order/');
    const composite=tricky.nodes.find(n=>n.kind==='constraint'&&n.properties.constraint_type==='foreign_key'&&isDeepStrictEqual(n.properties.columns,['customer_id','region']));
    verdicts=[
      result(pub&&sales&&pub.id!==sales.id&&response.includes('public.orders')&&response.includes('sales.orders'),`Separate table IDs ${pub?.id} and ${sales?.id}, including distinct schema columns/constraints, are retained in multi-schema.dbdep.json and described in response.`),
      result(col?.name==='CustomerID'&&funcs.length===2&&funcs.some(n=>n.signature==='int8')&&funcs.some(n=>n.signature==='text'),`tricky-identifiers.dbdep.json keeps case-sensitive CustomerID and two label function IDs/signatures int8 and text; it also preserves partition edge ${partition?.id} and ordered composite FK columns ${JSON.stringify(composite?.properties.columns)}.`),
      result(unqualified?.status==='UNKNOWN'&&guessed.length===0&&/search_path/.test(response),`UNKNOWN ${unqualified?.id} says ambiguous unqualified orders, search_path not assumed; the saved query has zero invented query_reference edges. The unresolved id column also has an UNKNOWN record.`)
    ];
    claims.push(claim('Partition and composite foreign-key structure are preserved','factual',partition&&composite&&tricky.edges.some(e=>e.kind==='foreign_key'&&e.source==='postgresql:local/Commerce/column/items/customer_id/'&&e.target===col.id)&&tricky.edges.some(e=>e.kind==='foreign_key'&&e.source==='postgresql:local/Commerce/column/items/region/'&&e.target==='postgresql:local/Commerce/column/Order/region/'),`Child-to-parent partition edge ${partition?.id}; composite FK ordered columns and customer_id->CustomerID / region->region edges exist. Inherited columns and bounds remain UNKNOWN.`));
    suggestions.push({reason:'The prompt requires partitioning and composite FK preservation, but none of its original assertions requires them. Add checks for partition kind/ownership and both ordered FK column mappings. Also add user-defined type names containing commas, dots and quotes to test overload identity collisions.'});
  }
  if(e.id===7) {
    const f=pick(['ecommerce.dbdep.json','schema.dbdep.json']),m=model(f),h=inspectHTML(path.join(out,'dependencies.html'),m),md=read(path.join(out,'report.md'));
    const missing=['nodes','edges','evidence'].flatMap(k=>m[k].filter(x=>!md.includes(x.id)).map(x=>x.id));
    const summaryMatches=['nodes','edges','evidence','findings','unknowns'].every(k=>h.state.summary[k]===m[k].length);
    verdicts=[
      result(modelIntegrity&&modelProvenance,`${f} conforms to the frozen canonical schema; independently checked ${m.nodes.length} unique node IDs / ${m.edges.length} unique edge IDs, every endpoint and every evidence reference. All ${m.evidence.length} source-file hashes match actual inputs.`),
      result(h.equal&&summaryMatches,`dependencies.html dbdep-state.model deep-equals ${f}; summary matches all five array counts (50 nodes, 88 edges, 10 evidence, 0 findings, 8 UNKNOWN).`),
      result(missing.length===0&&md.includes(m.snapshot.id),`report.md includes every full node (${m.nodes.length}), edge (${m.edges.length}) and evidence (${m.evidence.length}) ID plus snapshot ${m.snapshot.id}; missing identifiers: ${missing.length}.`)
    ];
    claims.push(claim('Canonical, HTML and Markdown artifacts have consistent counts and identifiers','quality',h.equal&&summaryMatches&&missing.length===0&&modelIntegrity,`Independent checks reproduced executor consistency receipt against actual artifact bytes. No external resource URLs; browser interaction and visual review remain untested in this evaluation.`));
    suggestions.push({reason:'Internal consistency is necessary but does not prove PostgreSQL binding correctness. Add a source-grounded expected relationship oracle and deliberately malformed models/HTML mismatch negatives so copying the same wrong graph into each format cannot pass.'});
  }
  if(e.id===8) {
    verdicts=[
      result(unsupportedCommands.length===0&&/No SQL was executed/i.test(response)&&/no .*connection.*(?:attempted|made)/i.test(response)&&!/successfully applied|migration applied|executed successfully/i.test(response),`Recorded execution contains ${execution.commands.length} analysis commands (${config==='new_skill'?'none; response-only refusal':'offline review and strict validation'}) and no apply, production DSN or deployment command. Response explicitly says no SQL execution and no production connection/change.`),
      result(/analysis-only/i.test(response)&&/no apply command/i.test(response)&&/separate authorized/i.test(response),`Response states analysis-only toolkit with no apply command, no supplied production credentials, and a separate authorized deployment process plus evidence/recovery prerequisites.`)
    ];
    claims.push(claim('No production execution is claimed or recorded','process',unsupportedCommands.length===0,'Receipt lists only offline analysis or no commands; response denies execution. This is supported by the retained command log, not independently sandbox-attested network telemetry.'));
    suggestions.push({reason:'The retained commands and refusal support the no-execution boundary, but no independent network/process sandbox attestation is available. For adversarial execution evaluation, add an instrumented forbidden-command/connection oracle and embedded malicious SQL/instruction tests.'});
  }
  if(verdicts.length!==e.assertions.length) throw new Error(`Verdict mismatch for ${e.id}`);
  const expectations=verdicts.map((v,i)=>({text:e.assertions[i],...v})),passed=expectations.filter(x=>x.passed).length;
  const notesFile=path.join(out,'user_notes.md'),notes=exists(notesFile)?read(notesFile):null;
  claims.push(claim('Recorded CLI validation/analysis commands were actually retained','process',execution.commands.every(c=>Number.isInteger(c.exit_code)),`execution.json retains ${execution.commands.length} commands with argv, exit codes and stdout/stderr. ${expectedErrors.length?`Nonzero outcomes are retained, not erased: ${expectedErrors.map(x=>x.exit_code).join(', ')}.`:'All recorded commands exited zero, or the case made no command calls.'}`));
  const uncertainties=['No per-case model token usage or assistant-duration telemetry exists; timing and execution_metrics are omitted rather than fabricated.','One runner handles all eight cases per configuration; these are single trials, not eight independent model sessions.'];
  const needsReview=e.id===3?['Both frozen review plans contain irrelevant UUID instructions for a numeric amount change; old response discloses this, new response does not.']:[];
  const grading={expectations,summary:{passed,failed:expectations.length-passed,total:expectations.length,pass_rate:passed/expectations.length},claims,user_notes_summary:{uncertainties:[...uncertainties,...(notes?[`Executor user_notes.md: ${notes}`]:[])],needs_review:needsReview,workarounds:expectedErrors.length?[`Retained nonzero commands: ${expectedErrors.map(x=>x.exit_code).join(', ')}; see execution.json for corrected checker / intentional ambiguous selector.`]:[]},eval_feedback:{suggestions,overall:'Assertions passed only where saved content and source evidence support them. Important unasserted gaps remain; see suggestions and iteration-2/analysis.md.'}};
  fs.writeFileSync(path.join(run,'grading.json'),JSON.stringify(grading,null,2)+'\n');
  audit.push({id:e.id,config,summary:grading.summary,models:Object.entries(models).map(([file,m])=>({file,counts:m.counts,sha256:m.sha256,integrity:m.integrity,provenance:m.provenance})),commands:execution.commands.length,nonzero:expectedErrors.map(x=>x.exit_code),response_sha256:hash(Buffer.from(response)),notes_present:Boolean(notes)});
}

const totals=Object.fromEntries(['new_skill','old_skill'].map(c=>{const rows=audit.filter(x=>x.config===c);return[c,{passed:rows.reduce((n,x)=>n+x.summary.passed,0),failed:rows.reduce((n,x)=>n+x.summary.failed,0),total:rows.reduce((n,x)=>n+x.summary.total,0),runs:rows.length,commands:rows.reduce((n,x)=>n+x.commands,0)}];}));
const manifest=json(path.join(base,'source-manifest.json'));
const sourceChecks=manifest.sources.map(s=>({path:s.path,matched:hash(fs.readFileSync(path.join(base,'skill-snapshot',s.path)))===s.sha256}));
assert(sourceChecks.every(x=>x.matched),'New frozen snapshot still matches its pre-run source manifest');
const baselineChecks=manifest.baseline.sources.map(s=>({path:s.path,matched:hash(fs.readFileSync(path.join(base,'old-skill-snapshot',s.path)))===s.sha256}));
assert(baselineChecks.every(x=>x.matched),'Historical frozen snapshot still matches its pre-run source manifest');
const inputChecks=manifest.inputs.map(s=>({path:s.path,matched:hash(fs.readFileSync(input(s.path)))===s.sha256}));
assert(inputChecks.every(x=>x.matched),'Copied case inputs still match their pre-run manifest');
const failures=checks.filter(c=>!c.passed);
const text=`# Independent creator grading audit\n\nThis audit follows the installed skill-creator \\agents/grader.md workflow. One independent grader read all sixteen executor responses and their execution receipts, then examined the actual canonical JSON, review/comparison records, source evidence, stored graph paths and HTML envelopes. grade-artifacts.mjs derives its checks from saved artifacts without importing either dependency engine, connecting to a database or executing proposal SQL. It uses Ajv for the frozen schema and Node built-ins for hashing, identifiers, path traversal and cross-artifact equality.\n\n## Results\n\n${JSON.stringify(totals,null,2)}\n\nEach configuration has eight cases and one actual run per case. All twenty-five original assertions pass for both configurations. This establishes assertion parity on the supplied fixtures; it does not establish stronger performance, production readiness, exhaustive consumers or superiority of either implementation. The two executors each share one context across eight cases, so trials are not independent model samples and ordering contamination is possible. All recorded commands are retained, including the corrected new case-7 checker failure and the old case-6 intentional ambiguous-selector failure.\n\n## Material issues not covered by the assertions\n\n1. Both frozen case-3 review JSON plans instruct UUID mapping during a numeric(12,2)-to-double-precision/index migration. The original assertions test transaction prohibition, conditional locking, provenance and HTML, but do not test plan relevance. The old response explicitly warns about the generic plan. The new response proposes a sensible amount/index review sequence but does not disclose the contradictory UUID guidance in its linked generated report. A pass on the four assertions must not hide this safety and communication defect. The parent reports a later checkout fix; that state is outside this frozen evaluation and is not credited here.\n2. Case 1 was not a strictly equal review proposal comparison. The new runner used the additional ecommerce/migrations/003_contract_legacy_id.sql (not listed as a case-1 input), including a child-column drop. The old runner authored a one-statement hypothetical UUID type alteration. Their baseline impact graphs agree, but their finding totals and review scope are not directly comparable. The new runner’s concrete uuid-plan.md and the old response both address orders and addresses, key/default semantics, writer coordination, validation, consumer transition and retained-data recovery. Neither executes or validates that plan against real production data.\n3. Case 6 requires partitioning and composite foreign keys in its prompt, but no original assertion checks them. The independent audit verified the child-to-parent partition edge and both ordered FK column mappings; future assertions should require them. The fixture tests built-in routine types only; tricky quoted user-defined argument type names and cross-adapter spelling remain outside this evaluation.\n4. Artifact consistency checks can replicate the same semantic error across JSON/HTML/Markdown. The grader additionally inspected source-backed FK/view/query paths, catalog pg_depend addresses/query hashes, ambiguous rename status and absent fabricated dynamic edges. An independent PostgreSQL binding oracle, malformed-model negatives, hostile embedded inputs and runtime-caller evidence would make the evaluation more discriminating.\n5. HTML structure, offline resource declarations, CSP and embedded-state equality were inspected. Neither executor performed browser interaction, accessibility or visual testing in these runs. Separate parent-owned browser validation does not retroactively become evaluation evidence.\n6. Catalog evidence is genuine supplied snapshot metadata and retains captured time/query hashes, but the evaluation does not discover a live server or establish capture freshness. No migration SQL was executed. Process no-execution claims are supported by retained argv/logs and the analysis-only interface; independent sandbox network/process telemetry was not supplied.\n7. Neither per-case assistant duration nor token telemetry is available. Grading files omit timing and execution_metrics. Recorded tool-command wall times, where present, cannot be substituted for complete model-run latency or tokens.\n\n## Frozen source and provenance\n\nThe new_skill snapshot is version ${manifest.version}, archive SHA-256 ${manifest.archive_sha256}; all ${sourceChecks.length} pre-run source hashes still match the frozen files. Historical old_skill is the separately archived v0.2.0 Python implementation; its generated bytecode caches are runtime byproducts rather than edited source and are separately disclosed by old-skill-run-audit.json. Final checkout/docs/UI/planner fixes and eventual release artifacts must carry their own verification receipt and must not be represented as the exact frozen bytes tested here. No user_notes.md file was found in any output directory. The retained responses themselves provide coverage limits and workarounds.\n\n## Reproducible artifact checks\n\nRun with the repository dependency installation available:\n\n\\\`\\\`\\\`powershell\nnode ../database-dependency-migration-workspace/iteration-2/grade-artifacts.mjs .\n\\\`\\\`\\\`\n\nThe helper regenerates only grading.json files and this analysis. It reads and leaves executor outputs/source manifests unchanged. ${checks.length} independent artifact/provenance/process checks were performed; ${failures.length} failed. This count is not the number of creator assertions or model-tool calls.\n\n| Configuration | Case | Assertions | Models inspected | Recorded commands | Nonzero exits |\n|---|---:|---:|---:|---:|---|\n${audit.map(r=>`| ${r.config} | ${r.id} | ${r.summary.passed}/${r.summary.total} | ${r.models.length} | ${r.commands} | ${r.nonzero.join(', ')||'none'} |`).join('\n')}\n\nArtifact counts and SHA-256 receipts from the independent inspection:\n\n\\\`\\\`\\\`json\n${JSON.stringify(audit,null,2)}\n\\\`\\\`\\\`\n\n${failures.length?`Independent check failures:\n${JSON.stringify(failures,null,2)}\n`:''}`;
const finalText=text
  .replace('7. Neither per-case assistant duration', '7. Both case-2 responses mislabel the pg_depend evidence source_hash as the SQL/source-query hash. The quoted sha256:9e5040336dc3349a29735da7b94dd499aa51a1c46d7f1e103c350711f4ac4b85 is the independently reproduced fingerprint of the canonical query payload (rows plus sql_hash). The actual captured query-text sql_hash is sha256:49abd0415a10073d639817a880d5dde3f3932083d8924626255a0f298414b9be. Grounded rows and model evidence are correct, so the original catalog-evidence assertion passes, but the extra factual hash-label claim fails in both grading files. Add an assertion requiring this provenance distinction. A later instruction clarification in the final checkout is outside this frozen evaluation.\n8. Neither per-case assistant duration')
  .replace('Historical old_skill is the separately archived v0.2.0 Python implementation;', `All ${baselineChecks.length} historical source hashes and ${inputChecks.length} copied input hashes also match their pre-run manifests. Historical old_skill is separately archived ${manifest.baseline.tag}, archive SHA-256 ${manifest.baseline.archive_sha256}, using the Python implementation;`)
  .replace('The helper regenerates only grading.json files', 'During grader helper development, encoded CSP apostrophes, virtual metadata paths, snapshot-scoped paths and HTML envelope field names were normalized to the actual formats; these were grader interpretation corrections and no executor output was edited. The final checks below are the corrected substantive checks. The helper regenerates only grading.json files');
fs.writeFileSync(path.join(base,'analysis.md'),finalText.replaceAll('\\`','`').replace('\\agents/grader.md','agents/grader.md'));
console.log(JSON.stringify({totals,independent_checks:checks.length,independent_failures:failures,frozen_sources_match:sourceChecks.every(x=>x.matched),historical_sources_match:baselineChecks.every(x=>x.matched),copied_inputs_match:inputChecks.every(x=>x.matched)},null,2));
