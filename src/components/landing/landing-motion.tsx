'use client';

import { createElement, useRef } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  scrollRevealUp,
  scrollRevealLeft,
  scrollRevealRight,
  scrollScaleIn,
  scrollStaggerContainer,
  scrollStaggerItem,
  heroStaggerContainer,
  heroStaggerItem,
  scrollViewport,
} from '@/lib/motion';

type RevealDirection = 'up' | 'left' | 'right' | 'scale';

const revealVariants: Record<RevealDirection, Variants> = {
  up: scrollRevealUp,
  left: scrollRevealLeft,
  right: scrollRevealRight,
  scale: scrollScaleIn,
};

/** Fixed scroll progress bar below the nav */
export function ScrollProgress() {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();

  if (reduceMotion) return null;

  return (
    <motion.div
      className="fixed left-0 right-0 top-16 z-50 h-0.5 origin-left bg-accent"
      style={{ scaleX: scrollYProgress }}
      aria-hidden
    />
  );
}

/** Scroll-triggered section fade-up */
export function ScrollSection({
  children,
  className,
  delay = 0,
  as = 'section',
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: 'section' | 'div' | 'footer';
}) {
  const reduceMotion = useReducedMotion();
  const motionTags = { section: motion.section, div: motion.div, footer: motion.footer };

  if (reduceMotion) {
    return createElement(as, { className }, children);
  }

  const Comp = motionTags[as];

  return (
    <Comp
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={scrollViewport}
      variants={{
        hidden: { opacity: 0, y: 40 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.55, delay, ease: [0.25, 0.1, 0.25, 1] },
        },
      }}
    >
      {children}
    </Comp>
  );
}

/** Directional scroll reveal */
export function ScrollReveal({
  children,
  className,
  direction = 'up',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  direction?: RevealDirection;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={scrollViewport}
      variants={revealVariants[direction]}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

/** Stagger children on scroll into view */
export function ScrollStagger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={scrollViewport}
      variants={scrollStaggerContainer}
    >
      {children}
    </motion.div>
  );
}

export function ScrollStaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={scrollStaggerItem}>
      {children}
    </motion.div>
  );
}

/** Hero load-in stagger (above the fold) */
export function HeroStagger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={heroStaggerContainer}
    >
      {children}
    </motion.div>
  );
}

export function HeroStaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={heroStaggerItem}>
      {children}
    </motion.div>
  );
}

/** Parallax shift tied to scroll position */
export function ScrollParallax({
  children,
  className,
  speed = 0.15,
}: {
  children: React.ReactNode;
  className?: string;
  speed?: number;
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [speed * 100, speed * -100]);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div ref={ref} className={className} style={{ y }}>
      {children}
    </motion.div>
  );
}

/** Nav link hover underline animation */
export function NavLinkMotion({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.a
      href={href}
      onClick={onClick}
      className="relative text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      whileHover={reduceMotion ? undefined : { y: -1 }}
      transition={{ duration: 0.2 }}
    >
      {children}
      {!reduceMotion && (
        <motion.span
          className="absolute -bottom-0.5 left-0 h-px w-full origin-left bg-foreground"
          initial={{ scaleX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: 0.25 }}
        />
      )}
    </motion.a>
  );
}

/** Wrap element with hover lift for cards */
export function ScrollHoverLift({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      whileHover={{ y: -4, transition: { duration: 0.22 } }}
      whileTap={{ scale: 0.995 }}
    >
      {children}
    </motion.div>
  );
}
