import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultData, validateData, validDate, validDateTime, money, newId, readImage } from '../src/model.ts';

test('default data can be exported and imported without losing fields', () => {
  const data = createDefaultData();
  assert.deepEqual(validateData(JSON.parse(JSON.stringify(data))), data);
  assert.equal(data.transactions.filter(row => row.date.startsWith('2026-09')).length, 0);
  assert.equal(data.transactions.filter(row => row.date.startsWith('2026-11')).length, 0);
  assert.equal(data.loans.length, 1);
});

test('edited balances, negative outflows and added rows round-trip', () => {
  const data = createDefaultData();
  data.profile.assets = 12345.67;
  data.loanSummary.available = 100;
  data.accounts[0].balance = 987.65;
  data.transactions.push({ ...data.transactions[0], id: 'new-row', amount: -120.5, balance: -10, date: '2026-11-15 10:00:00' });
  const saved = validateData(JSON.parse(JSON.stringify(data)));
  assert.equal(saved.profile.assets, 12345.67);
  assert.equal(saved.loanSummary.available, 100);
  assert.equal(saved.accounts[0].balance, 987.65);
  assert.equal(saved.transactions.at(-1)?.amount, -120.5);
  assert.equal(saved.transactions.at(-1)?.balance, -10);
});

test('deleting data and clearing image assets are valid', () => {
  const data = createDefaultData();
  data.loans = [];
  data.accounts = [];
  data.transactions = [];
  data.images.homeHero = '';
  assert.deepEqual(validateData(data), data);
});

test('restoring defaults returns a fresh independent copy', () => {
  const edited = createDefaultData();
  edited.loans[0].principal = 0;
  edited.profile.name = 'edited';
  edited.images.example = '';
  const restored = createDefaultData();
  assert.equal(restored.loans[0].principal, 3400000);
  assert.equal(restored.profile.name, '*晟');
  assert.deepEqual(restored.images, {});
});

test('reject unsupported, malformed or unbounded import data', () => {
  const data = createDefaultData();
  for (const input of [null, [], {}, { ...data, version: 2 }, { ...data, profile: null }, { ...data, loans: {} }, { ...data, transactions: Array(1001).fill(data.transactions[0]) }]) {
    assert.throws(() => validateData(input));
  }
  assert.throws(() => JSON.parse('{bad-json'));
  assert.throws(() => validateData({ ...data, accounts: [{ ...data.accounts[0], bank: 'a'.repeat(301) }] }));
});

test('numbers must be finite numeric values', () => {
  for (const invalid of [Infinity, -Infinity, NaN, '123', null, undefined]) {
    const data = createDefaultData();
    assert.throws(() => validateData({ ...data, loanSummary: { available: invalid, principal: 1 } }));
    assert.throws(() => validateData({ ...data, loans: [{ ...data.loans[0], principal: invalid }] }));
    assert.throws(() => validateData({ ...data, accounts: [{ ...data.accounts[0], balance: invalid }] }));
    assert.throws(() => validateData({ ...data, transactions: [{ ...data.transactions[0], amount: invalid }] }));
  }
});

test('invalid calendar dates and transaction times are rejected', () => {
  assert.equal(validDate('2024-02-29'), true);
  for (const date of ['2026-02-29', '2026-13-01', '2026-04-31', '2026-1-01', 'not-a-date']) assert.equal(validDate(date), false);
  assert.equal(validDateTime('2026-11-15 23:59:59'), true);
  for (const date of ['2026-11-15 24:00:00', '2026-11-15 12:60:00', '2026-11-15 12:00:60', '2026-02-29 12:00:00']) {
    assert.equal(validDateTime(date), false);
    const data = createDefaultData();
    assert.throws(() => validateData({ ...data, transactions: [{ ...data.transactions[0], date }] }));
  }
});

test('record identifiers must be non-empty and unique', () => {
  const data = createDefaultData();
  assert.throws(() => validateData({ ...data, loans: [data.loans[0], data.loans[0]] }));
  assert.throws(() => validateData({ ...data, accounts: [{ ...data.accounts[0], id: '' }] }));
  const ids = new Set(Array.from({ length: 100 }, () => newId('test')));
  assert.equal(ids.size, 100);
});

test('images accept local assets and bounded raster data only', () => {
  const data = createDefaultData();
  const accepted = validateData({ ...data, images: { hero: '/assets/reference/home-hero.png', deleted: '', upload: 'data:image/jpeg;base64,YWJj' } });
  assert.equal(accepted.images.deleted, '');
  for (const image of ['javascript:alert(1)', 'https://third-party.example/track.png', 'data:image/svg+xml;base64,YWJj', 'data:image/jpeg;base64,' + 'A'.repeat(1_000_000)]) {
    assert.throws(() => validateData({ ...data, images: { hero: image } }));
  }
});

test('import discards unknown fields without mutating the source', () => {
  const source = { ...createDefaultData(), unknown: true };
  const saved = validateData(source);
  assert.equal('unknown' in saved, false);
  saved.profile.name = 'different';
  assert.equal(source.profile.name, '*晟');
});

test('formatting retains cents and handles negative amounts', () => {
  assert.equal(money(3400000), '3,400,000.00');
  assert.equal(money(-120.5), '-120.50');
  assert.equal(money(0.06), '0.06');
  assert.equal(money(0), '0.00');
});

test('unsupported and oversized image files fail before decoding', async () => {
  await assert.rejects(readImage(new File(['<svg></svg>'], 'image.svg', { type: 'image/svg+xml' })));
  await assert.rejects(readImage(new File([new Uint8Array(20_000_001)], 'large.png', { type: 'image/png' })));
});
