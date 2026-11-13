"use client";

import { useEffect, useState } from "react";

/**
 * Lightweight entrance animation. Content is always rendered visible; the
 * animation simply softens the first paint. This keeps the page usable without
 * JavaScript and avoids blank sections in print, crawlers and screenshots.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}) {
  const Component = Tag as React.ElementType;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <Component
      className={className}
      style={{
        animation: mounted ? `rise .7s cubic-bezier(.22,.9,.24,1) ${delay}ms both` : undefined,
      }}
    >
      {children}
    </Component>
  );
}

export function CountUp({
  value,
  suffix = "",
  prefix = "",
  className = "",
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  return (
    <span className={`num ${className}`}>
      {prefix}
      {value.toLocaleString("en-NG")}
      {suffix}
    </span>
  );
}
