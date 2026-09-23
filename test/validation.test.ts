import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanText, requiredDate, requiredNumber } from '../src/lib/validation';
import { assertDateOrder, monthsBetween } from '../src/lib/projectMath';
import { newShareToken, parseRole } from '../src/lib/share';
import { metricComponents, parseMaterialValues, parseQuantity } from '../src/lib/materials';

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

test('metricComponents: respeta paréntesis y descarta la nota final', () => {
  assert.deepEqual(metricComponents('Volumen (m³)'), ['Volumen (m³)']);
  assert.deepEqual(metricComponents('Peso (kg / ton)'), ['Peso (kg / ton)']);
  assert.deepEqual(metricComponents('Volumen (m³) / Área (m²)'), ['Volumen (m³)', 'Área (m²)']);
  assert.deepEqual(metricComponents('Peso (kg / ton) / Longitud (m)'), ['Peso (kg / ton)', 'Longitud (m)']);
  assert.deepEqual(metricComponents('Área (m²) — se cotiza por peso areal (g/m²)'), ['Área (m²)']);
});

test('parseMaterialValues: exige un número > 0 por cada valor de la métrica', () => {
  const label = 'Peso (kg / ton) / Longitud (m)';
  assert.throws(() => parseMaterialValues(undefined, label), /objeto|número/i);
  assert.throws(() => parseMaterialValues({ 'Peso (kg / ton)': 5 }, label), /Longitud/);
  assert.throws(() => parseMaterialValues({ 'Peso (kg / ton)': 0, 'Longitud (m)': 5 }, label), /Peso/);
  assert.deepEqual(parseMaterialValues({ 'Peso (kg / ton)': 120, 'Longitud (m)': 5, extra: 1 }, label), {
    'Peso (kg / ton)': 120,
    'Longitud (m)': 5,
  });
});

test('parseQuantity: exige un número mayor que 0', () => {
  assert.throws(() => parseQuantity(0), /mayor que 0/);
  assert.throws(() => parseQuantity(-5), /mayor que 0/);
  assert.throws(() => parseQuantity(undefined), /mayor que 0/);
  assert.throws(() => parseQuantity('abc'), /mayor que 0/);
  assert.equal(parseQuantity(12.5), 12.5);
  assert.equal(parseQuantity('8'), 8);
});
