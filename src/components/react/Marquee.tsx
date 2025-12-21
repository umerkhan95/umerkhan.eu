"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface MarqueeProps {
  children: ReactNode;
  className?: string;
  speed?: number;
  pauseOnHover?: boolean;
  direction?: "left" | "right";
}

export function Marquee({
  children,
  className = "",
  speed = 30,
  pauseOnHover = true,
  direction = "left",
}: MarqueeProps) {
  const animationDirection = direction === "left" ? "-100%" : "100%";

  return (
    <div
      className={`relative flex overflow-hidden ${className}`}
      style={{
        maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
      }}
    >
      <motion.div
        className={`flex shrink-0 gap-4 ${pauseOnHover ? "hover:[animation-play-state:paused]" : ""}`}
        animate={{
          x: [direction === "left" ? "0%" : "-100%", animationDirection],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {children}
      </motion.div>
      <motion.div
        className={`flex shrink-0 gap-4 ${pauseOnHover ? "hover:[animation-play-state:paused]" : ""}`}
        animate={{
          x: [direction === "left" ? "0%" : "-100%", animationDirection],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

interface ClientMarqueeProps {
  clients: string[];
}

export function ClientMarquee({ clients }: ClientMarqueeProps) {
  return (
    <Marquee speed={25} className="py-4">
      {clients.map((client, index) => (
        <div
          key={`${client}-${index}`}
          className="flex items-center justify-center px-8 py-3 mx-2 rounded-lg bg-base-200/50 backdrop-blur-sm border border-base-300/50 hover:bg-base-200 transition-colors duration-300"
        >
          <span className="text-base-content font-medium whitespace-nowrap">
            {client}
          </span>
        </div>
      ))}
    </Marquee>
  );
}
