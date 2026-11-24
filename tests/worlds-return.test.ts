import assert from 'node:assert/strict';
import {test} from 'node:test';
import {rememberWorldsReturn,takeWorldsReturn} from '../src/worlds-return';

function tab() {
  const values = new Map<string,string>();
  return {
    setItem: (key:string,value:string) => values.set(key,value),
    getItem: (key:string) => values.get(key) ?? null,
    removeItem: (key:string) => values.delete(key),
  };
}

test('a known section or invited room returns once in the same tab', () => {
  const storage = tab();
  for (const fragment of ['#spielen','#beitragen','#moderation','#raum/ABCD2345']) {
    rememberWorldsReturn(storage,fragment,1000);
    assert.equal(takeWorldsReturn(tab(),1001),null);
    assert.equal(takeWorldsReturn(storage,1001),fragment);
    assert.equal(takeWorldsReturn(storage,1001),null);
  }
});

test('a saved destination must be timely and on the exact list of Music pages', () => {
  const storage = tab();
  for (const fragment of ['https://foreign.test/','//foreign.test/','#profil','#raum/ABCD2345\n','#raum/ABCD2345?next=//foreign.test/']) {
    rememberWorldsReturn(storage,fragment,1000);
    assert.equal(takeWorldsReturn(storage,1001),null);
  }
  rememberWorldsReturn(storage,'#spielen',1000);
  assert.equal(takeWorldsReturn(storage,1000+15*60_000),null);
  rememberWorldsReturn(storage,'#beitragen',1000);
  assert.equal(takeWorldsReturn(storage,999),null);
  storage.setItem('mw-worlds-return','1000://foreign.test/');
  assert.equal(takeWorldsReturn(storage,1001),null);
});
