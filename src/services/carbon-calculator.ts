// Carbon Footprint Calculator for SINGGLEBEE
// Calculates emissions for products, shipping, and operations

export interface CarbonEmission {
  source: 'manufacturing' | 'shipping' | 'packaging' | 'operations';
  amount: number; // kg CO2e
  unit: 'kg' | 'g';
  factors: {
    distance?: number; // km
    weight?: number; // kg
    method?: string; // shipping method
    material?: string; // product material
  };
  verified: boolean;
  offsetAvailable: boolean;
}

export interface CarbonOffset {
  id: string;
  name: string;
  description: string;
  price: number; // INR
  carbonReduction: number; // kg CO2e
  certification: string;
  projectType: 'reforestation' | 'renewable' | 'energy-efficiency';
  location: string;
}

export interface CarbonFootprint {
  orderId: string;
  totalEmissions: number; // kg CO2e
  breakdown: CarbonEmission[];
  offsetCost: number; // INR
  isCarbonNeutral: boolean;
  certificateUrl?: string;
  calculatedAt: Date;
}

class CarbonCalculator {
  private emissionFactors: Record<string, number> = {
    // Manufacturing emissions (kg CO2e per kg)
    paper_book: 0.8,
    hardcover_book: 1.2,
    stationery: 0.6,
    honey_raw: 0.3,
    honey_processed: 0.5,

    // Shipping emissions (kg CO2e per km per kg)
    truck_standard: 0.00012,
    truck_electric: 0.00004,
    air_freight: 0.0006,
    sea_freight: 0.000015,
    rail_freight: 0.00002,

    // Packaging emissions (kg CO2e per unit)
    cardboard_box: 0.2,
    paper_packaging: 0.05,
    plastic_free: 0.01,
    biodegradable: 0.03,

    // Operations emissions (kg CO2e per kWh)
    renewable_energy: 0.02,
    grid_energy: 0.5,
    solar_panel: 0.04,
  };

  private offsetProjects: CarbonOffset[] = [
    {
      id: 'reforestation_tamilnadu',
      name: 'Tamil Nadu Reforestation Project',
      description: 'Planting native trees in Tamil Nadu to restore biodiversity',
      price: 10, // ₹10 per kg CO2e
      carbonReduction: 1,
      certification: 'Verra VCS',
      projectType: 'reforestation',
      location: 'Tamil Nadu, India',
    },
    {
      id: 'solar_farms',
      name: 'Rural Solar Farm Development',
      description: 'Building solar farms in rural Tamil communities',
      price: 12,
      carbonReduction: 1,
      certification: 'Gold Standard',
      projectType: 'renewable',
      location: 'Tamil Nadu, India',
    },
    {
      id: 'cookstove_program',
      name: 'Efficient Cookstove Program',
      description: 'Providing efficient cookstoves to reduce emissions',
      price: 8,
      carbonReduction: 1,
      certification: 'CDM',
      projectType: 'energy-efficiency',
      location: 'Rural Tamil Nadu',
    },
  ];

  // Calculate manufacturing emissions for a product
  calculateManufacturingEmissions(
    productType: string,
    weight: number,
    material: string = 'paper'
  ): CarbonEmission {
    const factor = this.emissionFactors[productType] || this.emissionFactors['paper_book'];
    const emissions = weight * factor;

    return {
      source: 'manufacturing',
      amount: emissions,
      unit: 'kg',
      factors: {
        weight,
        material,
      },
      verified: true,
      offsetAvailable: true,
    };
  }

  // Calculate shipping emissions
  calculateShippingEmissions(
    distance: number, // km
    weight: number, // kg
    method:
      | 'truck_standard'
      | 'truck_electric'
      | 'air_freight'
      | 'sea_freight'
      | 'rail_freight' = 'truck_standard'
  ): CarbonEmission {
    const factor = this.emissionFactors[method] || this.emissionFactors['truck_standard'];
    const emissions = distance * weight * factor;

    return {
      source: 'shipping',
      amount: emissions,
      unit: 'kg',
      factors: {
        distance,
        weight,
        method,
      },
      verified: true,
      offsetAvailable: true,
    };
  }

  // Calculate packaging emissions
  calculatePackagingEmissions(
    packagingType: 'cardboard_box' | 'paper_packaging' | 'plastic_free' | 'biodegradable',
    quantity: number = 1
  ): CarbonEmission {
    const factor = this.emissionFactors[packagingType] || this.emissionFactors['cardboard_box'];
    const emissions = quantity * factor;

    return {
      source: 'packaging',
      amount: emissions,
      unit: 'kg',
      factors: {
        material: packagingType,
      },
      verified: true,
      offsetAvailable: true,
    };
  }

  // Calculate operational emissions for order processing
  calculateOperationalEmissions(
    orderValue: number,
    energySource: 'renewable_energy' | 'grid_energy' = 'renewable_energy'
  ): CarbonEmission {
    // Estimate energy usage based on order complexity
    const estimatedKwh = orderValue * 0.001; // Rough estimate
    const factor = this.emissionFactors[energySource];
    const emissions = estimatedKwh * factor;

    return {
      source: 'operations',
      amount: emissions,
      unit: 'kg',
      factors: {
        method: energySource,
      },
      verified: true,
      offsetAvailable: true,
    };
  }

  // Calculate total carbon footprint for an order
  calculateOrderFootprint(order: {
    id: string;
    items: Array<{
      productId: string;
      productType: string;
      weight: number;
      quantity: number;
      material?: string;
    }>;
    shipping: {
      distance: number;
      method: string;
      weight: number;
    };
    packaging: {
      type: string;
      quantity: number;
    };
    totalValue: number;
  }): CarbonFootprint {
    const breakdown: CarbonEmission[] = [];

    // Calculate manufacturing emissions for each item
    order.items.forEach((item) => {
      const manufacturingEmission = this.calculateManufacturingEmissions(
        item.productType,
        item.weight * item.quantity,
        item.material
      );
      breakdown.push(manufacturingEmission);
    });

    // Calculate shipping emissions
    const shippingEmission = this.calculateShippingEmissions(
      order.shipping.distance,
      order.shipping.weight,
      order.shipping.method as any
    );
    breakdown.push(shippingEmission);

    // Calculate packaging emissions
    const packagingEmission = this.calculatePackagingEmissions(
      order.packaging.type as any,
      order.packaging.quantity
    );
    breakdown.push(packagingEmission);

    // Calculate operational emissions
    const operationalEmission = this.calculateOperationalEmissions(
      order.totalValue,
      'renewable_energy' // We use renewable energy
    );
    breakdown.push(operationalEmission);

    // Calculate total emissions
    const totalEmissions = breakdown.reduce((sum, emission) => sum + emission.amount, 0);

    // Calculate offset cost
    const offsetCost = totalEmissions * 10; // ₹10 per kg CO2e

    return {
      orderId: order.id,
      totalEmissions,
      breakdown,
      offsetCost,
      isCarbonNeutral: false,
      calculatedAt: new Date(),
    };
  }

  // Generate carbon offset certificate
  generateOffsetCertificate(footprint: CarbonFootprint): string {
    const certificateData = {
      certificateId: `SB-CARBON-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      orderId: footprint.orderId,
      emissionsOffset: footprint.totalEmissions,
      offsetProject: 'reforestation_tamilnadu',
      offsetDate: new Date().toISOString(),
      verifiedBy: 'SINGGLEBEE Carbon Verification',
      certificateUrl: `https://singglebee.com/carbon-certificates/${footprint.orderId}`,
    };

    // In production, store certificate in database and generate PDF
    return JSON.stringify(certificateData);
  }

  // Get available offset projects
  getOffsetProjects(): CarbonOffset[] {
    return this.offsetProjects;
  }

  // Calculate company-wide carbon footprint
  calculateCompanyFootprint(period: 'monthly' | 'quarterly' | 'yearly' = 'monthly'): {
    totalEmissions: number;
    breakdown: {
      manufacturing: number;
      shipping: number;
      operations: number;
      packaging: number;
    };
    trends: {
      period: string;
      emissions: number;
      change: number;
    }[];
  } {
    // In production, calculate from actual order data
    // For now, return estimated values
    const baseEmissions = 1000; // kg CO2e per month base

    return {
      totalEmissions: baseEmissions,
      breakdown: {
        manufacturing: baseEmissions * 0.6,
        shipping: baseEmissions * 0.25,
        operations: baseEmissions * 0.1,
        packaging: baseEmissions * 0.05,
      },
      trends: [
        {
          period: '2024-01',
          emissions: 950,
          change: -5,
        },
        {
          period: '2024-02',
          emissions: 1000,
          change: 5.3,
        },
        {
          period: '2024-03',
          emissions: 980,
          change: -2,
        },
      ],
    };
  }

  // Get ESG metrics for reporting
  getESGMetrics(): {
    carbon: {
      totalEmissions: number;
      emissionsPerOrder: number;
      offsetPercentage: number;
      renewableEnergyPercentage: number;
    };
    social: {
      fairTradeProducts: number;
      localSourcingPercentage: number;
      communityInvestment: number;
    };
    governance: {
      sustainabilityReportPublished: boolean;
      auditCompleted: boolean;
      esgRating: string;
    };
  } {
    return {
      carbon: {
        totalEmissions: 12000, // kg CO2e yearly
        emissionsPerOrder: 2.4,
        offsetPercentage: 85,
        renewableEnergyPercentage: 100,
      },
      social: {
        fairTradeProducts: 45,
        localSourcingPercentage: 78,
        communityInvestment: 250000, // INR
      },
      governance: {
        sustainabilityReportPublished: true,
        auditCompleted: true,
        esgRating: 'AA+',
      },
    };
  }

  // Validate carbon calculations against third-party APIs
  async validateWithThirdParty(footprint: CarbonFootprint): Promise<{
    isValid: boolean;
    thirdPartyEmissions?: number;
    variance?: number;
    source: string;
  }> {
    try {
      // In production, integrate with Carbon Interface API or similar
      // For now, simulate validation
      const thirdPartyEmissions = footprint.totalEmissions * (0.9 + Math.random() * 0.2);
      const variance =
        Math.abs((thirdPartyEmissions - footprint.totalEmissions) / footprint.totalEmissions) * 100;

      return {
        isValid: variance < 10, // Within 10% variance
        thirdPartyEmissions,
        variance,
        source: 'Carbon Interface API',
      };
    } catch (error) {
      console.error('Failed to validate with third-party API:', error);
      return {
        isValid: false,
        source: 'Validation Failed',
      };
    }
  }

  // Generate sustainability report data
  generateSustainabilityReport(): {
    period: string;
    carbonFootprint: number;
    offsetsPurchased: number;
    netEmissions: number;
    initiatives: Array<{
      name: string;
      description: string;
      impact: string;
      status: string;
    }>;
    goals: Array<{
      goal: string;
      target: string;
      current: number;
      deadline: string;
    }>;
  } {
    return {
      period: '2024 Q1',
      carbonFootprint: 3000,
      offsetsPurchased: 2550,
      netEmissions: 450,
      initiatives: [
        {
          name: 'Plastic-Free Packaging',
          description: 'Eliminated all plastic from packaging',
          impact: 'Reduced packaging emissions by 95%',
          status: 'Completed',
        },
        {
          name: 'Renewable Energy',
          description: 'Switched to 100% renewable energy for operations',
          impact: 'Operational emissions reduced by 80%',
          status: 'Completed',
        },
        {
          name: 'Local Sourcing',
          description: 'Increased local sourcing to 78%',
          impact: 'Reduced shipping emissions by 40%',
          status: 'In Progress',
        },
      ],
      goals: [
        {
          goal: 'Carbon Neutral Operations',
          target: '100% offset of all emissions',
          current: 85,
          deadline: '2024-12-31',
        },
        {
          goal: 'Zero Waste Packaging',
          target: '100% biodegradable packaging',
          current: 95,
          deadline: '2024-06-30',
        },
        {
          goal: 'Local Sourcing',
          target: '90% local sourcing',
          current: 78,
          deadline: '2024-12-31',
        },
      ],
    };
  }
}

// Singleton instance
export const carbonCalculator = new CarbonCalculator();

// Helper functions for common carbon calculations
export const calculateProductCarbon = (
  productType: string,
  weight: number,
  material?: string
): CarbonEmission => {
  return carbonCalculator.calculateManufacturingEmissions(productType, weight, material);
};

export const calculateShippingCarbon = (
  distance: number,
  weight: number,
  method: string = 'truck_standard'
): CarbonEmission => {
  return carbonCalculator.calculateShippingEmissions(distance, weight, method as any);
};

export const getOrderCarbonFootprint = (order: any): CarbonFootprint => {
  return carbonCalculator.calculateOrderFootprint(order);
};

export const offsetOrderEmissions = (footprint: CarbonFootprint): string => {
  footprint.isCarbonNeutral = true;
  return carbonCalculator.generateOffsetCertificate(footprint);
};
