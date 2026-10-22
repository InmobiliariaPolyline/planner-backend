import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MAX_AVATAR_CHARS, parseProfile } from '../src/lib/profile';

describe('parseProfile', () => {
  it('acepta nombre, cargo, teléfono y color válidos', () => {
    const out = parseProfile({ name: '  Ana Torres ', jobTitle: 'Arquitecta', phone: '+51 987 654 321', avatarColor: '#2563EB' });
    assert.deepEqual(out, { name: 'Ana Torres', jobTitle: 'Arquitecta', phone: '+51 987 654 321', avatarColor: '#2563eb' });
  });

  it('solo devuelve las claves recibidas y vacía con null o texto vacío', () => {
    assert.deepEqual(parseProfile({ jobTitle: '' }), { jobTitle: null });
    assert.deepEqual(parseProfile({ avatarUrl: null }), { avatarUrl: null });
  });

  it('rechaza nombre corto, símbolos peligrosos y teléfono inválido', () => {
    assert.throws(() => parseProfile({ name: 'A' }));
    assert.throws(() => parseProfile({ name: '<b>x</b>' }));
    assert.throws(() => parseProfile({ phone: 'abc123' }));
    assert.throws(() => parseProfile({ avatarColor: 'rojo' }));
  });

  it('valida la foto: solo data URL de imagen y con tope de tamaño', () => {
    const ok = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    assert.equal(parseProfile({ avatarUrl: ok }).avatarUrl, ok);
    assert.throws(() => parseProfile({ avatarUrl: 'https://x.com/a.png' }));
    assert.throws(() => parseProfile({ avatarUrl: 'data:image/svg+xml;base64,PHN2Zz4=' }));
    assert.throws(() => parseProfile({ avatarUrl: `data:image/png;base64,${'A'.repeat(MAX_AVATAR_CHARS)}` }));
  });

  it('rechaza un cuerpo vacío', () => {
    assert.throws(() => parseProfile({}));
    assert.throws(() => parseProfile(null));
  });
});
