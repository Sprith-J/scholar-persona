import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseIdentity, validOrcid, abstractFromIndex, normalizeWork, sampleWorks, resolveIdentity, loadResearch } from '../lib/research.mjs';
import { validateNarrative, normalizeNarrative, parseNarrative, samePerson } from '../lib/prompt.mjs';
import { reserveCall, CALL_LIMIT } from '../lib/model.mjs';

test('identity parsing validates ORCID checksums and supported profiles',()=>{
  assert.equal(validOrcid('0000-0002-1825-0097'),true);
  assert.equal(validOrcid('0000-0002-1825-0098'),false);
  assert.equal(parseIdentity('https://orcid.org/0000-0002-1825-0097').type,'orcid');
  assert.equal(parseIdentity('A5014360828').value,'A5014360828');
  assert.equal(parseIdentity('Jennifer Doudna').type,'name');
  assert.equal(parseIdentity('https://scholar.google.com/citations?user=abcdefAAAAAJ&hl=en').type,'scholar');
  for(const input of ['http://127.0.0.1/private','https://scholar.google.com.evil.com/citations?user=abcdefgh','https://example.org','0000-0002-1825-0098']) assert.throws(()=>parseIdentity(input));
});
test('missing abstract stays missing; inverted indices reconstruct in order',()=>{
  assert.equal(abstractFromIndex(null),'');
  assert.equal(abstractFromIndex({world:[1],Hello:[0]}),'Hello world');
  assert.equal(abstractFromIndex({data:[999999999,-2]}),'');
});
test('only the chosen author’s non-retracted scholarly works enter the corpus',()=>{
  const raw={id:'https://openalex.org/W12345678',title:'A study',type:'article',publication_year:2024,authorships:[{author:{id:'https://openalex.org/A12345678'},author_position:'middle'}]};
  assert.ok(normalizeWork(raw,'A12345678'));
  assert.equal(normalizeWork(raw,'A87654321'),null);
  assert.equal(normalizeWork({...raw,is_retracted:true},'A12345678'),null);
  assert.equal(normalizeWork({...raw,type:'erratum'},'A12345678'),null);
});
test('sampling deduplicates DOI and includes recent work alongside influential work',()=>{
  const works=Array.from({length:45},(_,i)=>({id:'W'+i,title:'Paper '+i,doi:'https://doi.org/10.1000/'+i,year:1980+i,citedBy:10000-i*200,topics:[{name:'field'+i%5}]}));
  works.push({...works[0],id:'W9999'});
  const result=sampleWorks(works);
  assert.equal(result.length,24);
  assert.equal(new Set(result.map(p=>p.doi)).size,24);
  assert.ok(result.some(p=>p.id==='W0'));
  assert.ok(result.some(p=>p.id==='W44'));
});
test('author lookup preserves ambiguity instead of silently selecting a namesake',async()=>{
  const fetcher=async()=>new Response(JSON.stringify({results:[{id:'https://openalex.org/A12345678',display_name:'J. Smith'},{id:'https://openalex.org/A87654321',display_name:'J. Smith'}]}));
  const result=await resolveIdentity('J. Smith',{fetcher});
  assert.equal(result.candidates.length,2);
  assert.equal(result.via,'name');
});
test('bilingual narrative requires known paper evidence and rejects invented references',()=>{
  const b={en:'A specific observation',zh:'具体观察'};
  const value={field:b,theme:b,lead:b,scope:b,person:{name:b,connection:b,boundary:b,wikiTitle:'Alhazen',paperIds:['W1']},traits:[{title:b,body:b,paperIds:['W1']},{title:b,body:b,paperIds:['W1']}],alternatives:[]};
  assert.equal(validateNarrative(value,[{id:'W1'}]).ok,true);
  assert.equal(validateNarrative({...value,traits:[{title:b,body:b,paperIds:['W404']},{title:b,body:b,paperIds:['W1']}]},[{id:'W1'}]).ok,false);
  assert.equal(validateNarrative({...value,lead:{en:'Missing Chinese'}},[{id:'W1'}]).ok,false);
  assert.equal(validateNarrative({...value,person:{...value.person,name:{en:'Terence Tao',zh:'陶哲轩'},wikiTitle:'Terence_Tao'}},[{id:'W1'}],'Terence Tao').ok,false);
  assert.equal(samePerson('Karl A. Deisseroth','Karl_Deisseroth'),true);
});
test('concurrent budget reservations cannot exceed the independent 30-call authorization',async()=>{
  const root=await mkdtemp(join(tmpdir(),'scholar-budget-test-'));
  try{
    const results=await Promise.allSettled(Array.from({length:35},(_,i)=>reserveCall(root,'test-'+i)));
    assert.equal(results.filter(r=>r.status==='fulfilled').length,CALL_LIMIT);
    assert.equal(results.filter(r=>r.status==='rejected').length,5);
    const ledger=JSON.parse(await readFile(join(root,'call-budget.json'),'utf8'));
    assert.equal(ledger.calls.length,30);
    assert.equal(new Set(ledger.calls.map(c=>c.number)).size,30);
  }finally{await rm(root,{recursive:true,force:true});}
});
test('observed split translation is joined without creating or rewriting text',()=>{
  const result=normalizeNarrative({person:{boundary:{en:'Existing English'},boundary_zh:{zh:'已有中文'}}});
  assert.deepEqual(result.value.person.boundary,{en:'Existing English',zh:'已有中文'});
  assert.equal(result.fixes.length,1);
  const missing=normalizeNarrative({person:{boundary:{en:'Existing English'}}});
  assert.equal(missing.value.person.boundary.zh,undefined);
});
test('observed missing person brace can be restored, but incomplete text is rejected',()=>{
  const malformed='{"person":{"name":{"en":"Name","zh":"名字"},"traits":[],"alternatives":[],"scope":{"en":"Existing scope","zh":"已有范围"}}';
  const repaired=parseNarrative(malformed);
  assert.equal(repaired.value.scope.zh,'已有范围');
  assert.equal(repaired.value.person.traits,undefined);
  assert.equal(repaired.fixes[0],'restored-missing-person-object-boundary');
  assert.throws(()=>parseNarrative('{"person":{"name":"cut off'));
});
test('a researcher with one paper can receive a clearly scoped reading',async()=>{
  const fetcher=async url=>new Response(JSON.stringify(String(url).includes('/authors/')?{id:'https://openalex.org/A12345678',display_name:'Early Career Researcher',works_count:1}:{meta:{count:1},results:[{id:'https://openalex.org/W12345678',title:'A first experimental study',publication_year:2025,type:'article',authorships:[{author:{id:'https://openalex.org/A12345678'}}]}]}));
  const research=await loadResearch('A12345678',{fetcher});
  assert.equal(research.papers.length,1);assert.equal(research.corpus.withAbstract,0);
});
