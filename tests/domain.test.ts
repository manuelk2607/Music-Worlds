import test from 'node:test';
import assert from 'node:assert/strict';
import { contributionSchema,canPublish,youtube,safeURL, type Review } from '../src/domain';
import { seedContributions } from '../src/seed-data';
const review:Review={status:'approved',reviewer:'moderator',reason:'Original hint reviewed individually',evidenceChecked:true,reviewedAt:new Date().toISOString()};
test('all starter clues are valid, newly authored content with four distinct song titles',()=>{
  for(const c of seedContributions){assert.ok(contributionSchema.safeParse(c).success);assert.ok(canPublish(c,review));}
});
test('checkbox, source link and self-declared rights cannot publish without a recorded review',()=>{
  const c=structuredClone(seedContributions[0]);
  for(const r of [{status:'pending'}, {...review,evidenceChecked:false},{...review,reviewer:''},{...review,reason:''}])assert.equal(canPublish(c,r as Review),false);
  c.rights.evidence='';assert.equal(canPublish(c,review),false);
});
test('unverified and expired rights are refused; protected lyrics need display rights',()=>{
  const c=structuredClone(seedContributions[0]);c.kind='lyrics';c.rights.basis='rights_unverified';assert.equal(canPublish(c,review),false);
  c.rights.basis='licensed_content';assert.ok(canPublish(c,review));c.rights.uses=['stream'];assert.equal(canPublish(c,review),false);
  c.rights.uses=['display'];c.rights.expires='2020-01-01T00:00:00Z';assert.equal(canPublish(c,review),false);
  c.rights.expires=undefined;c.kind='audio';assert.equal(canPublish(c,review),false);
});
test('normalizes official YouTube URL formats and permits bounded start/end parameters',()=>{
  for(const url of ['https://youtu.be/abcdefghijk?t=42','https://www.youtube.com/watch?v=abcdefghijk&list=abc','https://youtube.com/embed/abcdefghijk','https://m.youtube.com/shorts/abcdefghijk']){
    const y=youtube(url,12,35);assert.equal(y.url,'https://www.youtube.com/watch?v=abcdefghijk');assert.match(y.embed,/start=12/);assert.match(y.embed,/end=35/);assert.match(y.embed,/controls=1/);
  }
});
test('rejects URL spoofing, credentials, local endpoints, malformed video IDs and time ranges',()=>{
  for(const url of ['javascript:alert(1)','https://youtube.com.evil.org/watch?v=abcdefghijk','https://www.youtube.com@evil.org/watch?v=abcdefghijk','http://youtube.com/watch?v=abcdefghijk','https://youtu.be/abc','https://youtu.be/abcdefghijk/extra'])assert.throws(()=>youtube(url));
  for(const url of ['https://localhost/a','https://127.0.0.1/a','https://[::1]/a','https://host.local/a','https://user:pass@example.org/a','https://example.org:444/a'])assert.throws(()=>safeURL(url));
  for(const [start,end] of [[-1,10],[20,10],[0,90000],[1.5,20]])assert.throws(()=>youtube('https://youtu.be/abcdefghijk',start,end));
});
test('duplicate answers and valid aliases as distractors are refused',()=>{
  const c=structuredClone(seedContributions[0]);c.alternatives[0]='  BOHEMIAN   RHAPSODY ';assert.equal(contributionSchema.safeParse(c).success,false);
  c.alternatives[0]='Different';c.aliases=['Different'];assert.equal(contributionSchema.safeParse(c).success,false);
});
test('an external medium needs a separate review as well as the original hint review',()=>{
  const c=structuredClone(seedContributions[0]);c.media={provider:'youtube',url:'https://youtu.be/abcdefghijk',official:true,start:0};
  assert.equal(canPublish(c,review),false);assert.equal(canPublish(c,{...review,mediaChecked:true}),true);
  c.media.official=false;assert.equal(canPublish(c,{...review,mediaChecked:true}),false);
});
