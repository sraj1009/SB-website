import React, { createContext, useContext, useEffect, useState } from 'react';
import { analytics } from '../analytics/analytics-client';

// A/B Test configuration types
export interface ABTestConfig {
  id: string;
  name: string;
  description: string;
  variants: ABTestVariant[];
  trafficAllocation: number[]; // Must sum to 100
  startDate: string;
  endDate?: string;
  targetAudience?: {
    newUserOnly?: boolean;
    minSessions?: number;
    maxSessions?: number;
    userSegments?: string[];
  };
  successMetrics: string[];
  status: 'draft' | 'running' | 'completed' | 'paused';
}

export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  weight: number; // Traffic percentage
  changes: {
    component?: React.ComponentType<any>;
    props?: Record<string, any>;
    styles?: Record<string, any>;
    content?: Record<string, any>;
  };
}

export interface ABTestResult {
  testId: string;
  variantId: string;
  userId: string;
  sessionId: string;
  timestamp: number;
  converted: boolean;
  conversionValue?: number;
  metrics: Record<string, number>;
}

// A/B Test Context
interface ABTestContextValue {
  getVariant: (testId: string) => string | null;
  trackConversion: (testId: string, value?: number) => void;
  isTestRunning: (testId: string) => boolean;
  getUserTests: () => string[];
}

const ABTestContext = createContext<ABTestContextValue | null>(null);

// A/B Test Provider Component
export const ABTestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userVariants, setUserVariants] = useState<Record<string, string>>({});
  const [activeTests, setActiveTests] = useState<ABTestConfig[]>([]);

  // Load active tests and user's variant assignments
  useEffect(() => {
    loadActiveTests();
    loadUserVariants();
  }, []);

  const loadActiveTests = async () => {
    try {
      // In production, fetch from API
      const tests: ABTestConfig[] = [
        {
          id: 'checkout_button_color',
          name: 'Checkout Button Color Test',
          description: 'Test different button colors to increase conversion',
          variants: [
            {
              id: 'control',
              name: 'Current Orange',
              description: 'Current orange button',
              weight: 50,
              changes: {
                styles: {
                  backgroundColor: '#F59E0B',
                  hoverColor: '#D97706',
                },
              },
            },
            {
              id: 'variant_green',
              name: 'Green Button',
              description: 'Green button for trust',
              weight: 50,
              changes: {
                styles: {
                  backgroundColor: '#10B981',
                  hoverColor: '#059669',
                },
              },
            },
          ],
          trafficAllocation: [50, 50],
          startDate: '2024-03-10',
          targetAudience: {
            newUserOnly: false,
          },
          successMetrics: ['checkout_conversion', 'revenue_per_user'],
          status: 'running',
        },
        {
          id: 'price_display',
          name: 'Price Display Format',
          description: 'Test different price display formats',
          variants: [
            {
              id: 'control',
              name: 'Simple Format',
              description: '₹499',
              weight: 33,
              changes: {
                content: {
                  priceFormat: 'simple',
                },
              },
            },
            {
              id: 'variant_decimal',
              name: 'Decimal Format',
              description: '₹499.00',
              weight: 33,
              changes: {
                content: {
                  priceFormat: 'decimal',
                },
              },
            },
            {
              id: 'variant_comma',
              name: 'Comma Format',
              description: '₹499,00',
              weight: 34,
              changes: {
                content: {
                  priceFormat: 'comma',
                },
              },
            },
          ],
          trafficAllocation: [33, 33, 34],
          startDate: '2024-03-10',
          successMetrics: ['add_to_cart_rate', 'conversion_rate'],
          status: 'running',
        },
      ];

      setActiveTests(tests);
    } catch (error) {
      console.error('Failed to load A/B tests:', error);
    }
  };

  const loadUserVariants = () => {
    try {
      const stored = localStorage.getItem('ab_test_variants');
      if (stored) {
        setUserVariants(JSON.parse(stored));
      }
    } catch (error) {
      console.warn('Failed to load user variants:', error);
    }
  };

  const saveUserVariants = (variants: Record<string, string>) => {
    try {
      localStorage.setItem('ab_test_variants', JSON.stringify(variants));
    } catch (error) {
      console.warn('Failed to save user variants:', error);
    }
  };

  // Assign user to variant for a test
  const assignVariant = (testId: string, test: ABTestConfig): string => {
    // Check if user already has a variant assigned
    if (userVariants[testId]) {
      return userVariants[testId];
    }

    // Check if user is eligible for this test
    if (!isUserEligible(test)) {
      return 'control'; // Default to control
    }

    // Assign variant based on traffic allocation
    const random = Math.random() * 100;
    let cumulative = 0;

    for (let i = 0; i < test.variants.length; i++) {
      cumulative += test.trafficAllocation[i];
      if (random <= cumulative) {
        const variantId = test.variants[i].id;
        const newVariants = { ...userVariants, [testId]: variantId };
        setUserVariants(newVariants);
        saveUserVariants(newVariants);

        // Track test assignment
        analytics.track('ab_test_assigned', {
          test_id: testId,
          variant_id: variantId,
          test_name: test.name,
        });

        return variantId;
      }
    }

    return 'control';
  };

  const isUserEligible = (test: ABTestConfig): boolean => {
    // Check test status
    if (test.status !== 'running') return false;

    // Check date range
    const now = new Date();
    const start = new Date(test.startDate);
    if (now < start) return false;

    if (test.endDate) {
      const end = new Date(test.endDate);
      if (now > end) return false;
    }

    // Check target audience criteria
    if (test.targetAudience) {
      // Add more sophisticated eligibility checks here
      // For now, return true for simplicity
    }

    return true;
  };

  const getVariant = (testId: string): string | null => {
    const test = activeTests.find((t) => t.id === testId);
    if (!test) return null;

    return assignVariant(testId, test);
  };

  const trackConversion = (testId: string, value?: number) => {
    const variantId = userVariants[testId];
    if (!variantId) return;

    analytics.track('ab_test_conversion', {
      test_id: testId,
      variant_id: variantId,
      conversion_value: value,
      timestamp: Date.now(),
    });

    // In production, send to A/B testing API
    // await abTestAPI.trackConversion(testId, variantId, value);
  };

  const isTestRunning = (testId: string): boolean => {
    const test = activeTests.find((t) => t.id === testId);
    return test?.status === 'running' || false;
  };

  const getUserTests = (): string[] => {
    return Object.keys(userVariants);
  };

  const contextValue: ABTestContextValue = {
    getVariant,
    trackConversion,
    isTestRunning,
    getUserTests,
  };

  return <ABTestContext.Provider value={contextValue}>{children}</ABTestContext.Provider>;
};

// Hook to use A/B testing
export const useABTest = () => {
  const context = useContext(ABTestContext);
  if (!context) {
    throw new Error('useABTest must be used within ABTestProvider');
  }
  return context;
};

// A/B Test Wrapper Component
export const ABTestWrapper: React.FC<{
  testId: string;
  children: (variant: string) => React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ testId, children, fallback }) => {
  const { getVariant, isTestRunning } = useABTest();

  if (!isTestRunning(testId)) {
    return <>{fallback || children('control')}</>;
  }

  const variant = getVariant(testId);
  if (!variant) {
    return <>{fallback}</>;
  }

  return <>{children(variant)}</>;
};

// Statistical significance calculator
export const calculateSignificance = (
  controlConversions: number,
  controlSize: number,
  variantConversions: number,
  variantSize: number,
  confidenceLevel: number = 0.95
): {
  significant: boolean;
  controlRate: number;
  variantRate: number;
  uplift: number;
  confidenceInterval: [number, number];
  pValue: number;
} => {
  const controlRate = controlConversions / controlSize;
  const variantRate = variantConversions / variantSize;
  const uplift = ((variantRate - controlRate) / controlRate) * 100;

  // Simplified z-score calculation
  const pooledRate = (controlConversions + variantConversions) / (controlSize + variantSize);
  const standardError = Math.sqrt(
    pooledRate * (1 - pooledRate) * (1 / controlSize + 1 / variantSize)
  );

  const zScore = Math.abs((variantRate - controlRate) / standardError);

  // Simplified p-value calculation
  const pValue = 2 * (1 - normalCDF(zScore));

  const zCritical = confidenceLevel === 0.95 ? 1.96 : 2.576;
  const significant = zScore > zCritical;

  const marginOfError = zCritical * standardError;
  const confidenceInterval: [number, number] = [
    (variantRate - controlRate - marginOfError) * 100,
    (variantRate - controlRate + marginOfError) * 100,
  ];

  return {
    significant,
    controlRate: controlRate * 100,
    variantRate: variantRate * 100,
    uplift,
    confidenceInterval,
    pValue,
  };
};

// Normal CDF approximation
const normalCDF = (x: number): number => {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2.0);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
};

// Sample size calculator
export const calculateSampleSize = (
  baselineRate: number,
  minimumDetectableEffect: number,
  confidenceLevel: number = 0.95,
  power: number = 0.8
): number => {
  const zAlpha = confidenceLevel === 0.95 ? 1.96 : 2.576;
  const zBeta = power === 0.8 ? 0.84 : 1.28;

  const p1 = baselineRate;
  const p2 = baselineRate + minimumDetectableEffect;
  const pBar = (p1 + p2) / 2;

  const sampleSize = Math.ceil(
    (2 * pBar * (1 - pBar) * Math.pow(zAlpha + zBeta, 2)) / Math.pow(p2 - p1, 2)
  );

  return sampleSize;
};

// Export types and utilities
export { ABTestContext };
