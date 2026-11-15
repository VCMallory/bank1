import { useCallback, useRef, useState, useEffect, type PointerEvent, type MouseEvent, type TouchEvent } from 'react';

export type Profile = { name: string; phone: string; lastLogin: string; assets: number; liabilities: number; income: number; expense: number };
export type Loan = { id: string; name: string; tail: string; bank: string; principal: number; available: number; rate: number; start: string; end: string };
export type Account = { id: string; bank: string; type: string; number: string; balance: number; image: string };
export type Transaction = { id: string; title: string; amount: number; balance: number; date: string; counterparty: string; account: string; channel: string; branch: string; purpose: string };
export type AppData = { version: 1; profile: Profile; loanSummary: { available: number; principal: number }; loans: Loan[]; accounts: Account[]; transactions: Transaction[]; images: Record<string, string> };
export type EditTarget = { kind: 'profile' | 'summary' | 'loan' | 'account' | 'transaction' | 'image' | 'manage'; id?: string; key?: string };
const STORAGE_KEY = 'harvest-finance-demo:v1';
const MAX_IMAGE_SIZE = 1_000_000;

export function createDefaultData(): AppData {
  return {
    version: 1,
    profile: { name: '*晟', phone: '188****4990', lastLogin: '2026-11-13 14:58:05', assets: 0.06, liabilities: 3400000, income: 194702.36, expense: 314612.26 },
    loanSummary: { available: 200000, principal: 3400000 },
    loans: [{ id: 'loan-1', name: '丰收创业卡', tail: '9052', bank: '义乌农商银行', principal: 3400000, available: 200000, rate: 2.42, start: '2026-10-16', end: '2027-10-14' }],
    accounts: [
      { id: 'account-1', bank: '义乌农商银行', type: '社保卡', number: '623091****0992', balance: 0.06, image: '/assets/reference/account-social-card.png' },
      { id: 'account-2', bank: '义乌农商银行', type: '电子账户', number: '623540****9007', balance: 0, image: '/assets/reference/account-electronic-card.png' },
    ],
    transactions: [
      { id: 'transaction-out', title: '受托支付', amount: -3400000, balance: 26.41, date: '2026-10-16 14:39:09', counterparty: '收款人', account: '62848****1877', channel: '移动前台系统（丰收互联）', branch: '义乌农商银行城站分理处', purpose: '受托支付' },
      { id: 'transaction-in', title: '互联网放', amount: 3400000, balance: 3400026.41, date: '2026-10-16 14:39:09', counterparty: '用户', account: '501017****6250', channel: '移动前台系统（丰收互联）', branch: '义乌农商银行城站分理处', purpose: '互联网放款' },
    ],
    images: {},
  };
}

const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
function validText(value: unknown, max = 300): value is string { return typeof value === 'string' && value.length <= max; }
function validNumber(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 999_999_999_999.99; }
function validImage(value: unknown): value is string {
  return typeof value === 'string' && (value === '' || /^\/assets\/[A-Za-z0-9_.\-/]+$/.test(value) || (value.length <= MAX_IMAGE_SIZE && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)));
}
function requireFields(value: unknown, texts: string[], numbers: string[], label: string): asserts value is Record<string, unknown> {
  if (!record(value) || texts.some(key => !validText(value[key])) || numbers.some(key => !validNumber(value[key]))) throw new Error(`${label}格式不正确，请检查文字和数字。`);
}
function requireRows(value: unknown, texts: string[], numbers: string[], label: string): asserts value is Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length > 1000) throw new Error(`${label}必须是数组，且最多 1000 条。`);
  const ids = new Set<string>();
  for (const item of value) {
    requireFields(item, ['id', ...texts], numbers, label);
    const id = item.id as string;
    if (!id || ids.has(id)) throw new Error(`${label}的编号不能为空或重复。`);
    ids.add(id);
  }
}

export function validateData(value: unknown): AppData {
  if (!record(value) || value.version !== 1) throw new Error('不支持的数据版本，请导入本应用导出的 JSON。');
  requireFields(value.profile, ['name', 'phone', 'lastLogin'], ['assets', 'liabilities', 'income', 'expense'], '个人资料');
  requireFields(value.loanSummary, [], ['available', 'principal'], '贷款汇总');
  requireRows(value.loans, ['name', 'tail', 'bank', 'start', 'end'], ['principal', 'available', 'rate'], '贷款');
  requireRows(value.accounts, ['bank', 'type', 'number'], ['balance'], '账户');
  requireRows(value.transactions, ['title', 'date', 'counterparty', 'account', 'channel', 'branch', 'purpose'], ['amount', 'balance'], '交易');
  if (value.accounts.some(item => !validImage(item.image))) throw new Error('账户图片格式不正确。');
  if (value.loans.some(item => !validDate(item.start as string) || !validDate(item.end as string))) throw new Error('贷款日期请使用 YYYY-MM-DD 格式。');
  if (value.transactions.some(item => !validDateTime(item.date as string))) throw new Error('交易时间请使用 YYYY-MM-DD HH:mm:ss 格式。');
  if (!record(value.images) || Object.keys(value.images).length > 200 || Object.entries(value.images).some(([key, image]) => !key || key.length > 300 || !validImage(image))) throw new Error('图片数据格式不正确。');
  // Rebuild the accepted schema rather than retaining arbitrary imported properties.
  const pick = (source: Record<string, unknown>, keys: string[]) => Object.fromEntries(keys.map(key => [key, source[key]]));
  return {
    version: 1,
    profile: pick(value.profile, ['name', 'phone', 'lastLogin', 'assets', 'liabilities', 'income', 'expense']) as Profile,
    loanSummary: pick(value.loanSummary, ['available', 'principal']) as AppData['loanSummary'],
    loans: value.loans.map(item => pick(item, ['id', 'name', 'tail', 'bank', 'principal', 'available', 'rate', 'start', 'end']) as Loan),
    accounts: value.accounts.map(item => pick(item, ['id', 'bank', 'type', 'number', 'balance', 'image']) as Account),
    transactions: value.transactions.map(item => pick(item, ['id', 'title', 'amount', 'balance', 'date', 'counterparty', 'account', 'channel', 'branch', 'purpose']) as Transaction),
    images: Object.fromEntries(Object.entries(value.images)) as Record<string, string>,
  };
}
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function validDateTime(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) && validDate(value.slice(0, 10)) && Number(value.slice(11, 13)) < 24 && Number(value.slice(14, 16)) < 60 && Number(value.slice(17, 19)) < 60;
}
export const money = (amount: number) => Number.isFinite(amount) ? amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
export const newId = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2)}`;

function initialState(): { data: AppData; error: string | null } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const data = stored ? validateData(JSON.parse(stored)) : createDefaultData();
    if (data.profile.name === '*用户') data.profile.name = '*晟';
    if (data.profile.phone === '188****0000') data.profile.phone = '188****4990';
    for (const transaction of data.transactions) {
      if (transaction.id === 'transaction-out' && transaction.counterparty === '演示收款人') transaction.counterparty = '收款人';
      if (transaction.id === 'transaction-in' && transaction.counterparty === '演示用户') transaction.counterparty = '用户';
    }
    return { data, error: null };
  } catch { return { data: createDefaultData(), error: '本地数据无法读取，已载入默认数据。' }; }
}

export function useStore() {
  const [state, setState] = useState(initialState);
  const current = useRef(state.data);
  const commit = useCallback((candidate: unknown): boolean => {
    try {
      const accepted = validateData(candidate);
      let storageWarning: string | null = null;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(accepted)); }
      catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') throw error;
        // Disabled browser/WebView storage must not prevent this session's edits.
        storageWarning = '本机存储不可用，修改仅在本次会话保留，请导出备份。';
      }
      current.current = accepted;
      setState({ data: accepted, error: storageWarning });
      return true;
    } catch (error) {
      setState(previous => ({ ...previous, error: error instanceof DOMException && error.name === 'QuotaExceededError' ? '本机存储空间不足，请删除部分图片或导出备份后清理。' : error instanceof Error ? error.message : '保存失败，请重试。' }));
      return false;
    }
  }, []);
  const update = useCallback((updater: (draft: AppData) => void): boolean => {
    try { const next = structuredClone(current.current); updater(next); return commit(next); }
    catch (error) { setState(previous => ({ ...previous, error: error instanceof Error ? error.message : '无法修改数据。' })); return false; }
  }, [commit]);
  const reset = useCallback(() => commit(createDefaultData()), [commit]);
  const importData = useCallback((json: string): boolean => {
    if (json.length > 10_000_000) { setState(previous => ({ ...previous, error: '导入文件过大，最大支持 10 MB。' })); return false; }
    try { return commit(JSON.parse(json)); }
    catch { setState(previous => ({ ...previous, error: 'JSON 无法解析，请选择本应用导出的数据文件。' })); return false; }
  }, [commit]);
  const exportData = useCallback(() => JSON.stringify(current.current, null, 2), []);
  const clearError = useCallback(() => setState(previous => ({ ...previous, error: null })), []);
  return { data: state.data, error: state.error, update, reset, importData, exportData, clearError };
}

/** Hold still to edit; native touch scrolling must remain free to take over. */
export function useLongPress(callback: () => void) {
  const state = useRef({ timer: undefined as ReturnType<typeof setTimeout> | undefined, x: 0, y: 0, fired: false, moved: false, active: false, input: 'pointer' as 'pointer' | 'touch' });
  const latest = useRef(callback); latest.current = callback;
  const cancel = useCallback(() => { clearTimeout(state.current.timer); state.current.timer = undefined; state.current.active = false; }, []);
  useEffect(() => {
    const onScroll = () => { if (state.current.active) { state.current.moved = true; cancel(); } };
    const onMultiTouch = (event: globalThis.TouchEvent) => { if (event.touches.length !== 1) { state.current.moved = true; cancel(); } };
    document.addEventListener('touchstart', onMultiTouch, { capture: true, passive: true });
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('blur', cancel);
    return () => { cancel(); document.removeEventListener('touchstart', onMultiTouch, true); document.removeEventListener('scroll', onScroll, true); window.removeEventListener('blur', cancel); };
  }, [cancel]);
  const ownsTarget = (event: { target: EventTarget; currentTarget: HTMLElement }) => event.target instanceof Element && event.target.closest('[data-long-press]') === event.currentTarget;
  const begin = (x: number, y: number, input: 'pointer' | 'touch') => {
    cancel();
    state.current = { timer: undefined, x, y, fired: false, moved: false, active: true, input };
    state.current.timer = setTimeout(() => {
      if (!state.current.active) return;
      state.current.fired = true; state.current.active = false; latest.current();
    }, 600);
  };
  const move = (x: number, y: number) => {
    if (Math.hypot(x - state.current.x, y - state.current.y) > 12) { state.current.moved = true; cancel(); }
  };
  return {
    'data-long-press': 'true',
    onTouchStart: (event: TouchEvent<HTMLElement>) => {
      if (!ownsTarget(event)) return;
      if (event.touches.length !== 1) { state.current.moved = true; cancel(); return; }
      const touch = event.touches[0]; begin(touch.clientX, touch.clientY, 'touch');
    },
    onTouchMove: (event: TouchEvent<HTMLElement>) => {
      if (!ownsTarget(event) || state.current.input !== 'touch') return;
      if (event.touches.length !== 1) { state.current.moved = true; cancel(); return; }
      const touch = event.touches[0]; move(touch.clientX, touch.clientY);
    },
    onTouchEnd: cancel,
    onTouchCancel: () => { state.current.moved = true; cancel(); },
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (!ownsTarget(event) || event.pointerType === 'touch') return;
      state.current.input = 'pointer';
      if (event.button !== 0 || !event.isPrimary) { cancel(); state.current.fired = false; state.current.moved = false; return; }
      begin(event.clientX, event.clientY, 'pointer');
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => { if (state.current.input === 'pointer') move(event.clientX, event.clientY); },
    onPointerUp: () => { if (state.current.input === 'pointer') cancel(); },
    onPointerLeave: () => { if (state.current.input === 'pointer') cancel(); },
    onPointerCancel: () => { if (state.current.input === 'pointer') { state.current.moved = true; cancel(); } },
    onContextMenu: (event: MouseEvent<HTMLElement>) => {
      if (!ownsTarget(event)) return;
      event.preventDefault(); event.stopPropagation();
      if (state.current.input === 'touch' || state.current.fired || state.current.moved) return;
      cancel(); state.current.fired = true; latest.current();
    },
    onClickCapture: (event: MouseEvent<HTMLElement>) => {
      if (ownsTarget(event) && (state.current.fired || state.current.moved)) { event.preventDefault(); event.stopPropagation(); }
    },
  };
}

export async function readImage(file: File): Promise<string> {
  if (!/^image\/(?:png|jpeg|webp|gif|avif)$/.test(file.type)) throw new Error('请选择 PNG、JPEG、WebP、GIF 或 AVIF 图片。');
  if (file.size > 20_000_000) throw new Error('图片不能超过 20 MB。');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url; await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('图片内容无法读取。');
    const ratio = Math.min(1, 1440 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio)); canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('当前设备无法处理此图片。');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let output = canvas.toDataURL('image/jpeg', 0.85);
    if (output.length > MAX_IMAGE_SIZE) output = canvas.toDataURL('image/jpeg', 0.58);
    if (output.length > MAX_IMAGE_SIZE) throw new Error('压缩后的图片仍过大，请选择较小的图片。');
    return output;
  } catch (error) { throw new Error(error instanceof Error ? error.message : '图片读取失败，请换一张图片。'); }
  finally { URL.revokeObjectURL(url); }
}
