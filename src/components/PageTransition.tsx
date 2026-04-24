import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * PageTransition — subtle fade-up for incoming routes.
 *
 * No exit animation: AnimatePresence mode="wait" would otherwise hold the
 * outgoing page on screen for the exit duration, which meant a user who
 * scrolled down and clicked a link would watch the previous page's footer
 * float for 300ms before the lazy-loaded next page took over. Dropping
 * the exit makes navigation feel immediate — the scroll-to-top side
 * effect + Suspense fallback then cover the hand-off.
 */
function PageTransition({ children }: PageTransitionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;