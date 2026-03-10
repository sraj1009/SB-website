// 🧪 A/B Testing Framework for SINGGLEBEE

interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: Variant[];
  trafficAllocation: number; // 0-1
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate?: Date;
  endDate?: Date;
  targetAudience?: {
    ageGroups?: string[];
    categories?: string[];
    newUsersOnly?: boolean;
    returningUsersOnly?: boolean;
  };
  goals: Goal[];
  results?: ExperimentResults;
  createdAt: Date;
  updatedAt: Date;
}

interface Variant {
  id: string;
  name: string;
  description: string;
  weight: number; // Traffic allocation for this variant
  config: Record<string, any>;
  isControl: boolean;
}

interface Goal {
  id: string;
  name: string;
  type: 'conversion' | 'engagement' | 'revenue' | 'click' | 'view';
  selector?: string;
  event?: string;
  value?: number;
}

interface ExperimentResults {
  variantResults: VariantResult[];
  winner?: string;
  significance: number;
  confidence: number;
  sampleSize: number;
  duration: number;
}

interface VariantResult {
  variantId: string;
  conversions: number;
  visitors: number;
  conversionRate: number;
  revenue: number;
  averageOrderValue: number;
  bounceRate: number;
  timeOnPage: number;
}

interface UserAssignment {
  userId: string;
  experimentId: string;
  variantId: string;
  assignedAt: Date;
}

class ABTestingManager {
  private experiments: Map<string, Experiment> = new Map();
  private userAssignments: Map<string, UserAssignment[]> = new Map();
  private currentVariants: Map<string, string> = new Map(); // experimentId -> variantId

  constructor() {
    this.loadExperiments();
    this.loadUserAssignments();
  }

  // Load experiments from storage/database
  private async loadExperiments(): Promise<void> {
    try {
      // Default experiments
      const defaultExperiments: Experiment[] = [
        {
          id: 'homepage-hero-cta',
          name: 'Homepage Hero CTA Button',
          description: 'Test different CTA button colors and text on homepage hero section',
          variants: [
            {
              id: 'control',
              name: 'Control - Yellow Button',
              description: 'Current yellow button with "Shop Now" text',
              weight: 50,
              config: {
                buttonColor: '#FFC107',
                buttonText: 'Shop Now',
                buttonSize: 'large'
              },
              isControl: true
            },
            {
              id: 'variant-1',
              name: 'Variant 1 - Blue Button',
              description: 'Blue button with "Explore Books" text',
              weight: 50,
              config: {
                buttonColor: '#007bff',
                buttonText: 'Explore Books',
                buttonSize: 'large'
              },
              isControl: false
            }
          ],
          trafficAllocation: 1.0,
          status: 'running',
          startDate: new Date(),
          targetAudience: {
            newUsersOnly: false,
            returningUsersOnly: false
          },
          goals: [
            {
              id: 'click-cta',
              name: 'CTA Click Rate',
              type: 'click',
              selector: '.hero-cta-button'
            },
            {
              id: 'conversion',
              name: 'Conversion Rate',
              type: 'conversion'
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'product-card-layout',
          name: 'Product Card Layout',
          description: 'Test different product card layouts and information display',
          variants: [
            {
              id: 'control',
              name: 'Control - Current Layout',
              description: 'Current product card layout',
              weight: 33,
              config: {
                layout: 'current',
                showRating: true,
                showPrice: true,
                showDescription: true,
                imageSize: 'medium'
              },
              isControl: true
            },
            {
              id: 'variant-1',
              name: 'Variant 1 - Compact Layout',
              description: 'More compact layout with less text',
              weight: 33,
              config: {
                layout: 'compact',
                showRating: true,
                showPrice: true,
                showDescription: false,
                imageSize: 'small'
              },
              isControl: false
            },
            {
              id: 'variant-2',
              name: 'Variant 2 - Image Focus',
              description: 'Larger images, minimal text',
              weight: 34,
              config: {
                layout: 'image-focus',
                showRating: false,
                showPrice: true,
                showDescription: false,
                imageSize: 'large'
              },
              isControl: false
            }
          ],
          trafficAllocation: 0.5,
          status: 'running',
          startDate: new Date(),
          targetAudience: {
            categories: ['books', 'poems'],
            newUsersOnly: false
          },
          goals: [
            {
              id: 'click-product',
              name: 'Product Click Rate',
              type: 'click',
              selector: '.product-card'
            },
            {
              id: 'add-to-cart',
              name: 'Add to Cart Rate',
              type: 'conversion',
              event: 'add_to_cart'
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      defaultExperiments.forEach(exp => {
        this.experiments.set(exp.id, exp);
      });
    } catch (error) {
      console.error('Failed to load experiments:', error);
    }
  }

  // Load user assignments
  private async loadUserAssignments(): Promise<void> {
    try {
      const saved = localStorage.getItem('ab-test-assignments');
      if (saved) {
        const assignments = JSON.parse(saved);
        assignments.forEach((assignment: UserAssignment) => {
          if (!this.userAssignments.has(assignment.userId)) {
            this.userAssignments.set(assignment.userId, []);
          }
          this.userAssignments.get(assignment.userId)!.push(assignment);
        });
      }
    } catch (error) {
      console.error('Failed to load user assignments:', error);
    }
  }

  // Save user assignments
  private saveUserAssignments(): void {
    try {
      const allAssignments: UserAssignment[] = [];
      this.userAssignments.forEach(assignments => {
        allAssignments.push(...assignments);
      });
      localStorage.setItem('ab-test-assignments', JSON.stringify(allAssignments));
    } catch (error) {
      console.error('Failed to save user assignments:', error);
    }
  }

  // Get user ID
  private getUserId(): string {
    let userId = localStorage.getItem('ab-test-user-id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('ab-test-user-id', userId);
    }
    return userId;
  }

  // Assign user to variant
  assignUserToVariant(experimentId: string, userId?: string): string | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'running') {
      return null;
    }

    const targetUserId = userId || this.getUserId();
    
    // Check if user is already assigned
    const existingAssignment = this.getUserAssignment(targetUserId, experimentId);
    if (existingAssignment) {
      return existingAssignment.variantId;
    }

    // Check if user matches target audience
    if (!this.isUserInTargetAudience(targetUserId, experiment)) {
      return null;
    }

    // Select variant based on traffic allocation
    const variantId = this.selectVariant(experiment);
    
    // Save assignment
    const assignment: UserAssignment = {
      userId: targetUserId,
      experimentId,
      variantId,
      assignedAt: new Date()
    };

    if (!this.userAssignments.has(targetUserId)) {
      this.userAssignments.set(targetUserId, []);
    }
    this.userAssignments.get(targetUserId)!.push(assignment);
    this.saveUserAssignments();

    return variantId;
  }

  // Select variant for user
  private selectVariant(experiment: Experiment): string {
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const variant of experiment.variants) {
      cumulative += variant.weight;
      if (random <= cumulative) {
        return variant.id;
      }
    }
    
    return experiment.variants[0].id; // Fallback
  }

  // Check if user is in target audience
  private isUserInTargetAudience(userId: string, experiment: Experiment): boolean {
    // In production, check user data against target audience criteria
    return true;
  }

  // Get user assignment
  getUserAssignment(userId: string, experimentId: string): UserAssignment | null {
    const assignments = this.userAssignments.get(userId);
    if (!assignments) return null;
    
    return assignments.find(a => a.experimentId === experimentId) || null;
  }

  // Get variant config for user
  getVariantConfig(experimentId: string, userId?: string): Record<string, any> | null {
    const variantId = this.assignUserToVariant(experimentId, userId);
    if (!variantId) return null;

    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    const variant = experiment.variants.find(v => v.id === variantId);
    return variant?.config || null;
  }

  // Track conversion
  trackConversion(experimentId: string, goalId: string, value?: number): void {
    const userId = this.getUserId();
    const assignment = this.getUserAssignment(userId, experimentId);
    
    if (!assignment) return;

    // In production, send to analytics service
    console.log('Conversion tracked:', {
      experimentId,
      variantId: assignment.variantId,
      goalId,
      value,
      userId,
      timestamp: new Date()
    });
  }

  // Track event
  trackEvent(experimentId: string, eventType: string, data?: any): void {
    const userId = this.getUserId();
    const assignment = this.getUserAssignment(userId, experimentId);
    
    if (!assignment) return;

    // In production, send to analytics service
    console.log('Event tracked:', {
      experimentId,
      variantId: assignment.variantId,
      eventType,
      data,
      userId,
      timestamp: new Date()
    });
  }

  // Get experiment results
  getExperimentResults(experimentId: string): ExperimentResults | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    // In production, calculate from analytics data
    const mockResults: ExperimentResults = {
      variantResults: experiment.variants.map(variant => ({
        variantId: variant.id,
        conversions: Math.floor(Math.random() * 100),
        visitors: Math.floor(Math.random() * 1000) + 100,
        conversionRate: Math.random() * 10,
        revenue: Math.random() * 10000,
        averageOrderValue: Math.random() * 500,
        bounceRate: Math.random() * 50,
        timeOnPage: Math.random() * 300
      })),
      significance: Math.random() * 0.1,
      confidence: Math.random() * 0.2 + 0.8,
      sampleSize: 1000,
      duration: 7
    };

    return mockResults;
  }

  // Create new experiment
  createExperiment(experiment: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = 'exp_' + Math.random().toString(36).substr(2, 9);
    const newExperiment: Experiment = {
      ...experiment,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.experiments.set(id, newExperiment);
    return id;
  }

  // Update experiment
  updateExperiment(experimentId: string, updates: Partial<Experiment>): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return false;

    const updatedExperiment = { ...experiment, ...updates, updatedAt: new Date() };
    this.experiments.set(experimentId, updatedExperiment);
    return true;
  }

  // Start experiment
  startExperiment(experimentId: string): boolean {
    return this.updateExperiment(experimentId, {
      status: 'running',
      startDate: new Date()
    });
  }

  // Pause experiment
  pauseExperiment(experimentId: string): boolean {
    return this.updateExperiment(experimentId, {
      status: 'paused'
    });
  }

  // Complete experiment
  completeExperiment(experimentId: string, winnerId?: string): boolean {
    return this.updateExperiment(experimentId, {
      status: 'completed',
      endDate: new Date(),
      results: this.getExperimentResults(experimentId) || undefined
    });
  }

  // Get all experiments
  getAllExperiments(): Experiment[] {
    return Array.from(this.experiments.values());
  }

  // Get running experiments
  getRunningExperiments(): Experiment[] {
    return Array.from(this.experiments.values())
      .filter(exp => exp.status === 'running');
  }

  // React Hook for A/B testing
  useABTesting = () => {
    const [currentVariants, setCurrentVariants] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);

    React.useEffect(() => {
      // Assign user to all running experiments
      const runningExperiments = this.getRunningExperiments();
      const variants: Record<string, string> = {};
      
      runningExperiments.forEach(experiment => {
        const variantId = this.assignUserToVariant(experiment.id);
        if (variantId) {
          variants[experiment.id] = variantId;
        }
      });

      setCurrentVariants(variants);
      setIsLoading(false);
    }, []);

    const getVariant = (experimentId: string) => {
      return currentVariants[experimentId] || null;
    };

    const getVariantConfig = (experimentId: string) => {
      const variantId = currentVariants[experimentId];
      if (!variantId) return null;

      const experiment = this.experiments.get(experimentId);
      if (!experiment) return null;

      const variant = experiment.variants.find(v => v.id === variantId);
      return variant?.config || null;
    };

    const trackConversion = (experimentId: string, goalId: string, value?: number) => {
      this.trackConversion(experimentId, goalId, value);
    };

    const trackEvent = (experimentId: string, eventType: string, data?: any) => {
      this.trackEvent(experimentId, eventType, data);
    };

    return {
      isLoading,
      getVariant,
      getVariantConfig,
      trackConversion,
      trackEvent,
      runningExperiments: this.getRunningExperiments()
    };
  };
}

// Create singleton instance
const abTestingManager = new ABTestingManager();

// Export hook and manager
export const useABTesting = abTestingManager.useABTesting;
export default abTestingManager;
