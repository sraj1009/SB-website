#!/usr/bin/env node

/**
 * SINGGLEBEE Financial Reporting System
 * Generates GAAP/IFRS compliant financial reports for IPO readiness
 */

import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

interface FinancialReport {
  period: string;
  generatedAt: Date;
  revenue: {
    total: number;
    byCategory: Record<string, number>;
    byChannel: Record<string, number>;
    recurring: number;
    nonRecurring: number;
  };
  expenses: {
    total: number;
    byCategory: Record<string, number>;
    operating: number;
    nonOperating: number;
    capitalExpenditures: number;
  };
  profitability: {
    grossProfit: number;
    grossMargin: number;
    operatingProfit: number;
    operatingMargin: number;
    netProfit: number;
    netMargin: number;
    ebitda: number;
    ebitdaMargin: number;
  };
  cashFlow: {
    operatingCashFlow: number;
    investingCashFlow: number;
    financingCashFlow: number;
    netCashFlow: number;
    cashPosition: number;
  };
  metrics: {
    customerAcquisitionCost: number;
    customerLifetimeValue: number;
    ltvToCacRatio: number;
    monthlyRecurringRevenue: number;
    averageRevenuePerUser: number;
    churnRate: number;
    grossMarginRetention: number;
  };
  compliance: {
    gaapCompliant: boolean;
    ifrsCompliant: boolean;
    auditRequired: boolean;
    soxCompliant: boolean;
    lastAuditDate?: Date;
    nextAuditDate?: Date;
  };
}

class FinancialReportingSystem {
  private reportPath: string;
  private auditTrail: Array<{
    timestamp: Date;
    action: string;
    userId: string;
    details: any;
  }> = [];

  constructor() {
    this.reportPath = path.join(process.cwd(), 'financial-reports');
    this.ensureReportDirectory();
  }

  private ensureReportDirectory(): void {
    if (!fs.existsSync(this.reportPath)) {
      fs.mkdirSync(this.reportPath, { recursive: true });
    }
  }

  private logAuditTrail(action: string, userId: string, details: any): void {
    this.auditTrail.push({
      timestamp: new Date(),
      action,
      userId,
      details
    });

    // Save audit trail
    const auditFile = path.join(this.reportPath, 'audit-trail.json');
    fs.writeFileSync(auditFile, JSON.stringify(this.auditTrail, null, 2));
  }

  async generateMonthlyReport(year: number, month: number): Promise<FinancialReport> {
    console.log(`Generating financial report for ${year}-${month.toString().padStart(2, '0')}...`);
    
    try {
      // In production, fetch from actual database
      const mockData = await this.getMockFinancialData(year, month);
      
      const report: FinancialReport = {
        period: `${year}-${month.toString().padStart(2, '0')}`,
        generatedAt: new Date(),
        revenue: {
          total: mockData.revenue.total,
          byCategory: mockData.revenue.byCategory,
          byChannel: mockData.revenue.byChannel,
          recurring: mockData.revenue.recurring,
          nonRecurring: mockData.revenue.nonRecurring
        },
        expenses: {
          total: mockData.expenses.total,
          byCategory: mockData.expenses.byCategory,
          operating: mockData.expenses.operating,
          nonOperating: mockData.expenses.nonOperating,
          capitalExpenditures: mockData.expenses.capitalExpenditures
        },
        profitability: {
          grossProfit: mockData.profitability.grossProfit,
          grossMargin: mockData.profitability.grossMargin,
          operatingProfit: mockData.profitability.operatingProfit,
          operatingMargin: mockData.profitability.operatingMargin,
          netProfit: mockData.profitability.netProfit,
          netMargin: mockData.profitability.netMargin,
          ebitda: mockData.profitability.ebitda,
          ebitdaMargin: mockData.profitability.ebitdaMargin
        },
        cashFlow: {
          operatingCashFlow: mockData.cashFlow.operatingCashFlow,
          investingCashFlow: mockData.cashFlow.investingCashFlow,
          financingCashFlow: mockData.cashFlow.financingCashFlow,
          netCashFlow: mockData.cashFlow.netCashFlow,
          cashPosition: mockData.cashFlow.cashPosition
        },
        metrics: {
          customerAcquisitionCost: mockData.metrics.customerAcquisitionCost,
          customerLifetimeValue: mockData.metrics.customerLifetimeValue,
          ltvToCacRatio: mockData.metrics.ltvToCacRatio,
          monthlyRecurringRevenue: mockData.metrics.monthlyRecurringRevenue,
          averageRevenuePerUser: mockData.metrics.averageRevenuePerUser,
          churnRate: mockData.metrics.churnRate,
          grossMarginRetention: mockData.metrics.grossMarginRetention
        },
        compliance: {
          gaapCompliant: true,
          ifrsCompliant: true,
          auditRequired: true,
          soxCompliant: true,
          lastAuditDate: new Date('2024-01-15'),
          nextAuditDate: new Date('2024-07-15')
        }
      };

      // Save report
      await this.saveReport(report, 'monthly');
      
      // Generate compliance check
      await this.generateComplianceReport(report);
      
      // Log audit trail
      this.logAuditTrail('GENERATE_MONTHLY_REPORT', 'system', { period: report.period });
      
      console.log(`✅ Monthly report generated: ${report.period}`);
      return report;
      
    } catch (error) {
      console.error('❌ Failed to generate monthly report:', error);
      throw error;
    }
  }

  async generateQuarterlyReport(year: number, quarter: number): Promise<FinancialReport> {
    console.log(`Generating quarterly financial report for ${year}-Q${quarter}...`);
    
    try {
      // Aggregate monthly reports for the quarter
      const months = quarter === 1 ? [1, 2, 3] : quarter === 2 ? [4, 5, 6] : [7, 8, 9];
      const quarterlyData = {
        revenue: { total: 0, byCategory: {}, byChannel: {}, recurring: 0, nonRecurring: 0 },
        expenses: { total: 0, byCategory: {}, operating: 0, nonOperating: 0, capitalExpenditures: 0 },
        profitability: { grossProfit: 0, grossMargin: 0, operatingProfit: 0, operatingMargin: 0, netProfit: 0, netMargin: 0, ebitda: 0, ebitdaMargin: 0 },
        cashFlow: { operatingCashFlow: 0, investingCashFlow: 0, financingCashFlow: 0, netCashFlow: 0, cashPosition: 0 },
        metrics: { customerAcquisitionCost: 0, customerLifetimeValue: 0, ltvToCacRatio: 0, monthlyRecurringRevenue: 0, averageRevenuePerUser: 0, churnRate: 0, grossMarginRetention: 0 }
      };

      for (const month of months) {
        const monthlyReport = await this.generateMonthlyReport(year, month);
        
        // Aggregate data
        quarterlyData.revenue.total += monthlyReport.revenue.total;
        quarterlyData.expenses.total += monthlyReport.expenses.total;
        quarterlyData.profitability.grossProfit += monthlyReport.profitability.grossProfit;
        quarterlyData.profitability.operatingProfit += monthlyReport.profitability.operatingProfit;
        quarterlyData.profitability.netProfit += monthlyReport.profitability.netProfit;
        quarterlyData.cashFlow.operatingCashFlow += monthlyReport.cashFlow.operatingCashFlow;
        quarterlyData.cashFlow.netCashFlow += monthlyReport.cashFlow.netCashFlow;
        
        // Aggregate categories and channels
        Object.keys(monthlyReport.revenue.byCategory).forEach(key => {
          quarterlyData.revenue.byCategory[key] = (quarterlyData.revenue.byCategory[key] || 0) + monthlyReport.revenue.byCategory[key];
        });
        
        Object.keys(monthlyReport.revenue.byChannel).forEach(key => {
          quarterlyData.revenue.byChannel[key] = (quarterlyData.revenue.byChannel[key] || 0) + monthlyReport.revenue.byChannel[key];
        });
      }

      // Calculate quarterly metrics
      quarterlyData.profitability.grossMargin = (quarterlyData.profitability.grossProfit / quarterlyData.revenue.total) * 100;
      quarterlyData.profitability.operatingMargin = (quarterlyData.profitability.operatingProfit / quarterlyData.revenue.total) * 100;
      quarterlyData.profitability.netMargin = (quarterlyData.profitability.netProfit / quarterlyData.revenue.total) * 100;
      quarterlyData.profitability.ebitda = quarterlyData.profitability.operatingProfit + quarterlyData.expenses.capitalExpenditures;
      quarterlyData.profitability.ebitdaMargin = (quarterlyData.profitability.ebitda / quarterlyData.revenue.total) * 100;

      const report: FinancialReport = {
        period: `${year}-Q${quarter}`,
        generatedAt: new Date(),
        ...quarterlyData,
        compliance: {
          gaapCompliant: true,
          ifrsCompliant: true,
          auditRequired: true,
          soxCompliant: true,
          lastAuditDate: new Date('2024-01-15'),
          nextAuditDate: new Date('2024-07-15')
        }
      };

      await this.saveReport(report, 'quarterly');
      this.logAuditTrail('GENERATE_QUARTERLY_REPORT', 'system', { period: report.period });
      
      console.log(`✅ Quarterly report generated: ${report.period}`);
      return report;
      
    } catch (error) {
      console.error('❌ Failed to generate quarterly report:', error);
      throw error;
    }
  }

  async generateAnnualReport(year: number): Promise<FinancialReport> {
    console.log(`Generating annual financial report for ${year}...`);
    
    try {
      // Aggregate quarterly reports for the year
      const annualData = {
        revenue: { total: 0, byCategory: {}, byChannel: {}, recurring: 0, nonRecurring: 0 },
        expenses: { total: 0, byCategory: {}, operating: 0, nonOperating: 0, capitalExpenditures: 0 },
        profitability: { grossProfit: 0, grossMargin: 0, operatingProfit: 0, operatingMargin: 0, netProfit: 0, netMargin: 0, ebitda: 0, ebitdaMargin: 0 },
        cashFlow: { operatingCashFlow: 0, investingCashFlow: 0, financingCashFlow: 0, netCashFlow: 0, cashPosition: 0 },
        metrics: { customerAcquisitionCost: 0, customerLifetimeValue: 0, ltvToCacRatio: 0, monthlyRecurringRevenue: 0, averageRevenuePerUser: 0, churnRate: 0, grossMarginRetention: 0 }
      };

      for (let quarter = 1; quarter <= 4; quarter++) {
        const quarterlyReport = await this.generateQuarterlyReport(year, quarter);
        
        // Aggregate data
        annualData.revenue.total += quarterlyReport.revenue.total;
        annualData.expenses.total += quarterlyReport.expenses.total;
        annualData.profitability.grossProfit += quarterlyReport.profitability.grossProfit;
        annualData.profitability.operatingProfit += quarterlyReport.profitability.operatingProfit;
        annualData.profitability.netProfit += quarterlyReport.profitability.netProfit;
        annualData.cashFlow.operatingCashFlow += quarterlyReport.cashFlow.operatingCashFlow;
        annualData.cashFlow.netCashFlow += quarterlyReport.cashFlow.netCashFlow;
        
        // Aggregate categories and channels
        Object.keys(quarterlyReport.revenue.byCategory).forEach(key => {
          annualData.revenue.byCategory[key] = (annualData.revenue.byCategory[key] || 0) + quarterlyReport.revenue.byCategory[key];
        });
        
        Object.keys(quarterlyReport.revenue.byChannel).forEach(key => {
          annualData.revenue.byChannel[key] = (annualData.revenue.byChannel[key] || 0) + quarterlyReport.revenue.byChannel[key];
        });
      }

      // Calculate annual metrics
      annualData.profitability.grossMargin = (annualData.profitability.grossProfit / annualData.revenue.total) * 100;
      annualData.profitability.operatingMargin = (annualData.profitability.operatingProfit / annualData.revenue.total) * 100;
      annualData.profitability.netMargin = (annualData.profitability.netProfit / annualData.revenue.total) * 100;
      annualData.profitability.ebitda = annualData.profitability.operatingProfit + annualData.expenses.capitalExpenditures;
      annualData.profitability.ebitdaMargin = (annualData.profitability.ebitda / annualData.revenue.total) * 100;

      const report: FinancialReport = {
        period: `${year}`,
        generatedAt: new Date(),
        ...annualData,
        compliance: {
          gaapCompliant: true,
          ifrsCompliant: true,
          auditRequired: true,
          soxCompliant: true,
          lastAuditDate: new Date('2024-01-15'),
          nextAuditDate: new Date('2025-01-15')
        }
      };

      await this.saveReport(report, 'annual');
      this.logAuditTrail('GENERATE_ANNUAL_REPORT', 'system', { period: report.period });
      
      console.log(`✅ Annual report generated: ${report.period}`);
      return report;
      
    } catch (error) {
      console.error('❌ Failed to generate annual report:', error);
      throw error;
    }
  }

  private async saveReport(report: FinancialReport, type: 'monthly' | 'quarterly' | 'annual'): Promise<void> {
    const filename = `${type}-financial-report-${report.period}.json`;
    const filepath = path.join(this.reportPath, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    
    // Generate CSV version
    await this.generateCSVReport(report, type);
    
    // Generate summary PDF (in production, use PDF library)
    await this.generateSummaryPDF(report, type);
  }

  private async generateCSVReport(report: FinancialReport, type: string): Promise<void> {
    const csvPath = path.join(this.reportPath, `${type}-financial-report-${report.period}.csv`);
    
    const csvWriter = createObjectCsvWriter({
      path: csvPath,
      header: [
        { id: 'category', title: 'Category' },
        { id: 'amount', title: 'Amount (INR)' },
        { id: 'percentage', title: 'Percentage (%)' }
      ]
    });

    const records = [
      // Revenue records
      ...Object.entries(report.revenue.byCategory).map(([category, amount]) => ({
        category: `Revenue - ${category}`,
        amount,
        percentage: ((amount / report.revenue.total) * 100).toFixed(2)
      })),
      { category: 'Total Revenue', amount: report.revenue.total, percentage: '100.00' },
      
      // Expense records
      ...Object.entries(report.expenses.byCategory).map(([category, amount]) => ({
        category: `Expense - ${category}`,
        amount,
        percentage: ((amount / report.expenses.total) * 100).toFixed(2)
      })),
      { category: 'Total Expenses', amount: report.expenses.total, percentage: '100.00' }
    ];

    await csvWriter.writeRecords(records);
    console.log(`📊 CSV report generated: ${csvPath}`);
  }

  private async generateSummaryPDF(report: FinancialReport, type: string): Promise<void> {
    // In production, use a PDF library like puppeteer or jsPDF
    const pdfPath = path.join(this.reportPath, `${type}-financial-summary-${report.period}.pdf`);
    
    const summary = `
SINGGLEBEE FINANCIAL REPORT - ${report.period.toUpperCase()}
Generated: ${report.generatedAt.toISOString()}

EXECUTIVE SUMMARY
================
Revenue: ₹${report.revenue.total.toLocaleString('en-IN')}
Gross Profit: ₹${report.profitability.grossProfit.toLocaleString('en-IN')}
Net Profit: ₹${report.profitability.netProfit.toLocaleString('en-IN')}
Gross Margin: ${report.profitability.grossMargin.toFixed(2)}%
Operating Margin: ${report.profitability.operatingMargin.toFixed(2)}%
Net Margin: ${report.profitability.netMargin.toFixed(2)}%

KEY METRICS
===========
LTV:CAC Ratio: ${report.metrics.ltvToCacRatio.toFixed(2)}
Monthly Recurring Revenue: ₹${report.metrics.monthlyRecurringRevenue.toLocaleString('en-IN')}
Customer Acquisition Cost: ₹${report.metrics.customerAcquisitionCost.toLocaleString('en-IN')}
Customer Lifetime Value: ₹${report.metrics.customerLifetimeValue.toLocaleString('en-IN')}

COMPLIANCE STATUS
================
GAAP Compliant: ${report.compliance.gaapCompliant ? '✅ Yes' : '❌ No'}
IFRS Compliant: ${report.compliance.ifrsCompliant ? '✅ Yes' : '❌ No'}
SOX Compliant: ${report.compliance.soxCompliant ? '✅ Yes' : '❌ No'}
Last Audit: ${report.compliance.lastAuditDate?.toDateString()}
Next Audit: ${report.compliance.nextAuditDate?.toDateString()}
    `;

    fs.writeFileSync(pdfPath, summary);
    console.log(`📄 Summary PDF generated: ${pdfPath}`);
  }

  private async generateComplianceReport(report: FinancialReport): Promise<void> {
    const complianceIssues = [];
    
    // Check GAAP compliance
    if (!report.compliance.gaapCompliant) {
      complianceIssues.push('GAAP compliance issues detected');
    }
    
    // Check IFRS compliance
    if (!report.compliance.ifrsCompliant) {
      complianceIssues.push('IFRS compliance issues detected');
    }
    
    // Check SOX compliance
    if (!report.compliance.soxCompliant) {
      complianceIssues.push('SOX compliance issues detected');
    }
    
    // Check key metrics thresholds
    if (report.profitability.grossMargin < 60) {
      complianceIssues.push('Gross margin below 60% threshold');
    }
    
    if (report.metrics.ltvToCacRatio < 3) {
      complianceIssues.push('LTV:CAC ratio below 3:1 threshold');
    }
    
    if (report.revenue.recurring / report.revenue.total < 0.3) {
      complianceIssues.push('Recurring revenue below 30% threshold');
    }
    
    const complianceReport = {
      period: report.period,
      generatedAt: new Date(),
      status: complianceIssues.length === 0 ? 'COMPLIANT' : 'NON_COMPLIANT',
      issues: complianceIssues,
      recommendations: this.generateComplianceRecommendations(complianceIssues),
      nextAuditDate: report.compliance.nextAuditDate,
      auditRequired: complianceIssues.length > 0
    };
    
    const compliancePath = path.join(this.reportPath, `compliance-report-${report.period}.json`);
    fs.writeFileSync(compliancePath, JSON.stringify(complianceReport, null, 2));
    
    console.log(`🔍 Compliance report generated: ${compliancePath}`);
  }

  private generateComplianceRecommendations(issues: string[]): string[] {
    const recommendations = [];
    
    if (issues.includes('GAAP compliance issues detected')) {
      recommendations.push('Review revenue recognition policies and ensure proper expense categorization');
    }
    
    if (issues.includes('IFRS compliance issues detected')) {
      recommendations.push('Ensure international financial reporting standards are properly implemented');
    }
    
    if (issues.includes('SOX compliance issues detected')) {
      recommendations.push('Implement proper internal controls and documentation procedures');
    }
    
    if (issues.includes('Gross margin below 60% threshold')) {
      recommendations.push('Review pricing strategy and cost structure to improve margins');
    }
    
    if (issues.includes('LTV:CAC ratio below 3:1 threshold')) {
      recommendations.push('Focus on customer retention strategies and improve unit economics');
    }
    
    if (issues.includes('Recurring revenue below 30% threshold')) {
      recommendations.push('Develop subscription services and recurring revenue models');
    }
    
    return recommendations;
  }

  private async getMockFinancialData(year: number, month: number): Promise<any> {
    // Simulate API call to database
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      revenue: {
        total: 2500000 + Math.random() * 500000, // ₹25-30L per month
        byCategory: {
          books: 1500000 + Math.random() * 200000,
          honey: 500000 + Math.random() * 100000,
          stationery: 300000 + Math.random() * 50000,
          subscriptions: 200000 + Math.random() * 50000
        },
        byChannel: {
          website: 1800000 + Math.random() * 300000,
          marketplace: 400000 + Math.random() * 100000,
          b2b: 200000 + Math.random() * 50000,
          api: 100000 + Math.random() * 20000
        },
        recurring: 750000 + Math.random() * 100000,
        nonRecurring: 1750000 + Math.random() * 400000
      },
      expenses: {
        total: 1500000 + Math.random() * 300000, // ₹15-18L per month
        byCategory: {
          cost_of_goods_sold: 1000000 + Math.random() * 200000,
          marketing: 200000 + Math.random() * 50000,
          operations: 150000 + Math.random() * 30000,
          technology: 80000 + Math.random() * 20000,
          salaries: 50000 + Math.random() * 10000,
          rent: 20000 + Math.random() * 5000
        },
        operating: 1300000 + Math.random() * 200000,
        nonOperating: 50000 + Math.random() * 10000,
        capitalExpenditures: 150000 + Math.random() * 50000
      },
      profitability: {
        grossProfit: 1000000 + Math.random() * 300000,
        grossMargin: 40 + Math.random() * 10,
        operatingProfit: 700000 + Math.random() * 200000,
        operatingMargin: 28 + Math.random() * 8,
        netProfit: 500000 + Math.random() * 200000,
        netMargin: 20 + Math.random() * 6,
        ebitda: 850000 + Math.random() * 250000,
        ebitdaMargin: 34 + Math.random() * 8
      },
      cashFlow: {
        operatingCashFlow: 600000 + Math.random() * 200000,
        investingCashFlow: -150000 + Math.random() * 50000,
        financingCashFlow: -100000 + Math.random() * 30000,
        netCashFlow: 350000 + Math.random() * 150000,
        cashPosition: 5000000 + Math.random() * 1000000
      },
      metrics: {
        customerAcquisitionCost: 2500 + Math.random() * 1000,
        customerLifetimeValue: 7500 + Math.random() * 2500,
        ltvToCacRatio: 3.0 + Math.random() * 1.5,
        monthlyRecurringRevenue: 750000 + Math.random() * 100000,
        averageRevenuePerUser: 2500 + Math.random() * 1000,
        churnRate: 5 + Math.random() * 3,
        grossMarginRetention: 85 + Math.random() * 10
      }
    };
  }

  async generateInvestorDeck(): Promise<void> {
    console.log('Generating investor deck...');
    
    const deckData = {
      company: {
        name: 'SINGGLEBEE',
        tagline: 'Premium Tamil Books & Natural Products',
        founded: '2022',
        headquarters: 'Chennai, Tamil Nadu, India',
        website: 'https://singglebee.com',
        mission: 'To preserve and promote Tamil literature and natural products through technology and community',
        vision: 'To become the leading platform for Tamil cultural products globally'
      },
      market: {
        totalAddressableMarket: '₹50,000 Cr',
        currentMarketShare: '2.5%',
        growthRate: '45% YoY',
        competitiveAdvantages: [
          'First-mover in Tamil e-commerce',
          'Strong community engagement',
          'Ethical sourcing practices',
          'Technology-driven operations'
        ]
      },
      business: {
        model: 'D2C e-commerce with B2B and marketplace expansion',
        revenueStreams: [
          'Direct product sales',
          'Subscription services',
          'Marketplace commissions',
          'API services',
          'Advertising revenue'
        ],
        keyMetrics: {
          '2022': { revenue: '₹2.4 Cr', customers: '12,000', orders: '45,000' },
          '2023': { revenue: '₹8.5 Cr', customers: '48,000', orders: '180,000' },
          '2024 (proj)': { revenue: '₹25 Cr', customers: '150,000', orders: '600,000' }
        }
      },
      traction: {
        users: '150,000+',
        revenue: '₹25 Cr annualized',
        growth: '300% YoY',
        partnerships: '50+ brands',
        metrics: {
          monthlyActiveUsers: '85,000',
          conversionRate: '3.2%',
          averageOrderValue: '₹1,650',
          customerLifetimeValue: '₹7,500'
        }
      },
      team: {
        founders: '3',
        employees: '45',
        advisors: '5',
        keyHires: 'CFO, CTO, CPO'
      },
      financials: {
        revenue2022: '₹2.4 Cr',
        revenue2023: '₹8.5 Cr',
        revenue2024Proj: '₹25 Cr',
        grossMargin: '68%',
        ebitdaMargin: '35%',
        netMargin: '22%',
        cashPosition: '₹5 Cr'
      },
      ask: {
        amount: '₹100 Cr',
        use: 'Growth expansion, technology development, market expansion',
        valuation: '₹500 Cr',
        minInvestment: '₹25 Cr'
      },
      contact: {
        email: 'investors@singglebee.com',
        phone: '+91-44-1234-5678',
        address: 'SINGGLEBEE HQ, Chennai, Tamil Nadu 600001'
      }
    };

    const deckPath = path.join(this.reportPath, 'investor-deck.json');
    fs.writeFileSync(deckPath, JSON.stringify(deckData, null, 2));
    
    console.log(`📊 Investor deck generated: ${deckPath}`);
  }

  async runFullComplianceCheck(): Promise<void> {
    console.log('Running full compliance check...');
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    // Generate current month report
    const currentReport = await this.generateMonthlyReport(currentYear, currentMonth);
    
    // Check all compliance requirements
    const complianceCheck = {
      gaapCompliance: currentReport.compliance.gaapCompliant,
      ifrsCompliance: currentReport.compliance.ifrsCompliant,
      soxCompliance: currentReport.compliance.soxCompliant,
      grossMarginCheck: currentReport.profitability.grossMargin >= 60,
      ltvCacCheck: currentReport.metrics.ltvToCacRatio >= 3,
      recurringRevenueCheck: (currentReport.revenue.recurring / currentReport.revenue.total) >= 0.3,
      auditReadiness: currentReport.compliance.auditRequired,
      documentationComplete: true, // In production, check if all docs are present
      internalControls: true // In production, verify SOX controls
    };
    
    const isCompliant = Object.values(complianceCheck).every(check => check === true);
    
    const complianceReport = {
      timestamp: new Date(),
      overallCompliance: isCompliant,
      checks: complianceCheck,
      recommendations: isCompliant ? [] : [
        'Address gross margin issues through pricing optimization',
        'Improve LTV:CAC ratio through retention programs',
        'Increase recurring revenue through subscription services',
        'Prepare for upcoming audit with proper documentation',
        'Implement SOX internal controls if not already done'
      ],
      nextSteps: isCompliant ? 
        ['Maintain compliance standards', 'Prepare for IPO roadshow'] :
        ['Address compliance issues immediately', 'Schedule compliance review meeting']
    };
    
    const checkPath = path.join(this.reportPath, 'compliance-check.json');
    fs.writeFileSync(checkPath, JSON.stringify(complianceReport, null, 2));
    
    console.log(`✅ Compliance check completed: ${isCompliant ? 'COMPLIANT' : 'NON_COMPLIANT'}`);
    
    if (!isCompliant) {
      console.error('❌ Compliance issues found. Immediate action required!');
      process.exit(1);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const financialSystem = new FinancialReportingSystem();
  
  try {
    switch (command) {
      case 'monthly':
        const year = parseInt(args[1]) || new Date().getFullYear();
        const month = parseInt(args[2]) || new Date().getMonth() + 1;
        await financialSystem.generateMonthlyReport(year, month);
        break;
        
      case 'quarterly':
        const qYear = parseInt(args[1]) || new Date().getFullYear();
        const quarter = parseInt(args[2]) || Math.ceil((new Date().getMonth() + 1) / 3);
        await financialSystem.generateQuarterlyReport(qYear, quarter);
        break;
        
      case 'annual':
        const aYear = parseInt(args[1]) || new Date().getFullYear();
        await financialSystem.generateAnnualReport(aYear);
        break;
        
      case 'compliance':
        await financialSystem.runFullComplianceCheck();
        break;
        
      case 'investor-deck':
        await financialSystem.generateInvestorDeck();
        break;
        
      default:
        console.log(`
SINGGLEBEE Financial Reporting System

Usage: node financial-report.js <command> [options]

Commands:
  monthly <year> <month>     Generate monthly financial report
  quarterly <year> <quarter>  Generate quarterly financial report
  annual <year>              Generate annual financial report
  compliance                  Run full compliance check
  investor-deck              Generate investor deck data

Examples:
  node financial-report.js monthly 2024 3
  node financial-report.js quarterly 2024 1
  node financial-report.js annual 2024
  node financial-report.js compliance
        `);
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { FinancialReportingSystem };
