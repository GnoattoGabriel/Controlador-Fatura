import { useEffect, useState } from 'react';
import { AccessibilityInfo, LayoutAnimation } from 'react-native';

export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

/** Accordion 200–250ms; sem animação com reduce motion. */
export function playExpand(reduced: boolean, duration = 220): void {
  if (reduced) return;
  LayoutAnimation.configureNext(LayoutAnimation.create(duration, 'easeInEaseOut', 'opacity'));
}
