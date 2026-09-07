import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanText, requiredDate, requiredNumber } from '../src/lib/validation';
import { assertDateOrder, monthsBetween } from '../src/lib/projectMath';
import { newShareToken, parseRole } from '../src/lib/share';

test('cleanText: obligatorio', () => {
  assert.throws(() => cleanText('', 'x'), /obligatorio/);
  assert.throws(() => cleanText(undefined, 'x'), /obligatorio/);
  assert.equal(cleanText(undefined, 'x', false), undefined);
});

test('cleanText: rechaza < > y longitud', () => {
  assert.throws(() => cleanText('a<b', 'x'), /inválido/);
  assert.throws(() => cleanText('a'.repeat(301), 'x'), /inválido/);
  assert.equal(cleanText('  hola  ', 'x'), 'hola');
});

test('requiredDate', () => {
  assert.throws(() => requiredDate('no-fecha', 'd'), /fecha válida/);
  assert.throws(() => requiredDate('', 'd'), /fecha válida/);
  assert.ok(requiredDate('2026-03-01', 'd') instanceof Date);
});

test('requiredNumber: rango', () => {
  assert.throws(() => requiredNumber(-1, 'n'), /número válido/);
  assert.throws(() => requiredNumber(101, 'n', 0, 100), /número válido/);
  assert.equal(requiredNumber('42', 'n'), 42);
});

test('monthsBetween', () => {
  assert.equal(monthsBetween(new Date('2026-01-01'), new Date('2026-10-01')), 9);
  assert.equal(monthsBetween(new Date('2026-01-01'), new Date('2026-01-02')), 1);
});

test('assertDateOrder', () => {
  assert.throws(() => assertDateOrder(new Date('2026-05-01'), new Date('2026-01-01')), /anterior/);
  assert.doesNotThrow(() => assertDateOrder(new Date('2026-01-01'), new Date('2026-05-01')));
});

test('parseRole', () => {
  assert.equal(parseRole('editor'), 'editor');
  assert.equal(parseRole('viewer'), 'viewer');
  assert.equal(parseRole('otra-cosa'), 'viewer');
  assert.equal(parseRole(undefined), 'viewer');
});

test('newShareToken: único y seguro para URL', () => {
  const a = newShareToken();
  const b = newShareToken();
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]+$/);
  assert.ok(a.length >= 24);
});
