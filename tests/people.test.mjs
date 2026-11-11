import test from 'node:test';
import assert from 'node:assert/strict';
import { profileFacts, selectNobelAwards, rankAwards, achievementExcerpt } from '../lib/people.mjs';

test('Nobel records must match the historical person’s Wikidata identity',()=>{
  const data={laureates:[{id:'299',wikidata:{id:'Q150526'},nobelPrizes:[{prizeStatus:'received',awardYear:'1906',category:{en:'Physiology or Medicine'},categoryFullName:{en:'The Nobel Prize in Physiology or Medicine'},links:[{rel:'external',href:'https://www.nobelprize.org/prizes/medicine/1906/cajal/facts/'}]}]}]};
  assert.deepEqual(selectNobelAwards(data,'Q244152'),[]);
  const award=selectNobelAwards(data,'Q150526')[0];
  assert.equal(award.year,1906);assert.equal(award.name.zh,'诺贝尔生理学或医学奖');assert.equal(award.source,'NobelPrize.org');
});
test('biographical facts preserve BCE dates and exclude deprecated claims',()=>{
  const entity={id:'Q123',labels:{en:{value:'A person'},zh:{value:'人物'}},descriptions:{en:{value:'historical thinker'},zh:{value:'历史思想家'}},claims:{P569:[{rank:'normal',mainsnak:{datavalue:{value:{time:'-0384-00-00T00:00:00Z'}}}}],P570:[{rank:'normal',mainsnak:{datavalue:{value:{time:'-0322-00-00T00:00:00Z'}}}}],P800:[{rank:'deprecated',mainsnak:{datavalue:{value:{id:'Q9'}}}}]}};
  const p=profileFacts(entity,{Q9:{id:'Q9',labels:{en:{value:'Not supported'}}}});
  assert.equal(p.birthYear,-384);assert.equal(p.deathYear,-322);assert.equal(p.notableWorks.length,0);assert.equal(p.introduction.zh,'历史思想家');
});
test('award ordering recognizes Abel as a word, without confusing Isabella',()=>{
  const sorted=rankAwards([{name:{en:'Grand Cross of the Order of Isabella the Catholic'},kind:'award'},{name:{en:'Helmholtz Medal'},kind:'award'},{name:{en:'Abel Prize'},kind:'award'},{name:{en:'Nobel Prize'},kind:'nobel'}]);
  assert.deepEqual(sorted.map(a=>a.name.en),['Nobel Prize','Abel Prize','Helmholtz Medal','Grand Cross of the Order of Isabella the Catholic']);
});
test('an accomplishment excerpt is sourced and bounded rather than invented',()=>{
  const text='She was a scientist. She is best known for a general technique that changed experimental mathematics and enabled researchers to establish many difficult results through a new rigorous method.';
  const excerpt=achievementExcerpt(text,'en');assert.match(excerpt,/best known/);assert.ok(excerpt.split(/\s+/).length<=24);
  assert.equal(achievementExcerpt('There is no accomplishment in this sentence.','en'),'');
});
