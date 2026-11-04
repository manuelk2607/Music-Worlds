import test from 'node:test';import assert from 'node:assert/strict';
import {de} from '../src/i18n/de';import {en} from '../src/i18n/en';import {date,localeFrom,localeFromPath,localePath,number,t} from '../src/i18n';
test('German and English catalogues contain the same complete non-empty message set',()=>{
  assert.deepEqual(Object.keys(en).sort(),Object.keys(de).sort());for(const value of Object.values(en))assert.ok(value.trim().length>0);
  assert.equal(t('de','nav.play'),'Spielen');assert.equal(t('en','nav.play'),'Play');assert.equal(t('en','room.answers',{answered:2,players:3}),'2 of 3 answers submitted');
});
test('locale detection, routes, numbers and dates follow the active language',()=>{
  assert.equal(localeFrom('en-US'),'en');assert.equal(localeFrom('fr-FR'),'de');assert.equal(localeFromPath('/en/about'),'en');assert.equal(localePath('/ueber','en'),'/en/about');assert.equal(localePath('/en/games','de'),'/spiele');
  assert.match(number('de',1234.5),/1[.\s]234,5/);assert.match(number('en',1234.5),/1,234\.5/);assert.notEqual(date('de','2026-11-04T10:00:00Z'),date('en','2026-11-04T10:00:00Z'));
});
