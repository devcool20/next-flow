'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function RouteLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  const start = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setActive(true);
    setProgress((prev) => (prev > 6 ? prev : 6));
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 86) return prev;
          const delta = Math.max(1.2, (86 - prev) * 0.12);
          return Math.min(86, prev + delta);
        });
      }, 120);
    }
  };

  const finish = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProgress(100);
    hideTimerRef.current = setTimeout(() => {
      setActive(false);
      setProgress(0);
      hideTimerRef.current = null;
    }, 230);
  };

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href') ?? '';
      if (href.startsWith('/') || href.startsWith('?')) {
        start();
      }
    };

    const onSubmit = () => {
      start();
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, []);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams?.toString()]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  return (
    <div className={`route-loading-track ${active ? 'is-active' : ''}`} aria-hidden>
      <div className="route-loading-bar" style={{ transform: `scaleX(${progress / 100})` }} />
    </div>
  );
}

