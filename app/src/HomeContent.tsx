import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronRightIcon } from '@radix-ui/react-icons';
import { Carousel } from './mobile';
import './home-content.css';

type HomeContentProps = {
  renderImage: (key: string, fallback: string, className?: string, onClick?: () => void) => ReactNode;
  renderIcon: (name: string) => ReactNode;
  mainMenu: ReactNode;
  onNavigate: (page: string, id?: string) => void;
};

const quickActions = [
  ['scan', '扫一扫'], ['receive', '收付款'], ['travel', '出行'], ['wallet', '电子卡包'],
] as const;
const promotions = [
  { key: 'homeFuelVideo', file: 'home-video-banner-fuel.png', title: '丰收加油惠' },
  { key: 'homeEtcVideo', file: 'home-video-banner-etc.png', title: 'ETC畅行优惠' },
] as const;
const lifeServices = [
  { id: 'sinopec', title: '中石化', description: '加油充电' },
  { id: 'calendar', title: '丰收日历', description: '农品月月更' },
  { id: 'thursday', title: '丰收星期四', description: '每周有好物' },
  { id: 'union', title: '丰收联盟', description: '乐享生活优惠' },
  { id: 'vegetables', title: '丰收菜篮子', description: '周四12点' },
] as const;
const payments = [
  ['electricity', '电费'], ['city', '城乡两费'], ['property', '物业费'], ['party', '党团费'],
] as const;
const articles = [
  { id: 'sport', title: '陪你奔赴主场！抖音话题挑战赛火热开启！', date: '11–05', reads: '999+赞·2327阅读' },
  { id: 'autumn', title: '【活动合集】感恩岁月，惊喜回响！多重惊喜，一站集齐。', date: '10–28', reads: '6548阅读' },
  { id: 'double11', title: '【惠享双11】四大平台省钱宝典上线，双十一薅羊毛看这篇~', date: '10–15', reads: '1万+阅读' },
] as const;

export default function HomeContent({ renderImage, renderIcon, mainMenu, onNavigate }: HomeContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const promotionRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [promotionIndex, setPromotionIndex] = useState(0);

  // The phone preview and native entry have different widths. Measure this
  // content wrapper instead of assuming a viewport or query-container width.
  useLayoutEffect(() => {
    const element = contentRef.current;
    if (!element) return;
    const measure = () => setContentWidth(element.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const itemWidth = Math.max(0, contentWidth - 32);
  useEffect(() => {
    if (!itemWidth) return;
    let pausedUntil = 0;
    const pause = () => { pausedUntil = Date.now() + 3000; };
    document.addEventListener('pointerdown', pause, true);
    document.addEventListener('touchstart', pause, { capture: true, passive: true });
    const timer = window.setInterval(() => {
      if (Date.now() < pausedUntil || document.hidden || document.querySelector('.is-editing')) return;
      const carousel = promotionRef.current?.querySelector<HTMLDivElement>('.mobile-carousel');
      if (!carousel) return;
      const current = Math.round(carousel.scrollLeft / (itemWidth + 12));
      carousel.scrollTo({ left: ((current + 1) % promotions.length) * (itemWidth + 12), behavior: 'smooth' });
    }, 6500);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('pointerdown', pause, true);
      document.removeEventListener('touchstart', pause, true);
    };
  }, [itemWidth]);
  const style = contentWidth ? { '--home-content-rail-width': `${itemWidth}px` } as CSSProperties : undefined;
  const service = (label: string) => onNavigate('service', label);
  const sectionTitle = (title: string, more = true) => (
    <div className="home-content-section-title">
      <h2>{title}</h2>
      {more ? <button type="button" onClick={() => service(title)}>更多<ChevronRightIcon /></button> : null}
    </div>
  );
  const changePromotion = (index: number) => {
    const carousel = promotionRef.current?.querySelector<HTMLDivElement>('.mobile-carousel');
    carousel?.scrollTo({ left: index * (itemWidth + 12), behavior: 'smooth' });
  };

  return (
    <div className="home-content" ref={contentRef} style={style}>
      <div className="home-content-quick" aria-label="快捷服务">
        {quickActions.map(([icon, label]) => (
          <button key={icon} type="button" onClick={() => service(label)}>{renderIcon(icon)}<span>{label}</span></button>
        ))}
      </div>

      {renderImage('homeHeroVideo', 'home-video-hero-double11.png', 'home-hero home-content-hero', () => service('双11狂欢购'))}

      <div className="home-content-menu">{mainMenu}</div>

      <button type="button" className="home-content-headline" onClick={() => service('丰收头条')}>
        <b>头条</b><em>资讯</em><span>陪你奔赴主场！抖音话题挑战赛火热开启！</span><ChevronRightIcon />
      </button>

      <div
        className="home-content-promotions"
        ref={promotionRef}
        onScrollCapture={event => {
          const element = event.target as HTMLElement;
          if (element.classList.contains('mobile-carousel') && itemWidth) {
            setPromotionIndex(Math.max(0, Math.min(promotions.length - 1, Math.round(element.scrollLeft / (itemWidth + 12)))));
          }
        }}
      >
        <Carousel ariaLabel="丰收优惠活动" className="home-content-promotion-carousel" contentClassName="home-content-promotion-track">
          {promotions.map(promotion => (
            <div className="home-content-promotion-item" key={promotion.key}>
              {renderImage(promotion.key, promotion.file, 'home-content-promotion-image', () => service(promotion.title))}
            </div>
          ))}
        </Carousel>
        <div className="home-content-promotion-dots" aria-label="选择优惠活动">
          {promotions.map((promotion, index) => <button key={promotion.key} type="button" aria-label={promotion.title} aria-current={promotionIndex === index ? 'true' : undefined} onClick={() => changePromotion(index)} />)}
        </div>
      </div>

      <section className="home-content-civic-section" aria-label="便捷民生">
        {sectionTitle('便捷民生', false)}
        {renderImage('homeServicesVideo', 'home-video-civic-card.png', 'home-services home-content-civic', () => service('便捷民生'))}
      </section>

      <section className="home-content-section" aria-label="优惠生活">
        {sectionTitle('优惠生活')}
        <div className="home-content-life-card">
          <div className="home-content-life-top">
            {lifeServices.slice(0, 3).map(item => (
              <button type="button" key={item.id} onClick={() => service(item.title)}>
                <img src={`/assets/reference/home-video-life-${item.id}.png`} alt="" draggable={false} />
                <b>{item.title}</b><span>{item.description}</span>
              </button>
            ))}
          </div>
          <div className="home-content-life-bottom">
            {lifeServices.slice(3).map(item => (
              <button type="button" key={item.id} onClick={() => service(item.title)}>
                <div><b>{item.title}</b><span>{item.description}</span></div>
                <img src={`/assets/reference/home-video-life-${item.id}.png`} alt="" draggable={false} />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="home-content-section" aria-label="信用卡e+金">
        {sectionTitle('信用卡e+金')}
        <div className="home-content-credit-grid">
          {renderImage('homeCreditInstallmentVideo', 'home-video-credit-installment.png', 'home-content-credit-card', () => service('现金分期'))}
          {renderImage('homeCreditCashVideo', 'home-video-credit-cash.png', 'home-content-credit-card', () => service('透支取现'))}
        </div>
      </section>

      <section className="home-content-section" aria-label="缴费通">
        {sectionTitle('缴费通')}
        <div className="home-content-payment-grid">
          {payments.map(([id, label]) => (
            <button key={id} type="button" onClick={() => service(label)}>
              <img src={`/assets/reference/home-video-payment-${id}.png`} alt="" draggable={false} /><span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="home-content-section" aria-label="丰收资讯">
        {sectionTitle('丰收资讯')}
        <div className="home-content-news-list">
          {articles.map(article => (
            <button className="home-content-article" key={article.id} type="button" onClick={() => service(article.title)}>
              <div className="home-content-article-copy">
                <b>{article.title}</b>
                <div className="home-content-article-meta"><span>{article.date}</span><span>{article.reads}</span><em>精彩活动</em></div>
              </div>
              <img src={`/assets/reference/home-video-news-${article.id}.png`} alt="" draggable={false} />
            </button>
          ))}
        </div>
      </section>

      <div className="home-content-customize"><button type="button" onClick={() => service('定制我的首页')}>定制我的首页</button></div>
    </div>
  );
}
