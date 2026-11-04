import test from 'node:test';import assert from 'node:assert/strict';
import {validateUpload,mediaProviders} from '../src/media';import {seoHTML,publicPages,indexablePage} from '../src/seo';
import {normalizeExternalMedia,externalMediaProviders} from '../src/media-providers';
test('private upload adapter accepts bounded original fixtures and rejects unsafe formats',()=>{
  const wav=new TextEncoder().encode('RIFF0000WAVEoriginal fixture');assert.equal(validateUpload(wav,'audio/wav','audio').purpose,'audio');
  const pdf=new TextEncoder().encode('%PDF-1.7\nOriginal test evidence');assert.ok(validateUpload(pdf,'application/pdf','evidence'));
  for(const [bytes,mime,purpose] of [[wav,'audio/mpeg','audio'],[pdf,'text/html','evidence'],[new Uint8Array(3*1024*1024),'audio/wav','audio']] as const)assert.throws(()=>validateUpload(bytes,mime,purpose));
  assert.equal(mediaProviders.private_audio.publicationEnabled,false);
});
test('public SEO pages have unique titles, canonicals and JSON-LD; staging stays noindex',()=>{
  const titles=new Set();for(const [path,p]of Object.entries(publicPages)){titles.add(p.title);const h=seoHTML('<title>old</title><meta name="robots" content="x"><meta name="description" content="x"></head><main id="main" tabindex="-1"></main>',path,'https://music.test',false);assert.ok(h.includes('https://music.test'+path));assert.ok(h.includes('application/ld+json'));assert.ok(h.includes('noindex,nofollow'));assert.ok(h.includes(p.heading));}assert.equal(titles.size,3);
});
test('the owner-requested index policy permits only the landing page',()=>{
  assert.equal(indexablePage('/',true),true);for(const path of ['/spiele','/ueber','/api/me','/profile','/room/ABCD2345'])assert.equal(indexablePage(path,true),false);
  assert.equal(indexablePage('/',false),false);
  const template='<meta name="robots" content="noindex"></head>';
  assert.match(seoHTML(template,'/','https://music.test',true),/content="index,follow"/);
  assert.match(seoHTML(template,'/ueber','https://music.test',true),/content="noindex,nofollow"/);
});
test('provider adapters normalize both visible embeds and pure external links without changing game mechanics',()=>{
  const embed=normalizeExternalMedia({url:'https://youtu.be/abcdefghijk',start:2,end:8});assert.equal(embed.provider,'youtube');assert.ok('embed' in embed&&embed.embed.includes('end=8'));
  const link=normalizeExternalMedia({provider:'external_link',url:'https://example.org/official-song'});assert.deepEqual(link,{provider:'external_link',url:'https://example.org/official-song'});assert.ok(!('embed' in link));
  assert.throws(()=>normalizeExternalMedia({provider:'external_link',url:'javascript:alert(1)'}));assert.equal(externalMediaProviders.youtube.revealsTitle,true);
});
