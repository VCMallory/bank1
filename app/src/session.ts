import type { EditTarget } from './model';

/** Demo access state only; this is not a server or banking authentication token. */
export type DemoRoute = { page: string; id?: string };
export type DemoAction = { kind: 'navigate'; route: DemoRoute } | { kind: 'edit'; target: EditTarget };
export type SessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const SESSION_KEY = 'demo-logged';
const TAB_PAGES = new Set(['home', 'finance', 'loan', 'life', 'mine']);

/** Accept the previous demo flag while safely handling disabled WebView storage. */
export function readDemoSession(storage?: SessionStorage): boolean {
  try { return (storage ?? globalThis.localStorage).getItem(SESSION_KEY) === 'true'; }
  catch { return false; }
}

/** The caller keeps React's session state even if persistence is unavailable. */
export function writeDemoSession(logged: boolean, storage?: SessionStorage): boolean {
  try {
    const selected = storage ?? globalThis.localStorage;
    if (logged) selected.setItem(SESSION_KEY, 'true');
    else selected.removeItem(SESSION_KEY);
    return true;
  } catch { return false; }
}

/** Home and the login form are the only public screens. Unknown routes are private. */
export function requiresDemoLogin(page: string): boolean {
  return page !== 'home' && page !== 'login';
}

/** Viewing the home page is public; editing its assets is a protected operation. */
export function canPerformDemoAction(logged: boolean, action: DemoAction): boolean {
  return logged || (action.kind === 'navigate' && !requiresDemoLogin(action.route.page));
}

/** Resolve a successful login without losing the requested record ID or edit target. */
export function completeDemoLogin(pending?: DemoAction | null): { stack: DemoRoute[]; edit: EditTarget | null } {
  if (pending?.kind === 'edit') return { stack: [{ page: 'home' }], edit: { ...pending.target } };
  const requested = pending?.route;
  const destination = requested && requested.page !== 'login' ? { ...requested } : { page: 'mine' };
  return { stack: TAB_PAGES.has(destination.page) ? [destination] : [{ page: 'home' }, destination], edit: null };
}

/** Back navigation cannot resurrect a protected screen after the demo logs out. */
export function sanitizeDemoStack(stack: DemoRoute[], logged: boolean): DemoRoute[] {
  const accepted = logged ? stack : stack.filter(route => !requiresDemoLogin(route.page));
  return accepted.length ? accepted.map(route => ({ ...route })) : [{ page: 'home' }];
}
