import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { Capacitor, SystemBars, SystemBarsStyle, SystemBarType } from '@capacitor/core';

const headers: Record<string, string> = {
  home: '.home-chrome', finance: '.finance-top', loan: '.loan-top',
  life: '.life-title', mine: '.profile-top',
};

/** Extend the page's own background under the real iOS status bar, including after scrolling. */
export default function NativeStatusSurface({ page, revision, shellRef }: {
  page: string; revision: number; shellRef: RefObject<HTMLDivElement | null>;
}) {
  const [paint, setPaint] = useState<CSSProperties>({});
  const surfaceRef = useRef<HTMLDivElement>(null);
  const foreground = ['home', 'finance', 'mine'].includes(page) ? 'light' : 'dark';

  useLayoutEffect(() => {
    // A child's layout effect can run before its parent's ref is attached on the
    // first mount. Its own committed DOM already reaches the complete app shell.
    const shell = shellRef.current || surfaceRef.current?.closest('.native-app');
    const source = shell?.querySelector<HTMLElement>(headers[page] || '.screen-header');
    if (!source) return;
    const update = () => {
      const box = source.getBoundingClientRect();
      // Keep the entire background plane the same size as its source before clipping
      // to the safe area. This preserves gradients and image positions at the seam.
      setPaint({ background: getComputedStyle(source).background, width: box.width, height: box.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(source, { box: 'border-box' });
    window.addEventListener('resize', update);
    return () => { observer.disconnect(); window.removeEventListener('resize', update); };
  }, [page, revision, shellRef]);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'ios') return;
    void SystemBars.setStyle({
      style: foreground === 'light' ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
      bar: SystemBarType.StatusBar,
    }).catch(() => {});
  }, [foreground]);

  return <div ref={surfaceRef} className="native-status-surface" data-page={page} data-foreground={foreground} aria-hidden="true">
    <div className="native-status-paint" style={paint} />
  </div>;
}
