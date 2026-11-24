import test from 'node:test';
import assert from 'node:assert/strict';
import {localDay,shiftDay,completion,csvCell} from '../src/model.mjs';
test('local day uses local calendar fields',()=>assert.equal(localDay(new Date(2026,10,24,23,59)),'2026-11-24'));
test('date navigation crosses month and leap day',()=>{assert.equal(shiftDay('2026-12-31',1),'2027-01-01');assert.equal(shiftDay('2024-03-01',-1),'2024-02-29')});
test('worship excluded from personal score',()=>assert.deepEqual(completion([{category:'Deen',target:1},{category:'Health',target:2},{category:'Career',target:30}],h=>h.category==='Health'?2:0),{done:1,total:2}));
test('CSV escaping and formula protection',()=>{assert.equal(csvCell('a"b'),'"a""b"');assert.equal(csvCell('=1+1'),'"\'=1+1"')});
