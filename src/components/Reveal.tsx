import React, { useEffect, useRef, useState } from "react";

interface RevealProps {
  children: React.ReactNode;
  width?: "fit-content" | "100%";
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  duration?: number;
  className?: string;
  threshold?: number;
}

export default function Reveal({
  children,
  width = "fit-content",
  direction = "up",
  delay = 0,
  duration = 0.8,
  className = "",
  threshold = 0.2,
}: RevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          setIsVisible(false); // Reset biar bisa main ulang (Replayable)
        }
      },
      { threshold }
    );

    const element = ref.current;
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold]);

  const getTransform = () => {
    if (isVisible) return "translate(0, 0)";
    switch (direction) {
      case "up": return "translateY(40px)";
      case "down": return "translateY(-40px)";
      case "left": return "translateX(40px)";
      case "right": return "translateX(-40px)";
      default: return "translateY(40px)";
    }
  };

  return (
    <div ref={ref} style={{ width }} className={className}>
      <div
        className="h-full" // <--- INI KUNCINYA (Supaya konten di dalam stretch)
        style={{
          transform: getTransform(),
          opacity: isVisible ? 1 : 0,
          filter: isVisible ? "blur(0px)" : "blur(4px)",
          transition: `all ${duration}s cubic-bezier(0.17, 0.55, 0.55, 1) ${delay}s`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
