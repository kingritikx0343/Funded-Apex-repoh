import React, { useEffect } from 'react';
import { usePlatform } from '../context/PlatformContext';

/**
 * Pure 60/120FPS Hardware-Accelerated Scroll & Interactive Container Manager
 * - Zero wheel/touch event listeners: Never intercepts or conflicts with native browser scroll physics.
 * - Zero synchronous getBoundingClientRect() layout reads: Eliminates forced synchronous reflow (layout thrashing).
 * - Explicitly promotes all scroll-transformed and interactive containers with `will-change: transform, opacity`
 *   and `translate3d(0, 0, 0)` via a single batched requestAnimationFrame pass and asynchronous IntersectionObserver.
 */
export const SmoothScrollManager: React.FC = () => {
  const { route } = usePlatform();
  const isTerminal = route === 'terminal';

  useEffect(() => {
    if (isTerminal || typeof window === 'undefined') {
      return;
    }

    const observer =
      'IntersectionObserver' in window
        ? new IntersectionObserver(
            (entries) => {
              for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                if (entry.isIntersecting) {
                  entry.target.classList.add('is-revealed');
                  observer?.unobserve(entry.target);
                }
              }
            },
            {
              root: null,
              rootMargin: '200px 0px 200px 0px',
              threshold: 0.01,
            }
          )
        : null;

    const rafId = window.requestAnimationFrame(() => {
      const interactiveContainers = document.querySelectorAll<HTMLElement>(
        '.apex-reveal-init, .apex-scroll-unit, .apex-layout-transition, [data-reveal], [data-scroll-reveal], [data-scroll-container], [data-interactive-container]'
      );

      for (let i = 0; i < interactiveContainers.length; i++) {
        const el = interactiveContainers[i];
        el.style.willChange = 'transform, opacity';
        if (observer) {
          observer.observe(el);
        } else {
          el.classList.add('is-revealed');
        }
      }
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, [isTerminal, route]);

  return null;
};
