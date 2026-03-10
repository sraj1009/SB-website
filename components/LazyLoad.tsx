import React, { Suspense, useState, useEffect } from 'react';

interface LazyLoadProps {
  component: React.LazyExoticComponent<any>;
  fallback?: React.ReactNode;
  delay?: number;
  rootMargin?: string;
  threshold?: number;
  children?: React.ReactNode;
}

// Lazy loading wrapper component
export const LazyLoad: React.FC<LazyLoadProps> = ({
  component: Component,
  fallback = <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />,
  delay = 200,
  rootMargin = '50px',
  threshold = 0.1,
  children
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!shouldLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin,
        threshold
      }
    );

    const element = document.getElementById('lazy-load-trigger');
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [shouldLoad, rootMargin, threshold]);

  return (
    <>
      <div id="lazy-load-trigger" style={{ height: '1px', visibility: 'hidden' }} />
      {isVisible ? (
        <Suspense fallback={fallback}>
          <Component {...(children && { children })} />
        </Suspense>
      ) : (
        fallback
      )}
    </>
  );
};

// Lazy loaded components
export const LazyProductCard = React.lazy(() => 
  import('./ProductCard').then(module => ({ default: module.default }))
);

// Note: ProductList, Checkout, UserProfile components don't exist yet
// These are placeholders for future implementation
export const LazyProductList = React.lazy(() => 
  import('./ProductList').catch(() => ({ default: () => React.createElement('div', null, 'ProductList coming soon') }))
);

export const LazyCheckout = React.lazy(() => 
  import('./Checkout').catch(() => ({ default: () => React.createElement('div', null, 'Checkout coming soon') }))
);

export const LazyUserProfile = React.lazy(() => 
  import('./UserProfile').catch(() => ({ default: () => React.createElement('div', null, 'UserProfile coming soon') }))
);

export const LazyAdminDashboard = React.lazy(() => 
  import('./AdminDashboard').then(module => ({ default: module.default }))
);

// Code splitting utility
export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) => {
  return React.lazy(importFunc);
};

// Preloading utility
export const preloadComponent = (importFunc: () => Promise<{ default: any }>) => {
  importFunc();
};

// Bundle analyzer for development
export const analyzeBundle = () => {
  if (process.env.NODE_ENV === 'development') {
    // Note: @bundle-analyzer/webpack-bundle-analyzer is not installed
    // This is a placeholder for future bundle analysis
    console.log('Bundle analyzer placeholder - install @bundle-analyzer/webpack-bundle-analyzer for actual analysis');
  }
};
