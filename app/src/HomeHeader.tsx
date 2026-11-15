import type { ReactNode } from 'react';
import { ChatBubbleIcon, ChevronDownIcon, HamburgerMenuIcon, MagnifyingGlassIcon, SpeakerLoudIcon } from '@radix-ui/react-icons';
import './home-header.css';

type Props = {
  compact: boolean;
  renderIcon: (name: string) => ReactNode;
  onNavigate: (page: string, id?: string) => void;
};

export default function HomeHeader({ compact, renderIcon, onNavigate }: Props) {
  const quick = [['scan', '扫一扫'], ['receive', '收付款'], ['travel', '出行'], ['wallet', '电子卡包']];
  return <header className={`home-chrome${compact ? ' is-compact' : ''}`} aria-label="首页顶部导航" data-compact={compact}>
    <div className="home-topbar">
      <button className="home-location" onClick={() => onNavigate('service', '选择城市')}>定位中<ChevronDownIcon /></button>
      {compact ? <div className="home-compact-actions">{quick.map(([name, label]) => <button key={name} aria-label={label} onClick={() => onNavigate('service', label)}>{renderIcon(name)}</button>)}</div>
        : <button className="home-search-field" aria-label="搜索" onClick={() => onNavigate('all')}><MagnifyingGlassIcon /><span>中石化支付优惠</span></button>}
      {compact ? <button className="home-header-icon" aria-label="搜索" onClick={() => onNavigate('all')}><MagnifyingGlassIcon /></button>
        : <button className="home-header-icon" aria-label="客服" onClick={() => onNavigate('service', '在线客服')}><SpeakerLoudIcon /></button>}
      <button className="home-header-icon" aria-label="消息" onClick={() => onNavigate('service', '消息')}><ChatBubbleIcon /></button>
      <button className="home-header-icon home-simple-mode" aria-label="简洁版" onClick={() => onNavigate('all')}><span>简洁版</span><HamburgerMenuIcon /></button>
    </div>
  </header>;
}
