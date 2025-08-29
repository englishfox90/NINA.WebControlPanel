import { useEffect, useState } from 'react';

type BreakpointName = 'mobile' | 'tablet' | 'desktop' | 'wide';

interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
  breakpoint: BreakpointName;
  width: number;
  height: number;
}

const breakpoints = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1200,
};

const getBreakpoint = (width: number): BreakpointName => {
  if (width <= breakpoints.mobile) return 'mobile';
  if (width <= breakpoints.tablet) return 'tablet';
  if (width <= breakpoints.desktop) return 'desktop';
  return 'wide';
};

export const useResponsive = (): ResponsiveState => {
  const [dimensions, setDimensions] = useState(() => {
    // Check if window is available (for SSR compatibility)
    if (typeof window !== 'undefined') {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }
    return { width: 1024, height: 768 }; // Default fallback
  });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      // Debounce resize events
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const breakpoint = getBreakpoint(dimensions.width);

  return {
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    isWide: breakpoint === 'wide',
    breakpoint,
    width: dimensions.width,
    height: dimensions.height,
  };
};

// Hook for specific breakpoint queries
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Legacy browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [query]);

  return matches;
};

// Predefined media query hooks
export const useIsMobile = () => useMediaQuery(`(max-width: ${breakpoints.mobile}px)`);
export const useIsTablet = () => useMediaQuery(`(min-width: ${breakpoints.mobile + 1}px) and (max-width: ${breakpoints.tablet}px)`);
export const useIsDesktop = () => useMediaQuery(`(min-width: ${breakpoints.desktop + 1}px)`);
export const useIsTouchDevice = () => useMediaQuery('(hover: none) and (pointer: coarse)');

export default useResponsive;