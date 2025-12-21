"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { ParticleBackground } from "./ParticleBackground";

const roles = [
  "AI & RAG Specialist",
  "Full Stack Engineer",
  "Cloud Architect",
  "Data Engineer"
];

interface ModernHeroProps {
  name: string;
  title: string;
  description: string;
  location?: string;
}

export function ModernHero({ name, title, description, location = "Berlin" }: ModernHeroProps) {
  const [currentRole, setCurrentRole] = useState(0);
  const [particleColor, setParticleColor] = useState("#64748b");

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentRole((prev) => (prev + 1) % roles.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Detect theme and update particle color
  useEffect(() => {
    const updateColor = () => {
      const theme = document.documentElement.dataset.theme;
      setParticleColor(theme === "dark" ? "#94a3b8" : "#475569");
    };

    updateColor();

    // Observe theme changes
    const observer = new MutationObserver(updateColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"]
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative py-12 md:py-16 overflow-hidden">
      {/* Particle Background */}
      <ParticleBackground
        particleCount={100}
        color={particleColor}
        maxSize={3}
        speed={0.2}
      />

      {/* Grid Layout matching SideSection */}
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6 lg:gap-12 relative z-10">
        {/* Side Label */}
        <div className="lg:text-right">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-base-content/40">
              Profile
            </span>
          </motion.div>
        </div>

        {/* Content */}
        <div>
          {/* Status Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-base-200/80 border border-base-300/50">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              <span className="text-xs font-medium text-base-content/70">
                Available for new opportunities
              </span>
            </div>
          </motion.div>

          {/* Main Heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-4"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-base-content">
              {name.split(' ').map((word, i) => (
                <span key={i}>
                  {i === 0 ? (
                    <span className="text-base-content/60">{word} </span>
                  ) : (
                    <span>{word}</span>
                  )}
                </span>
              ))}
            </h1>
          </motion.div>

          {/* Animated Role */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-6"
          >
            <div className="flex items-center gap-3 text-lg md:text-xl">
              <span className="text-base-content/60">{title}</span>
              <span className="text-base-content/30">·</span>
              <div className="h-7 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentRole}
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -30, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="block font-medium text-base-content"
                  >
                    {roles[currentRole]}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-base md:text-lg text-base-content/60 max-w-2xl leading-relaxed mb-8"
          >
            {description}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap items-center gap-4 mb-8"
          >
            <motion.a
              href="/cv"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-base-content text-base-100 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              View Resume
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </motion.a>
            <motion.a
              href="/blog"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-base-300 text-base-content rounded-lg text-sm font-medium hover:bg-base-200/50 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Read Blog
            </motion.a>
          </motion.div>

          {/* Location */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex items-center gap-2 text-sm text-base-content/50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{location}, Germany</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
