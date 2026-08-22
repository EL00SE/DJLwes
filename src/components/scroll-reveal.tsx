"use client";

import { useEffect, useRef, useState } from "react";

/** Fades + slides a section in the first time it scrolls into view.
 * Plain IntersectionObserver rather than a library — this is the only
 * place in the app that needs scroll-triggered animation, so pulling in
 * something like framer-motion for one effect isn't worth the weight. */
export function ScrollReveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced-motion preferences by just showing content immediately
    // (deferred via setTimeout rather than called synchronously, same
    // reasoning as the observer callback below).
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timeoutId = setTimeout(() => setIsVisible(true), 0);
      return () => clearTimeout(timeoutId);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
