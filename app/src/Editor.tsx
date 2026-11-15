import { useState, type ChangeEvent, type FormEvent, type InputHTMLAttributes } from 'react';
import { BottomSheet, KeyboardInput, useKeyboard } from './mobile';
import { createDefaultData, newId, readImage, useStore, type EditTarget, type Loan, type Account, type Transaction } from './model';
import './editor.css';
export { useLongPress } from './model';
export type { EditTarget } from './model';

type Store = ReturnType<typeof useStore>;
type Props = { target: EditTarget | null; onClose: () => void; store: Store; native?: boolean };
type Field = { name: string; label: string; number?: boolean; type?: string };
const fields: Record<string, Field[]> = {
  profile: [{ name: 'name', label: '显示姓名' }, { name: 'phone', label: '显示手机号' }, { name: 'lastLogin', label: '上次登录时间' }, { name: 'assets', label: '总资产（元）', number: true }, { name: 'liabilities', label: '总负债（元）', number: true }, { name: 'income', label: '本月收入（元）', number: true }, { name: 'expense', label: '本月支出（元）', number: true }],
  summary: [{ name: 'available', label: '可借额度（元）', number: true }, { name: 'principal', label: '待还本金（元）', number: true }],
  loan: [{ name: 'name', label: '贷款名称' }, { name: 'tail', label: '卡号后四位' }, { name: 'bank', label: '银行名称' }, { name: 'principal', label: '待还本金（元）', number: true }, { name: 'available', label: '剩余可借额度（元）', number: true }, { name: 'rate', label: '年利率（%）', number: true }, { name: 'start', label: '借款日期', type: 'date' }, { name: 'end', label: '到期日期', type: 'date' }],
  account: [{ name: 'bank', label: '银行名称' }, { name: 'type', label: '账户类型' }, { name: 'number', label: '显示卡号' }, { name: 'balance', label: '可用余额（元）', number: true }],
  transaction: [{ name: 'title', label: '摘要类型' }, { name: 'amount', label: '交易金额（收入为正，支出为负）', number: true }, { name: 'balance', label: '交易后余额（元）', number: true }, { name: 'date', label: '交易时间（YYYY-MM-DD HH:mm:ss）' }, { name: 'counterparty', label: '对方姓名' }, { name: 'account', label: '对方账号' }, { name: 'channel', label: '交易渠道' }, { name: 'branch', label: '交易网点' }, { name: 'purpose', label: '用途' }],
};
const titles: Record<EditTarget['kind'], string> = { profile: '编辑个人资料', summary: '编辑贷款汇总', loan: '编辑贷款', account: '编辑账户', transaction: '编辑交易', image: '编辑图片', manage: '管理演示数据' };

async function copyBackup(text: string): Promise<void> {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(text); return;
  } catch {
    // Some WKWebView/Android WebView versions lack the async Clipboard API.
    const textarea = document.createElement('textarea');
    textarea.value = text; textarea.readOnly = true;
    textarea.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none';
    document.body.append(textarea);
    try { textarea.focus(); textarea.select(); textarea.setSelectionRange(0, text.length); if (!document.execCommand('copy')) throw new Error('Copy unavailable'); }
    finally { textarea.remove(); }
  }
}

function startingValue(target: EditTarget, store: Store): Record<string, string> {
  const today = new Date().toISOString().slice(0, 10);
  const defaults = createDefaultData();
  let source: object = {};
  if (target.kind === 'profile') source = store.data.profile;
  if (target.kind === 'summary') source = store.data.loanSummary;
  if (target.kind === 'loan') source = store.data.loans.find(item => item.id === target.id) || { ...defaults.loans[0], id: newId('loan'), principal: 0, available: 0, start: today };
  if (target.kind === 'account') source = store.data.accounts.find(item => item.id === target.id) || { ...defaults.accounts[0], id: newId('account'), number: '****0000', balance: 0 };
  if (target.kind === 'transaction') source = store.data.transactions.find(item => item.id === target.id) || { ...defaults.transactions[0], id: newId('transaction'), title: '转入', amount: 0, balance: 0, date: `${today} 12:00:00`, counterparty: '演示用户', purpose: '演示交易' };
  return Object.fromEntries(Object.entries(source).map(([key, value]) => [key, String(value)]));
}

export default function Editor({ target, onClose, store, native = false }: Props) {
  if (!target) return null;
  return native ? <div className="demo-editor-overlay" onClick={onClose}><section className="demo-editor-panel" role="dialog" aria-modal="true" aria-label={titles[target.kind]} onClick={event => event.stopPropagation()}><EditorBody key={`${target.kind}:${target.id}:${target.key}`} {...{ target, store, native, onClose }} /></section></div>
    : <BottomSheet open onOpenChange={open => { if (!open) onClose(); }} title={titles[target.kind]} snap={0.94}><TemplateEditor key={`${target.kind}:${target.id}:${target.key}`} {...{ target, store, native, onClose }} /></BottomSheet>;
}
export { Editor };

function TemplateEditor(props: Props & { target: EditTarget }) {
  const keyboard = useKeyboard();
  return <div className="demo-editor-template"><EditorBody {...props} dismissKeyboard={keyboard.hide} onClose={() => { keyboard.hide(); props.onClose(); }} /></div>;
}

function EditorBody({ target, onClose, store, native, dismissKeyboard }: Props & { target: EditTarget; dismissKeyboard?: () => void }) {
  const [selected, setSelected] = useState<EditTarget | null>(null);
  const [exportJson, setExportJson] = useState('');
  const [notice, setNotice] = useState('');
  const [resetConfirm, setResetConfirm] = useState(false);
  if (selected) return <DataForm key={`${selected.kind}:${selected.id}`} target={selected} onClose={() => { dismissKeyboard?.(); setSelected(null); }} store={store} native={native} />;
  if (target.kind !== 'manage') return <DataForm target={target} onClose={onClose} store={store} native={native} />;
  const exportFile = () => {
    const json = store.exportData(); setExportJson(json);
    if (native) { setNotice('数据已生成，可复制保存。'); return; }
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = '丰收演示数据.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('已导出演示数据。');
  };
  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = '';
    if (!file) return;
    if (file.size > 10_000_000) { setNotice('导入文件不能超过 10 MB。'); return; }
    try { const ok = store.importData(await file.text()); setNotice(ok ? '导入完成。' : '导入失败，请检查下方错误。'); }
    catch { setNotice('文件读取失败，请重试。'); }
  };
  return <div className="demo-editor-content">
    <div className="demo-editor-heading"><h2>管理演示数据</h2><button type="button" onClick={onClose} aria-label="关闭编辑器">关闭</button></div>
    <p className="demo-editor-help">长按页面里的金额、记录或图片，即可编辑。本机保存，重启后保留。</p>
    <div className="demo-editor-actions">
      <button onClick={() => setSelected({ kind: 'profile' })}>个人资料与资产</button><button onClick={() => setSelected({ kind: 'summary' })}>贷款汇总</button>
      <button onClick={() => setSelected({ kind: 'loan' })}>新增贷款</button><button onClick={() => setSelected({ kind: 'account' })}>新增账户</button><button onClick={() => setSelected({ kind: 'transaction' })}>新增交易</button>
    </div>
    <div className="demo-editor-records"><h3>贷款（{store.data.loans.length}）</h3>{store.data.loans.map(item => <button key={item.id} onClick={() => setSelected({ kind: 'loan', id: item.id })}>{item.name} {item.tail}<span>编辑</span></button>)}
      <h3>账户（{store.data.accounts.length}）</h3>{store.data.accounts.map(item => <button key={item.id} onClick={() => setSelected({ kind: 'account', id: item.id })}>{item.type} {item.number.slice(-4)}<span>编辑</span></button>)}
      <h3>交易（{store.data.transactions.length}）</h3>{store.data.transactions.map(item => <button key={item.id} onClick={() => setSelected({ kind: 'transaction', id: item.id })}>{item.title} {item.date.slice(0, 10)}<span>编辑</span></button>)}
    </div>
    <div className="demo-editor-actions"><button onClick={exportFile}>导出 JSON 备份</button><label className="demo-file-button">导入 JSON 备份<input type="file" accept="application/json,.json" aria-label="导入 JSON 备份" onChange={importFile} /></label>
      <button className="demo-danger" onClick={() => { if (resetConfirm) { if (store.reset()) { setNotice('已恢复默认演示数据。'); setResetConfirm(false); } } else setResetConfirm(true); }}>{resetConfirm ? '确认恢复默认（会替换本机数据）' : '恢复默认数据'}</button>
      {resetConfirm ? <button onClick={() => setResetConfirm(false)}>取消恢复</button> : null}
    </div>
    {exportJson ? <div className="demo-export"><p>JSON 备份</p><textarea aria-label="导出的 JSON 数据" value={exportJson} readOnly rows={5} /><button onClick={async () => { try { await copyBackup(exportJson); setNotice('已复制备份。'); } catch { setNotice('无法自动复制，请选中上方文本手动复制。'); } }}>复制备份</button></div> : null}
    {notice ? <p role="status" className="demo-editor-notice">{notice}</p> : null}{store.error ? <p role="alert" className="demo-editor-error">{store.error}</p> : null}
  </div>;
}

function DataForm({ target, onClose, store, native }: Props & { target: EditTarget }) {
  const [values, setValues] = useState(() => startingValue(target, store));
  const originalImage = target.id || (target.key?.startsWith('/assets/') ? target.key : '') || '';
  const [image, setImage] = useState(() => target.kind === 'image' ? store.data.images[target.key || ''] ?? originalImage : target.kind === 'account' ? store.data.images[`account-${target.id}`] ?? values.image ?? '' : values.image ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const isNew = !target.id && ['loan', 'account', 'transaction'].includes(target.kind);
  const title = isNew ? titles[target.kind].replace('编辑', '新增') : titles[target.kind];
  const changeImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (!file) return;
    setBusy(true); setError('');
    try { setImage(await readImage(file)); } catch (cause) { setError(cause instanceof Error ? cause.message : '图片读取失败。'); }
    finally { setBusy(false); }
  };
  const save = (event: FormEvent) => {
    event.preventDefault(); setError('');
    const next: Record<string, string | number> = { ...values };
    for (const field of fields[target.kind] || []) {
      if (field.number) {
        const raw = values[field.name]?.trim();
        if (!raw || !Number.isFinite(Number(raw))) { setError(`${field.label}请输入有效数字。`); return; }
        next[field.name] = Number(raw);
      }
    }
    const ok = store.update(draft => {
      if (target.kind === 'profile') Object.assign(draft.profile, next);
      if (target.kind === 'summary') Object.assign(draft.loanSummary, next);
      if (target.kind === 'image') { if (!target.key) throw new Error('未指定图片位置。'); draft.images[target.key] = image; }
      if (target.kind === 'loan') { const index = draft.loans.findIndex(item => item.id === target.id); if (index < 0) draft.loans.push(next as unknown as Loan); else draft.loans[index] = next as unknown as Loan; }
      if (target.kind === 'account') { const record = { ...next, image } as unknown as Account; const index = draft.accounts.findIndex(item => item.id === target.id); if (index < 0) draft.accounts.push(record); else draft.accounts[index] = record; delete draft.images[`account-${record.id}`]; }
      if (target.kind === 'transaction') { const index = draft.transactions.findIndex(item => item.id === target.id); if (index < 0) draft.transactions.push(next as unknown as Transaction); else draft.transactions[index] = next as unknown as Transaction; }
    });
    if (ok) onClose();
  };
  const remove = () => {
    if (!deleting) { setDeleting(true); return; }
    const ok = store.update(draft => {
      if (target.kind === 'loan') draft.loans = draft.loans.filter(item => item.id !== target.id);
      if (target.kind === 'account') { draft.accounts = draft.accounts.filter(item => item.id !== target.id); delete draft.images[`account-${target.id}`]; }
      if (target.kind === 'transaction') draft.transactions = draft.transactions.filter(item => item.id !== target.id);
      if (target.kind === 'image' && target.key) draft.images[target.key] = '';
    });
    if (ok) onClose();
  };
  const inputProps = (field: Field): InputHTMLAttributes<HTMLInputElement> => ({ id: `edit-${field.name}`, name: field.name, type: field.type || 'text', inputMode: field.number ? 'decimal' : undefined, value: values[field.name] || '', maxLength: 300, onChange: event => setValues(previous => ({ ...previous, [field.name]: event.target.value })) });
  return <form className="demo-editor-content" onSubmit={save}>
    <div className="demo-editor-heading"><h2>{title}</h2><button type="button" onClick={onClose} aria-label="关闭编辑器">关闭</button></div>
    <p className="demo-editor-help">修改仅保存在本机演示数据中。</p>
    {(fields[target.kind] || []).map(field => <label className="demo-editor-field" key={field.name} htmlFor={`edit-${field.name}`}><span>{field.label}</span>{native ? <input {...inputProps(field)} /> : <KeyboardInput {...inputProps(field)} />}</label>)}
    {target.kind === 'account' || target.kind === 'image' ? <div className="demo-image-field"><span>图片</span>{image ? <img src={image} alt="当前图片预览" /> : <p className="demo-editor-help">此位置暂不显示图片</p>}<label className="demo-file-button">{busy ? '正在处理…' : '选择本机图片'}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" aria-label="选择本机图片" disabled={busy} onChange={changeImage} /></label>
      <button type="button" onClick={() => setImage('')}>清空图片</button>{target.kind === 'image' && originalImage ? <button type="button" onClick={() => setImage(originalImage)}>使用原始图片</button> : null}</div> : null}
    {error || store.error ? <p role="alert" className="demo-editor-error">{error || store.error}</p> : null}
    <div className="demo-editor-footer"><button className="demo-save" type="submit" disabled={busy}>保存修改</button>{target.id || target.kind === 'image' ? <button type="button" className="demo-danger" onClick={remove}>{deleting ? '再次点击确认删除' : target.kind === 'image' ? '删除此图片' : '删除这条数据'}</button> : null}{deleting ? <button type="button" onClick={() => setDeleting(false)}>取消删除</button> : null}</div>
  </form>;
}
