import React, { useEffect } from 'react';
import { usePlatform } from '../context/PlatformContext';

/**
 * 120FPS Native Hardware-Composited Scroll & Lightweight Section Reveal Manager
 * - Leaves wheel/touch scrolling 100% on the browser's dedicated 120Hz GPU compositor thread
 *   (no `passive: false` wheel hijack or main-thread `getComputedStyle` layout stalls).
 * - Uses a passive IntersectionObserver on top-level sections only so sections reveal smoothly
 *   as they enter the viewport without nested card layer thrashing.
 */
export const SmoothScrollManager: React.FC = () => {
  const { route } = usePlatform();
  const isTerminal = route === 'terminal';

  useEffect(() => {
    if (isTerminal || typeof window === 'undefined') {
      return;
    }

    const selector = [
      '.apex-reveal-init',
      '.apex-scroll-unit',
      '[data-reveal]',
      '[data-scroll-reveal]',
      'main > section',
      'main > div > section',
    ].join(', ');

    const observer =
      'IntersectionObserver' in window
        ? new IntersectionObserver(
            (entries) => {
              for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                const target = entry.target as HTMLElement;
                if (entry.isIntersecting) {
                  target.classList.remove('apex-scroll-pending');
                  target.classList.add('is-revealed');
                  observer?.unobserve(target);
                }
              }
            },
            {
              root: null,
              rootMargin: '80px 0px 40px 0px',
              threshold: 0.02,
            }
          )
        : null;

    const bindTargets = () => {
      const nodes = document.querySelectorAll<HTMLElement>(selector);
      const viewportH = window.innerHeight || 900;

      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i];
        if (el.dataset.apexScrollBound === '1') continue;
        el.dataset.apexScrollBound = '1';
        el.classList.add('apex-scroll-animated');

        const rect = el.getBoundingClientRect();
        if (rect.top < viewportH * 0.96) {
          el.classList.remove('apex-scroll-pending');
          el.classList.add('is-revealed');
        } else if (observer) {
          el.classList.add('apex-scroll-pending');
          observer.observe(el);
        } else {
          el.classList.add('is-revealed');
        }
      }
    };

    const rafId = window.requestAnimationFrame(bindTargets);
    return () => {
      window.cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, [isTerminal, route]);

  return null;
};
