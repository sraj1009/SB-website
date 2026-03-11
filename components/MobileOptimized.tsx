import React, { useState, useEffect, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';

interface MobileOptimizedProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileContainer: React.FC<MobileOptimizedProps> = ({ 
  children, 
  className = '' 
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return (
    <div 
      className={`mobile-optimized ${isMobile ? 'mobile' : 'desktop'} ${className}`}
      data-mobile={isMobile}
    >
      {children}
    </div>
  );
};

interface SwipeContainerProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  className?: string;
}

export const SwipeContainer: React.FC<SwipeContainerProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  className = '',
}) => {
  const handlers = useSwipeable({
    onSwipedLeft: onSwipeLeft,
    onSwipedRight: onSwipeRight,
    onSwipedUp: onSwipeUp,
    onSwipedDown: onSwipeDown,
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  return (
    <div {...handlers} className={`swipe-container ${className}`}>
      {children}
    </div>
  );
};

interface TouchButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export const TouchButton: React.FC<TouchButtonProps> = ({
  children,
  onClick,
  className = '',
  disabled = false,
  ariaLabel,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  
  const handleTouchStart = () => {
    if (!disabled) {
      setIsPressed(true);
    }
  };
  
  const handleTouchEnd = () => {
    if (!disabled && isPressed) {
      setIsPressed(false);
      onClick();
    }
  };
  
  return (
    <button
      className={`touch-button ${isPressed ? 'pressed' : ''} ${disabled ? 'disabled' : ''} ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onClick={undefined} // Prevent double click on mobile
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        minHeight: '44px', // Minimum touch target
        minWidth: '44px',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'manipulation',
      }}
    >
      {children}
    </button>
  );
};

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  className?: string;
}

export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  className = '',
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );
  
  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  
  const handleScroll = () => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  };
  
  return (
    <div
      ref={containerRef}
      className={`virtualized-list ${className}`}
      style={{
        height: containerHeight,
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${startIndex * itemHeight}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{
                height: itemHeight,
                boxSizing: 'border-box',
              }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Mobile-specific hooks
export const useMobileGestures = () => {
  const [gestures, setGestures] = useState({
    pinch: 0,
    rotation: 0,
  });
  
  useEffect(() => {
    const handleGesture = (event: any) => {
      if (event.scale) {
        setGestures(prev => ({ ...prev, pinch: event.scale }));
      }
      if (event.rotation) {
        setGestures(prev => ({ ...prev, rotation: event.rotation }));
      }
    };
    
    if ('ongesturechange' in window) {
      window.addEventListener('gesturechange', handleGesture);
    }
    
    return () => {
      if ('ongesturechange' in window) {
        window.removeEventListener('gesturechange', handleGesture);
      }
    };
  }, []);
  
  return gestures;
};

export const useVibration = () => {
  const vibrate = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };
  
  return { vibrate };
};

// Mobile utility components
export const MobileOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile ? <>{children}</> : null;
};

export const DesktopOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDesktop, setIsDesktop] = useState(false);
  
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);
  
  return isDesktop ? <>{children}</> : null;
};

// Mobile-specific styles
export const mobileStyles = `
  .mobile-optimized {
    -webkit-text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
  }
  
  .touch-button {
    transition: transform 0.1s ease;
  }
  
  .touch-button.pressed {
    transform: scale(0.95);
  }
  
  .touch-button.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .virtualized-list {
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  
  .virtualized-list::-webkit-scrollbar {
    display: none;
  }
  
  @media (max-width: 767px) {
    .mobile-optimized.mobile {
      font-size: 16px; /* Prevent zoom on iOS */
    }
  }
  
  @media (hover: none) and (pointer: coarse) {
    .touch-button:hover {
      background-color: inherit;
    }
  }
`;
