import test from 'node:test';
import assert from 'node:assert/strict';
import { canPerformDemoAction, completeDemoLogin, readDemoSession, requiresDemoLogin, sanitizeDemoStack, writeDemoSession, type SessionStorage } from '../src/session.ts';

function storage(value?: string): SessionStorage & { values: Map<string, string> } {
  const values = new Map<string, string>(value === undefined ? [] : [['demo-logged', value]]);
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, text) => { values.set(key, text); }, removeItem: key => { values.delete(key); } };
}

test('session reads the existing flag and rejects all non-true values', () => {
  assert.equal(readDemoSession(storage('true')), true);
  for (const value of [undefined, 'false', '', '1', 'TRUE']) assert.equal(readDemoSession(storage(value)), false);
});

test('storage errors cannot crash initial session reads, login, or logout', () => {
  const disabled: SessionStorage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  assert.equal(readDemoSession(disabled), false);
  assert.equal(writeDemoSession(true, disabled), false);
  assert.equal(writeDemoSession(false, disabled), false);
});

test('login saves the compatible flag and logout removes it', () => {
  const local = storage();
  assert.equal(writeDemoSession(true, local), true);
  assert.equal(readDemoSession(local), true);
  assert.equal(writeDemoSession(false, local), true);
  assert.equal(readDemoSession(local), false);
});

test('only home and the login form are visible before login', () => {
  assert.equal(requiresDemoLogin('home'), false);
  assert.equal(requiresDemoLogin('login'), false);
  for (const page of ['finance', 'loan', 'life', 'mine', 'accounts', 'myloans', 'records', 'transactions', 'detail', 'transfer', 'borrow', 'repay', 'all', 'settings', 'service', 'unrecognized']) {
    assert.equal(requiresDemoLogin(page), true, `${page} must require login`);
    assert.equal(canPerformDemoAction(false, { kind: 'navigate', route: { page } }), false);
    assert.equal(canPerformDemoAction(true, { kind: 'navigate', route: { page } }), true);
  }
});

test('all edits require login, including home and login-page images', () => {
  for (const target of [{ kind: 'manage' }, { kind: 'image', key: 'homeHero' }, { kind: 'image', key: 'loginAvatar' }, { kind: 'profile' }, { kind: 'transaction', id: 'transaction-out' }] as const) {
    assert.equal(canPerformDemoAction(false, { kind: 'edit', target }), false);
    assert.equal(canPerformDemoAction(true, { kind: 'edit', target }), true);
  }
});

test('successful login returns to the requested tab or record detail', () => {
  assert.deepEqual(completeDemoLogin({ kind: 'navigate', route: { page: 'loan' } }), { stack: [{ page: 'loan' }], edit: null });
  assert.deepEqual(completeDemoLogin({ kind: 'navigate', route: { page: 'detail', id: 'transaction-out' } }), { stack: [{ page: 'home' }, { page: 'detail', id: 'transaction-out' }], edit: null });
  assert.deepEqual(completeDemoLogin(), { stack: [{ page: 'mine' }], edit: null });
  assert.deepEqual(completeDemoLogin({ kind: 'navigate', route: { page: 'login' } }), { stack: [{ page: 'mine' }], edit: null });
});

test('successful login can resume the exact protected image-edit request', () => {
  const target = { kind: 'image', key: 'homeHero', id: '/assets/reference/home-hero.png' } as const;
  const completed = completeDemoLogin({ kind: 'edit', target });
  assert.deepEqual(completed, { stack: [{ page: 'home' }], edit: target });
  assert.notEqual(completed.edit, target);
});

test('back navigation drops previously visited protected screens after logout', () => {
  const history = [{ page: 'home' }, { page: 'accounts' }, { page: 'detail', id: 'transaction-out' }];
  assert.deepEqual(sanitizeDemoStack(history, false), [{ page: 'home' }]);
  assert.deepEqual(sanitizeDemoStack(history, true), history);
  assert.deepEqual(sanitizeDemoStack([], false), [{ page: 'home' }]);
  assert.deepEqual(sanitizeDemoStack([{ page: 'settings' }], false), [{ page: 'home' }]);
});
