import { analytics } from './analytics-client';

// Cohort analysis types
export interface CohortData {
  cohortId: string;
  cohortName: string;
  cohortDate: string;
  cohortSize: number;
  retentionRates: Record<string, number>;
  repeatPurchaseRates: Record<string, number>;
  revenuePerUser: Record<string, number>;
  metrics: {
    day1: number;
    day7: number;
    day30: number;
    day90: number;
  };
}

export interface UserCohort {
  userId: string;
  cohortId: string;
  acquisitionDate: string;
  acquisitionChannel: string;
  firstPurchaseDate?: string;
  totalPurchases: number;
  totalRevenue: number;
  lastActivityDate: string;
  isActive: boolean;
}

export interface CohortMetrics {
  cohortId: string;
  period: string;
  retentionRate: number;
  repeatPurchaseRate: number;
  averageOrderValue: number;
  revenuePerUser: number;
  churnRate: number;
  lifetimeValue: number;
}

class CohortAnalysis {
  private cohorts: Map<string, CohortData> = new Map();
  private users: Map<string, UserCohort> = new Map();
  private weeklyReports: CohortMetrics[] = [];

  constructor() {
    this.loadCohortData();
    this.scheduleWeeklyReport();
  }

  private loadCohortData(): void {
    try {
      // In production, load from database
      const stored = localStorage.getItem('cohort_data');
      if (stored) {
        const data = JSON.parse(stored);
        this.cohorts = new Map(data.cohorts || []);
        this.users = new Map(data.users || []);
        this.weeklyReports = data.weeklyReports || [];
      }
    } catch (error) {
      console.warn('Failed to load cohort data:', error);
    }
  }

  private saveCohortData(): void {
    try {
      const data = {
        cohorts: Array.from(this.cohorts.entries()),
        users: Array.from(this.users.entries()),
        weeklyReports: this.weeklyReports
      };
      localStorage.setItem('cohort_data', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save cohort data:', error);
    }
  }

  private scheduleWeeklyReport(): void {
    // Schedule weekly report generation
    setInterval(() => {
      this.generateWeeklyReport();
    }, 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  // Assign user to cohort based on acquisition date
  assignUserToCohort(
    userId: string,
    acquisitionDate: string,
    channel: string = 'organic'
  ): void {
    const cohortId = this.generateCohortId(acquisitionDate);
    
    // Create or get cohort
    if (!this.cohorts.has(cohortId)) {
      this.cohorts.set(cohortId, {
        cohortId,
        cohortName: this.getCohortName(acquisitionDate),
        cohortDate: acquisitionDate,
        cohortSize: 0,
        retentionRates: {},
        repeatPurchaseRates: {},
        revenuePerUser: {},
        metrics: {
          day1: 0,
          day7: 0,
          day30: 0,
          day90: 0
        }
      });
    }

    // Create user cohort record
    const userCohort: UserCohort = {
      userId,
      cohortId,
      acquisitionDate,
      acquisitionChannel: channel,
      totalPurchases: 0,
      totalRevenue: 0,
      lastActivityDate: new Date().toISOString(),
      isActive: true
    };

    this.users.set(userId, userCohort);

    // Update cohort size
    const cohort = this.cohorts.get(cohortId)!;
    cohort.cohortSize++;

    // Track cohort assignment
    analytics.track('user_assigned_to_cohort', {
      user_id: userId,
      cohort_id: cohortId,
      acquisition_date: acquisitionDate,
      channel
    });

    this.saveCohortData();
  }

  private generateCohortId(date: string): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const week = Math.ceil(d.getDate() / 7);
    return `${year}-${month.toString().padStart(2, '0')}-W${week}`;
  }

  private getCohortName(date: string): string {
    const d = new Date(date);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const week = Math.ceil(d.getDate() / 7);
    return `${monthNames[d.getMonth()]} Week ${week} ${d.getFullYear()}`;
  }

  // Track user activity and update cohort metrics
  trackUserActivity(
    userId: string,
    activityType: 'purchase' | 'browse' | 'login',
    value?: number
  ): void {
    const userCohort = this.users.get(userId);
    if (!userCohort) return;

    const cohort = this.cohorts.get(userCohort.cohortId);
    if (!cohort) return;

    const now = new Date();
    const daysSinceAcquisition = Math.floor(
      (now.getTime() - new Date(userCohort.acquisitionDate).getTime()) / 
      (1000 * 60 * 60 * 24)
    );

    // Update user activity
    userCohort.lastActivityDate = now.toISOString();
    userCohort.isActive = true;

    if (activityType === 'purchase' && value) {
      userCohort.totalPurchases++;
      userCohort.totalRevenue += value;

      if (!userCohort.firstPurchaseDate) {
        userCohort.firstPurchaseDate = now.toISOString();
      }

      // Update cohort revenue metrics
      const period = this.getPeriod(daysSinceAcquisition);
      if (!cohort.revenuePerUser[period]) {
        cohort.revenuePerUser[period] = 0;
      }
      cohort.revenuePerUser[period] += value / cohort.cohortSize;

      // Update repeat purchase rates
      if (userCohort.totalPurchases > 1) {
        if (!cohort.repeatPurchaseRates[period]) {
          cohort.repeatPurchaseRates[period] = 0;
        }
        cohort.repeatPurchaseRates[period]++;
      }
    }

    // Update retention rates
    const period = this.getPeriod(daysSinceAcquisition);
    if (!cohort.retentionRates[period]) {
      cohort.retentionRates[period] = 0;
    }
    cohort.retentionRates[period]++;

    // Update key metrics
    if (daysSinceAcquisition <= 1) cohort.metrics.day1 = cohort.retentionRates[period];
    if (daysSinceAcquisition <= 7) cohort.metrics.day7 = cohort.retentionRates[period];
    if (daysSinceAcquisition <= 30) cohort.metrics.day30 = cohort.retentionRates[period];
    if (daysSinceAcquisition <= 90) cohort.metrics.day90 = cohort.retentionRates[period];

    this.saveCohortData();
  }

  private getPeriod(days: number): string {
    if (days <= 1) return 'D1';
    if (days <= 7) return 'D7';
    if (days <= 30) return 'D30';
    if (days <= 60) return 'D60';
    if (days <= 90) return 'D90';
    if (days <= 180) return 'D180';
    return 'D365';
  }

  // Calculate retention rates for all cohorts
  calculateRetentionRates(): void {
    const now = new Date();
    
    this.cohorts.forEach((cohort, cohortId) => {
      const cohortDate = new Date(cohort.cohortDate);
      const daysSinceCohort = Math.floor(
        (now.getTime() - cohortDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate retention for each period
      const periods = ['D1', 'D7', 'D30', 'D90', 'D180', 'D365'];
      
      periods.forEach(period => {
        const periodDays = this.getPeriodDays(period);
        if (daysSinceCohort >= periodDays) {
          const activeUsers = this.getActiveUsersInCohort(cohortId, periodDays);
          cohort.retentionRates[period] = (activeUsers / cohort.cohortSize) * 100;
        }
      });
    });

    this.saveCohortData();
  }

  private getPeriodDays(period: string): number {
    const periodMap: Record<string, number> = {
      'D1': 1,
      'D7': 7,
      'D30': 30,
      'D90': 90,
      'D180': 180,
      'D365': 365
    };
    return periodMap[period] || 0;
  }

  private getActiveUsersInCohort(cohortId: string, days: number): number {
    let activeCount = 0;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    this.users.forEach(user => {
      if (user.cohortId === cohortId) {
        const lastActivity = new Date(user.lastActivityDate);
        if (lastActivity >= cutoffDate) {
          activeCount++;
        }
      }
    });

    return activeCount;
  }

  // Generate weekly cohort report
  generateWeeklyReport(): CohortMetrics[] {
    const report: CohortMetrics[] = [];
    const now = new Date();

    this.cohorts.forEach((cohort, cohortId) => {
      const periods = ['D1', 'D7', 'D30', 'D90'];
      
      periods.forEach(period => {
        const retentionRate = cohort.retentionRates[period] || 0;
        const repeatPurchaseRate = cohort.repeatPurchaseRates[period] || 0;
        const revenuePerUser = cohort.revenuePerUser[period] || 0;
        const churnRate = 100 - retentionRate;
        
        // Calculate LTV (simplified)
        const lifetimeValue = revenuePerUser * (retentionRate / 100) * 12; // 12 months projection

        const metrics: CohortMetrics = {
          cohortId,
          period,
          retentionRate,
          repeatPurchaseRate,
          averageOrderValue: cohort.cohortSize > 0 ? 
            (Object.values(cohort.revenuePerUser).reduce((sum, val) => sum + val, 0) / 
             Object.keys(cohort.revenuePerUser).length) : 0,
          revenuePerUser,
          churnRate,
          lifetimeValue
        };

        report.push(metrics);
      });
    });

    this.weeklyReports = report;
    this.saveCohortData();

    // Send report to analytics
    analytics.track('cohort_report_generated', {
      report_date: now.toISOString(),
      total_cohorts: this.cohorts.size,
      total_users: this.users.size,
      avg_retention_d7: this.calculateAverageRetention('D7'),
      avg_retention_d30: this.calculateAverageRetention('D30')
    });

    return report;
  }

  private calculateAverageRetention(period: string): number {
    const retentionRates = Array.from(this.cohorts.values())
      .map(cohort => cohort.retentionRates[period] || 0)
      .filter(rate => rate > 0);
    
    return retentionRates.length > 0 ? 
      retentionRates.reduce((sum, rate) => sum + rate, 0) / retentionRates.length : 0;
  }

  // Get cohort retention heatmap data
  getRetentionHeatmap(): Array<{
    cohortId: string;
    cohortName: string;
    periods: Array<{ period: string; rate: number }>;
  }> {
    const heatmap = [];

    this.cohorts.forEach((cohort, cohortId) => {
      const periods = ['D1', 'D7', 'D30', 'D90', 'D180', 'D365']
        .map(period => ({
          period,
          rate: cohort.retentionRates[period] || 0
        }));

      heatmap.push({
        cohortId,
        cohortName: cohort.cohortName,
        periods
      });
    });

    return heatmap;
  }

  // Get cohort comparison data
  compareCohorts(cohortIds: string[]): Array<{
    cohortId: string;
    cohortName: string;
    metrics: {
      size: number;
      day1Retention: number;
      day7Retention: number;
      day30Retention: number;
      day90Retention: number;
      avgRevenuePerUser: number;
      totalRevenue: number;
    };
  }> {
    return cohortIds.map(cohortId => {
      const cohort = this.cohorts.get(cohortId);
      if (!cohort) return null;

      const totalRevenue = Object.values(cohort.revenuePerUser)
        .reduce((sum, revenue) => sum + revenue, 0);
      const avgRevenuePerUser = cohort.cohortSize > 0 ? totalRevenue / cohort.cohortSize : 0;

      return {
        cohortId,
        cohortName: cohort.cohortName,
        metrics: {
          size: cohort.cohortSize,
          day1Retention: cohort.metrics.day1,
          day7Retention: cohort.metrics.day7,
          day30Retention: cohort.metrics.day30,
          day90Retention: cohort.metrics.day90,
          avgRevenuePerUser,
          totalRevenue
        }
      };
    }).filter(Boolean) as any[];
  }

  // Export cohort data for external analysis
  exportData(): {
    cohorts: CohortData[];
    users: UserCohort[];
    weeklyReports: CohortMetrics[];
  } {
    return {
      cohorts: Array.from(this.cohorts.values()),
      users: Array.from(this.users.values()),
      weeklyReports: this.weeklyReports
    };
  }

  // Get at-risk cohorts (low retention)
  getAtRiskCohorts(): Array<{
    cohortId: string;
    cohortName: string;
    riskFactors: string[];
    recommendations: string[];
  }> {
    const atRiskCohorts = [];

    this.cohorts.forEach((cohort, cohortId) => {
      const riskFactors: string[] = [];
      const recommendations: string[] = [];

      // Check retention rates
      if (cohort.metrics.day7 < 20) {
        riskFactors.push('Low Day 7 retention');
        recommendations.push('Implement onboarding email sequence');
      }

      if (cohort.metrics.day30 < 10) {
        riskFactors.push('Low Day 30 retention');
        recommendations.push('Launch re-engagement campaign');
      }

      if (cohort.metrics.day90 < 5) {
        riskFactors.push('Low Day 90 retention');
        recommendations.push('Review product-market fit');
      }

      // Check repeat purchase rates
      const repeatRates = Object.values(cohort.repeatPurchaseRates);
      const avgRepeatRate = repeatRates.length > 0 ? 
        repeatRates.reduce((sum, rate) => sum + rate, 0) / repeatRates.length : 0;

      if (avgRepeatRate < 15) {
        riskFactors.push('Low repeat purchase rate');
        recommendations.push('Implement loyalty program');
      }

      if (riskFactors.length > 0) {
        atRiskCohorts.push({
          cohortId,
          cohortName: cohort.cohortName,
          riskFactors,
          recommendations
        });
      }
    });

    return atRiskCohorts;
  }
}

// Singleton instance
export const cohortAnalysis = new CohortAnalysis();

// Helper functions for tracking cohort events
export const trackUserAcquisition = (
  userId: string,
  channel: string,
  acquisitionDate?: string
) => {
  const date = acquisitionDate || new Date().toISOString();
  cohortAnalysis.assignUserToCohort(userId, date, channel);
};

export const trackUserPurchase = (userId: string, value: number) => {
  cohortAnalysis.trackUserActivity(userId, 'purchase', value);
};

export const trackUserEngagement = (userId: string) => {
  cohortAnalysis.trackUserActivity(userId, 'browse');
};

export const trackUserLogin = (userId: string) => {
  cohortAnalysis.trackUserActivity(userId, 'login');
};
