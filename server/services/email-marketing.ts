// 📧 Email Marketing Automation for SINGGLEBEE

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface EmailCampaign {
  id: string;
  name: string;
  type: 'welcome' | 'abandoned_cart' | 'promotional' | 'educational' | 'reengagement';
  trigger: 'signup' | 'purchase' | 'cart_abandonment' | 'inactivity' | 'manual';
  delay?: number; // in hours
  conditions?: Record<string, any>;
  template: EmailTemplate;
  isActive: boolean;
  sentCount: number;
  openRate: number;
  clickRate: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CustomerSegment {
  id: string;
  name: string;
  conditions: {
    ageGroup?: string[];
    categories?: string[];
    purchaseHistory?: {
      minAmount?: number;
      maxAmount?: number;
      minOrders?: number;
      maxOrders?: number;
    };
    lastPurchase?: {
      before?: Date;
      after?: Date;
    };
    activity?: {
      lastLogin?: {
        before?: Date;
        after?: Date;
      };
      cartValue?: {
        min?: number;
        max?: number;
      };
    };
  };
  customerCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface EmailAnalytics {
  campaignId: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  spamComplaints: number;
  revenue: number;
  conversionRate: number;
  date: Date;
}

class EmailMarketingService {
  private transporter: nodemailer.Transporter;
  private campaigns: Map<string, EmailCampaign> = new Map();
  private segments: Map<string, CustomerSegment> = new Map();
  private analytics: Map<string, EmailAnalytics[]> = new Map();

  constructor() {
    this.initializeTransporter();
    this.loadCampaigns();
    this.loadSegments();
    this.loadAnalytics();
  }

  // Initialize email transporter
  private initializeTransporter(): void {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Load campaigns from database
  private async loadCampaigns(): Promise<void> {
    try {
      // In production, load from database
      const defaultCampaigns: EmailCampaign[] = [
        {
          id: 'welcome-series-1',
          name: 'Welcome Email - Day 1',
          type: 'welcome',
          trigger: 'signup',
          delay: 0,
          template: this.getWelcomeTemplate(),
          isActive: true,
          sentCount: 0,
          openRate: 0,
          clickRate: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'welcome-series-2',
          name: 'Welcome Email - Day 3',
          type: 'welcome',
          trigger: 'signup',
          delay: 72,
          template: this.getWelcomeFollowUpTemplate(),
          isActive: true,
          sentCount: 0,
          openRate: 0,
          clickRate: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'abandoned-cart-1',
          name: 'Cart Abandonment - 1 Hour',
          type: 'abandoned_cart',
          trigger: 'cart_abandonment',
          delay: 1,
          template: this.getAbandonedCartTemplate(),
          isActive: true,
          sentCount: 0,
          openRate: 0,
          clickRate: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'abandoned-cart-2',
          name: 'Cart Abandonment - 24 Hours',
          type: 'abandoned_cart',
          trigger: 'cart_abandonment',
          delay: 24,
          template: this.getAbandonedCartFollowUpTemplate(),
          isActive: true,
          sentCount: 0,
          openRate: 0,
          clickRate: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      defaultCampaigns.forEach(campaign => {
        this.campaigns.set(campaign.id, campaign);
      });
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    }
  }

  // Load segments from database
  private async loadSegments(): Promise<void> {
    try {
      const defaultSegments: CustomerSegment[] = [
        {
          id: 'new-customers',
          name: 'New Customers',
          conditions: {
            purchaseHistory: {
              minOrders: 0,
              maxOrders: 1
            }
          },
          customerCount: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'repeat-customers',
          name: 'Repeat Customers',
          conditions: {
            purchaseHistory: {
              minOrders: 2
            }
          },
          customerCount: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'high-value-customers',
          name: 'High Value Customers',
          conditions: {
            purchaseHistory: {
              minAmount: 1000,
              minOrders: 3
            }
          },
          customerCount: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'inactive-customers',
          name: 'Inactive Customers',
          conditions: {
            activity: {
              lastLogin: {
                before: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
              }
            }
          },
          customerCount: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      defaultSegments.forEach(segment => {
        this.segments.set(segment.id, segment);
      });
    } catch (error) {
      console.error('Failed to load segments:', error);
    }
  }

  // Load analytics from database
  private async loadAnalytics(): Promise<void> {
    try {
      // In production, load from database
      console.log('Analytics loaded');
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  }

  // Send email
  async sendEmail(to: string, template: EmailTemplate, campaignId?: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@singglebee.com',
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
        headers: {
          'X-Mailer': 'SINGGLEBEE Email Marketing',
          'X-Priority': '3',
          'X-Campaign-ID': campaignId || ''
        }
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      // Track analytics
      if (campaignId) {
        this.trackEmailSent(campaignId);
      }

      console.log('Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  // Trigger campaign
  async triggerCampaign(
    campaignId: string,
    customerData: any,
    customData?: any
  ): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign || !campaign.isActive) {
      return;
    }

    // Check conditions
    if (campaign.conditions && !this.evaluateConditions(campaign.conditions, customerData)) {
      return;
    }

    // Personalize template
    const personalizedTemplate = this.personalizeTemplate(
      campaign.template,
      customerData,
      customData
    );

    // Send email
    const success = await this.sendEmail(customerData.email, personalizedTemplate, campaignId);
    
    if (success) {
      // Update campaign stats
      campaign.sentCount++;
      campaign.updatedAt = new Date();
    }
  }

  // Evaluate conditions
  private evaluateConditions(conditions: Record<string, any>, customerData: any): boolean {
    // Simple condition evaluation - in production, use more sophisticated logic
    return true;
  }

  // Personalize template
  private personalizeTemplate(
    template: EmailTemplate,
    customerData: any,
    customData?: any
  ): EmailTemplate {
    let html = template.html;
    let text = template.text;
    let subject = template.subject;

    // Replace common placeholders
    const replacements = {
      '{{customer_name}}': customerData.firstName || customerData.name || 'Valued Customer',
      '{{customer_email}}': customerData.email || '',
      '{{customer_phone}}': customerData.phone || '',
      '{{cart_items}}': customData?.cartItems?.length || 0,
      '{{cart_total}}': customData?.cartTotal || 0,
      '{{product_name}}': customData?.productName || '',
      '{{product_price}}': customData?.productPrice || 0,
      '{{order_id}}': customData?.orderId || '',
      '{{order_total}}': customData?.orderTotal || 0,
      '{{unsub_url}}': `${process.env.FRONTEND_URL}/unsubscribe?email=${customerData.email}`,
      '{{website_url}}': process.env.FRONTEND_URL || 'https://singglebee.com'
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      html = html.replace(new RegExp(placeholder, 'g'), String(value));
      text = text.replace(new RegExp(placeholder, 'g'), String(value));
      subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return { subject, html, text };
  }

  // Track email sent
  private trackEmailSent(campaignId: string): void {
    if (!this.analytics.has(campaignId)) {
      this.analytics.set(campaignId, []);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const analytics = this.analytics.get(campaignId)!;
    const todayAnalytics = analytics.find(a => 
      a.date.toDateString() === today.toDateString()
    );

    if (todayAnalytics) {
      todayAnalytics.sent++;
    } else {
      analytics.push({
        campaignId,
        sent: 1,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        unsubscribed: 0,
        spamComplaints: 0,
        revenue: 0,
        conversionRate: 0,
        date: today
      });
    }
  }

  // Track email opened
  trackEmailOpened(campaignId: string): void {
    this.updateAnalytics(campaignId, 'opened');
  }

  // Track email clicked
  trackEmailClicked(campaignId: string): void {
    this.updateAnalytics(campaignId, 'clicked');
  }

  // Track email bounced
  trackEmailBounced(campaignId: string): void {
    this.updateAnalytics(campaignId, 'bounced');
  }

  // Track unsubscribe
  trackUnsubscribe(campaignId: string): void {
    this.updateAnalytics(campaignId, 'unsubscribed');
  }

  // Update analytics
  private updateAnalytics(campaignId: string, metric: keyof Omit<EmailAnalytics, 'campaignId' | 'date' | 'conversionRate' | 'revenue'>): void {
    const analytics = this.analytics.get(campaignId);
    if (!analytics) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAnalytics = analytics.find(a => 
      a.date.toDateString() === today.toDateString()
    );

    if (todayAnalytics) {
      todayAnalytics[metric]++;
      this.calculateRates(todayAnalytics);
    }
  }

  // Calculate rates
  private calculateRates(analytics: EmailAnalytics): void {
    analytics.openRate = analytics.sent > 0 ? (analytics.opened / analytics.sent) * 100 : 0;
    analytics.clickRate = analytics.sent > 0 ? (analytics.clicked / analytics.sent) * 100 : 0;
    analytics.conversionRate = analytics.clicked > 0 ? (analytics.revenue / analytics.clicked) * 100 : 0;
  }

  // Get welcome template
  private getWelcomeTemplate(): EmailTemplate {
    return {
      subject: 'Welcome to SINGGLEBEE! 🐝',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to SINGGLEBEE</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #FFC107; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
            .btn { display: inline-block; background: #FFC107; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; }
            .feature { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🐝 Welcome to SINGGLEBEE!</h1>
              <p>Your journey to quality Tamil education starts here</p>
            </div>
            
            <div class="content">
              <p>Hi {{customer_name}},</p>
              <p>Thank you for joining the SINGGLEBEE family! We're excited to help you discover the best educational content for your little ones.</p>
              
              <div class="feature">
                <h3>📚 Premium Educational Content</h3>
                <p>Access high-quality Tamil books, poems, rhymes, and stories</p>
              </div>
              
              <div class="feature">
                <h3>🎯 Age-Appropriate Learning</h3>
                <p>Content carefully curated for different age groups</p>
              </div>
              
              <div class="feature">
                <h3>🚀 Fast & Secure Delivery</h3>
                <p>Get your educational materials delivered safely to your doorstep</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{website_url}}" class="btn">Start Exploring</a>
              </div>
            </div>
            
            <div class="footer">
              <p>Happy learning! 📖</p>
              <p><small>If you have any questions, reply to this email or contact our support team.</small></p>
              <p><small><a href="{{unsub_url}}">Unsubscribe</a></small></p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to SINGGLEBEE! 🐝
        
        Hi {{customer_name}},
        
        Thank you for joining the SINGGLEBEE family! We're excited to help you discover the best educational content for your little ones.
        
        What we offer:
        • Premium Educational Content
        • Age-Appropriate Learning
        • Fast & Secure Delivery
        
        Start exploring: {{website_url}}
        
        Happy learning! 📖
        
        Unsubscribe: {{unsub_url}}
      `
    };
  }

  // Get abandoned cart template
  private getAbandonedCartTemplate(): EmailTemplate {
    return {
      subject: 'Did you forget something? 🛒',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Complete Your Purchase</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #FFC107; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
            .btn { display: inline-block; background: #FFC107; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; }
            .cart-item { margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🛒 Complete Your Purchase</h1>
              <p>Your cart is waiting for you!</p>
            </div>
            
            <div class="content">
              <p>Hi {{customer_name}},</p>
              <p>We noticed you left some amazing educational items in your cart. Don't miss out on these great learning resources!</p>
              
              <div class="cart-item">
                <h3>📚 {{cart_items}} items in your cart</h3>
                <p>Total: ₹{{cart_total}}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{website_url}}/cart" class="btn">Complete Your Order</a>
              </div>
              
              <p><small>Items in your cart are reserved for you. Complete your purchase before they're gone!</small></p>
            </div>
            
            <div class="footer">
              <p>Happy learning! 📖</p>
              <p><small><a href="{{unsub_url}}">Unsubscribe</a></small></p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Complete Your Purchase 🛒
        
        Hi {{customer_name}},
        
        We noticed you left some amazing educational items in your cart. Don't miss out on these great learning resources!
        
        {{cart_items}} items in your cart
        Total: ₹{{cart_total}}
        
        Complete your order: {{website_url}}/cart
        
        Items in your cart are reserved for you. Complete your purchase before they're gone!
        
        Unsubscribe: {{unsub_url}}
      `
    };
  }

  // Get welcome follow-up template
  private getWelcomeFollowUpTemplate(): EmailTemplate {
    return {
      subject: 'How is your SINGGLEBEE experience? 🌟',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>How are you enjoying SINGGLEBEE?</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #FFC107; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
            .btn { display: inline-block; background: #FFC107; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; }
            .tip { margin: 20px 0; padding: 15px; background: #e8f5e8; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌟 How are you enjoying SINGGLEBEE?</h1>
              <p>We'd love to hear from you!</p>
            </div>
            
            <div class="content">
              <p>Hi {{customer_name}},</p>
              <p>It's been a few days since you joined SINGGLEBEE. We hope you're enjoying our educational content!</p>
              
              <div class="tip">
                <h3>💡 Pro Tip:</h3>
                <p>Did you know we have age-specific recommendations? Use our filters to find perfect content for your child's age group!</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{website_url}}/products" class="btn">Explore New Arrivals</a>
              </div>
              
              <p>If you have any questions or need help finding the perfect educational materials, just reply to this email. We're here to help!</p>
            </div>
            
            <div class="footer">
              <p>Happy learning! 📖</p>
              <p><small><a href="{{unsub_url}}">Unsubscribe</a></small></p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        How are you enjoying SINGGLEBEE? 🌟
        
        Hi {{customer_name}},
        
        It's been a few days since you joined SINGGLEBEE. We hope you're enjoying our educational content!
        
        💡 Pro Tip: Did you know we have age-specific recommendations? Use our filters to find perfect content for your child's age group!
        
        Explore new arrivals: {{website_url}}/products
        
        If you have any questions or need help finding the perfect educational materials, just reply to this email. We're here to help!
        
        Happy learning! 📖
        
        Unsubscribe: {{unsub_url}}
      `
    };
  }

  // Get abandoned cart follow-up template
  private getAbandonedCartFollowUpTemplate(): EmailTemplate {
    return {
      subject: 'Last chance! Your cart expires soon ⏰',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Last Chance - Complete Your Order</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #FF6B6B; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; color: white; }
            .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
            .btn { display: inline-block; background: #FFC107; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; }
            .urgent { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Last Chance!</h1>
              <p>Your cart items are about to expire</p>
            </div>
            
            <div class="content">
              <p>Hi {{customer_name}},</p>
              
              <div class="urgent">
                <h3>⚠️ URGENT: Your cart expires in 24 hours!</h3>
                <p>The educational items you've selected are in high demand and won't be held for much longer.</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{website_url}}/cart" class="btn">Complete Your Order Now</a>
              </div>
              
              <p><strong>Don't miss out on these learning opportunities for your child!</strong></p>
              <p>Cart Total: ₹{{cart_total}}</p>
            </div>
            
            <div class="footer">
              <p>Happy learning! 📖</p>
              <p><small><a href="{{unsub_url}}">Unsubscribe</a></small></p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Last Chance! Your cart expires soon ⏰
        
        Hi {{customer_name}},
        
        ⚠️ URGENT: Your cart expires in 24 hours!
        
        The educational items you've selected are in high demand and won't be held for much longer.
        
        Complete your order now: {{website_url}}/cart
        
        Don't miss out on these learning opportunities for your child!
        Cart Total: ₹{{cart_total}}
        
        Happy learning! 📖
        
        Unsubscribe: {{unsub_url}}
      `
    };
  }

  // Get campaign analytics
  getCampaignAnalytics(campaignId: string): EmailAnalytics[] {
    return this.analytics.get(campaignId) || [];
  }

  // Get all campaigns
  getAllCampaigns(): EmailCampaign[] {
    return Array.from(this.campaigns.values());
  }

  // Get all segments
  getAllSegments(): CustomerSegment[] {
    return Array.from(this.segments.values());
  }

  // Create custom campaign
  async createCustomCampaign(
    name: string,
    type: EmailCampaign['type'],
    template: EmailTemplate,
    segmentIds: string[]
  ): Promise<string> {
    const campaignId = `custom-${Date.now()}`;
    const campaign: EmailCampaign = {
      id: campaignId,
      name,
      type,
      trigger: 'manual',
      template,
      isActive: true,
      sentCount: 0,
      openRate: 0,
      clickRate: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.campaigns.set(campaignId, campaign);
    return campaignId;
  }

  // Send campaign to segment
  async sendCampaignToSegment(campaignId: string, segmentId: string): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    const segment = this.segments.get(segmentId);
    
    if (!campaign || !segment) {
      throw new Error('Campaign or segment not found');
    }

    // Get customers in segment (in production, query database)
    const customers = await this.getSegmentCustomers(segmentId);
    
    // Send emails
    for (const customer of customers) {
      await this.triggerCampaign(campaignId, customer);
    }
  }

  // Get segment customers
  private async getSegmentCustomers(segmentId: string): Promise<any[]> {
    // In production, query database based on segment conditions
    return [];
  }
}

export default EmailMarketingService;
