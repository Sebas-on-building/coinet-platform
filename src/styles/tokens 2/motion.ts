/**
 * Motion tokens for Coinet design system
 * Inspired by Apple, Canva, TradingView, Solana
 */
export const motion = {
  duration: {
    micro: '80ms',
    short: '200ms',
    base: '400ms',
    long: '700ms',
    description: 'Animation durations'
  },
  ease: {
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
    description: 'Easing curves'
  },
  spring: {
    stiffness: 400,
    damping: 30,
    mass: 1,
    description: 'Spring animation config for Framer Motion'
  },
  bounce: {
    micro: 0.2,
    macro: 0.4,
    description: 'Bounce values for micro/macro interactions'
  },
}; 