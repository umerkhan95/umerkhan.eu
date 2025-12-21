"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface AnimatedHeroProps {
  greeting: string;
  name: string;
  title: string;
  description: string;
}

const roles = ["AI & RAG Specialist", "Full Stack Engineer", "Cloud Architect", "Data Engineer"];

export function AnimatedHero({ greeting, name, title, description }: AnimatedHeroProps) {
  const [currentRole, setCurrentRole] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const role = roles[currentRole];
    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (displayText.length < role.length) {
            setDisplayText(role.slice(0, displayText.length + 1));
          } else {
            setTimeout(() => setIsDeleting(true), 2000);
          }
        } else {
          if (displayText.length > 0) {
            setDisplayText(role.slice(0, displayText.length - 1));
          } else {
            setIsDeleting(false);
            setCurrentRole((prev) => (prev + 1) % roles.length);
          }
        }
      },
      isDeleting ? 30 : 80
    );

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentRole]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.21, 0.47, 0.32, 0.98],
      },
    },
  };

  return (
    <motion.div
      className="pb-12 mt-5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="text-xl py-1 opacity-80">
        {greeting}
      </motion.div>

      <motion.div variants={itemVariants} className="text-5xl font-bold">
        <span className="bg-gradient-to-r from-base-content to-base-content/70 bg-clip-text">
          {name}
        </span>
      </motion.div>

      <motion.div variants={itemVariants} className="text-3xl py-3 font-bold">
        <span className="text-base-content/90">Founding Engineer | </span>
        <span className="text-primary">
          {displayText}
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
            className="inline-block w-[3px] h-[0.9em] bg-primary ml-1 align-middle"
          />
        </span>
      </motion.div>

      <motion.div variants={itemVariants} className="py-2">
        <p className="text-lg leading-relaxed text-base-content/80">
          {description}
        </p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="flex gap-3 mt-4"
      >
        <motion.a
          href="/cv"
          className="btn btn-primary btn-sm"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          View CV
        </motion.a>
        <motion.a
          href="/blog"
          className="btn btn-outline btn-sm"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Read Blog
        </motion.a>
      </motion.div>
    </motion.div>
  );
}
