import { useEffect, useRef, useState } from 'react';

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Scroll-reveal przez IntersectionObserver. Element pokazuje się raz, potem observer się odpina.
 * Zwraca ref do podpięcia i flagę widoczności.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(options?: {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReduced() || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            if (options?.once !== false) observer.unobserve(entry.target);
          } else if (options?.once === false) {
            setVisible(false);
          }
        }
      },
      {
        // próg 0 = odsłoń, gdy tylko górna krawędź wejdzie w widok (nie zostawiamy „czarnych dziur")
        threshold: options?.threshold ?? 0,
        rootMargin: options?.rootMargin ?? '0px 0px -12% 0px',
      },
    );

    observer.observe(el);

    // bezpiecznik: gdyby IO nie zadziałał (nietypowa przeglądarka, element poza flow),
    // odsłoń treść po chwili — nigdy nie zostawiamy ukrytej sekcji
    const safety = window.setTimeout(() => setVisible(true), 2500);

    return () => {
      observer.disconnect();
      window.clearTimeout(safety);
    };
  }, [options?.threshold, options?.rootMargin, options?.once]);

  return { ref, visible };
}

/**
 * Animowany licznik — dla statystyk w hero (np. „40–60 min", „120 zł").
 * Startuje, gdy element wejdzie w widok.
 */
export function useCountUp(target: number, opts?: { duration?: number; start?: boolean }) {
  const [value, setValue] = useState(opts?.start === false ? 0 : 0);
  const started = useRef(false);

  useEffect(() => {
    if (!opts?.start || started.current) return;
    started.current = true;

    if (prefersReduced()) {
      setValue(target);
      return;
    }

    const duration = opts?.duration ?? 1400;
    const from = 0;
    let raf = 0;
    let startTs = 0;

    const tick = (ts: number) => {
      if (!startTs) startTs = ts;
      const progress = Math.min(1, (ts - startTs) / duration);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, opts?.start, opts?.duration]);

  return value;
}

/**
 * Lekki parallax: przesuwa element względem scrolla. Wyłączony przy reduced-motion i na dotyku.
 */
export function useParallax<T extends HTMLElement = HTMLDivElement>(strength = 0.15) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced()) return;
    if (window.matchMedia('(hover: none)').matches) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * -strength;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
        raf = 0;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [strength]);

  return ref;
}

/**
 * Magnetyczny przycisk — element delikatnie „przyciąga się" do kursora.
 * Wyłączony na dotyku i przy reduced-motion.
 */
export function useMagnetic<T extends HTMLElement = HTMLButtonElement>(strength = 0.35) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced() || window.matchMedia('(hover: none)').matches) return;

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * strength;
      const y = (e.clientY - (r.top + r.height / 2)) * strength;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    };
    const reset = () => {
      el.style.transform = '';
    };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', reset);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', reset);
    };
  }, [strength]);

  return ref;
}

/**
 * Lekki przechył 3D karty za kursorem + aktualizacja zmiennych --mx/--my dla reflektora.
 * Jeden handler robi tilt i spotlight naraz.
 */
export function useTilt<T extends HTMLElement = HTMLElement>(max = 6) {
  const ref = useRef<T | null>(null);
  const enabled = useRef(true);

  useEffect(() => {
    enabled.current = !prefersReduced() && !window.matchMedia('(hover: none)').matches;
  }, []);

  const onMouseMove = (e: React.MouseEvent<T>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
    if (!enabled.current) return;
    const rx = (0.5 - py) * max;
    const ry = (px - 0.5) * max;
    el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
  };

  const onMouseLeave = (e: React.MouseEvent<T>) => {
    e.currentTarget.style.transform = '';
  };

  return { ref, onMouseMove, onMouseLeave };
}

/** Śledzi, czy strona jest przewinięta poniżej progu — do „shrink on scroll" w headerze. */
export function useScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}
