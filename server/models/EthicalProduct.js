import mongoose from 'mongoose';

// Ethical sourcing and transparency schema additions
const originStorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  images: [{
    type: String, // URLs to origin story images
    required: false
  }],
  videos: [{
    type: String, // URLs to origin story videos
    required: false
  }],
  publishedAt: {
    type: Date,
    default: Date.now
  },
  verified: {
    type: Boolean,
    default: false
  },
  verificationDate: {
    type: Date
  }
}, { _id: false });

const farmerSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      required: true
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  story: {
    type: String,
    required: true
  },
  photo: {
    type: String,
    required: true
  },
  certified: {
    type: Boolean,
    default: false
  },
  certifications: [{
    type: String,
    enum: ['Fair Trade', 'Organic', 'Rainforest Alliance', 'B Corp', 'Local Sustainable']
  }],
  practices: [{
    type: String,
    enum: ['Organic Farming', 'Bee-Friendly Practices', 'Sustainable Harvesting', 'Fair Labor', 'Water Conservation']
  }],
  joinDate: {
    type: Date,
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 4
  },
  totalSupply: {
    type: Number,
    required: true
  },
  currentSupply: {
    type: Number,
    required: true
  }
}, { _id: false });

const certificationSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  organization: {
    type: String,
    required: true
  },
  issuedDate: {
    type: Date,
    required: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  certificateUrl: {
    type: String,
    required: true
  },
  verificationCode: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'suspended'],
    default: 'active'
  }
}, { _id: false });

const supplyChainStepSchema = new mongoose.Schema({
  step: {
    type: String,
    enum: ['sourcing', 'processing', 'manufacturing', 'packaging', 'quality_check', 'shipping', 'delivery'],
    required: true
  },
  location: {
    type: String,
    required: true
  },
  coordinates: {
    lat: Number,
    lng: Number
  },
  date: {
    type: Date,
    required: true
  },
  handler: {
    name: String,
    type: String,
    required: true
  },
  certification: String,
  carbonFootprint: Number, // kg CO2e
  verified: {
    type: Boolean,
    default: false
  },
  documents: [{
    type: String, // URLs to verification documents
    description: String
  }]
}, { _id: false });

// Enhanced Product schema with ethical sourcing
const ethicalProductSchema = new mongoose.Schema({
  // Reference to main product
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    unique: true
  },
  
  // Ethical Sourcing Fields
  originStory: originStorySchema,
  farmers: [farmerSchema],
  certifications: [certificationSchema],
  supplyChain: [supplyChainStepSchema],
  ethicalSourcing: {
    isFairTrade: {
      type: Boolean,
      default: false
    },
    isOrganic: {
      type: Boolean,
      default: false
    },
    isSustainable: {
      type: Boolean,
      default: false
    },
    isLocal: {
      type: Boolean,
      default: false
    },
    carbonNeutral: {
      type: Boolean,
      default: false
    },
    plasticFree: {
      type: Boolean,
      default: false
    }
  },
  traceability: {
    qrCode: {
      type: String,
      unique: true
    },
    batchNumber: {
      type: String,
      required: true
    },
    productionDate: {
      type: Date,
      required: true
    },
    expiryDate: {
      type: Date
    },
    trackingAvailable: {
      type: Boolean,
      default: true
    }
  },
  sustainability: {
    carbonFootprint: {
      type: Number,
      required: true
    },
    waterFootprint: {
      type: Number
    },
    recyclability: {
      type: String,
      enum: ['fully_recyclable', 'partially_recyclable', 'not_recyclable']
    },
    packagingType: {
      type: String,
      enum: ['plastic_free', 'biodegradable', 'compostable', 'recycled']
    }
  },
  socialImpact: {
    supportsLocalCommunity: {
      type: Boolean,
      default: false
    },
    empowersWomen: {
      type: Boolean,
      default: false
    },
    preservesTradition: {
      type: Boolean,
      default: false
    },
    educationSupport: {
      type: Boolean,
      default: false
    },
    fairLaborPractices: {
      type: Boolean,
      default: false
    }
  },
  verification: {
    thirdPartyVerified: {
      type: Boolean,
      default: false
    },
    verificationDate: {
      type: Date
    },
    verificationAgency: {
      type: String
    },
    blockchainVerified: {
      type: Boolean,
      default: false
    },
    blockchainHash: {
      type: String
    }
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
ethicalProductSchema.index({ productId: 1 });
ethicalProductSchema.index({ 'ethicalSourcing.isFairTrade': 1 });
ethicalProductSchema.index({ 'ethicalSourcing.isOrganic': 1 });
ethicalProductSchema.index({ 'ethicalSourcing.isLocal': 1 });
ethicalProductSchema.index({ 'traceability.qrCode': 1 });
ethicalProductSchema.index({ 'certifications.status': 1 });
ethicalProductSchema.index({ 'supplyChain.step': 1 });

// Virtual fields
ethicalProductSchema.virtual('ethicalScore').get(function() {
  let score = 0;
  if (this.ethicalSourcing.isFairTrade) score += 20;
  if (this.ethicalSourcing.isOrganic) score += 20;
  if (this.ethicalSourcing.isSustainable) score += 15;
  if (this.ethicalSourcing.isLocal) score += 15;
  if (this.ethicalSourcing.isPlasticFree) score += 15;
  if (this.certifications.length > 0) score += 15;
  return Math.min(score, 100);
});

ethicalProductSchema.virtual('traceabilityScore').get(function() {
  let score = 0;
  if (this.traceability.qrCode) score += 25;
  if (this.supplyChain.length > 0) score += 25;
  if (this.farmers.length > 0) score += 25;
  if (this.originStory && this.originStory.verified) score += 25;
  return Math.min(score, 100);
});

ethicalProductSchema.virtual('sustainabilityScore').get(function() {
  let score = 0;
  if (this.sustainability.carbonFootprint < 2) score += 25;
  if (this.sustainability.packagingType === 'plastic_free') score += 25;
  if (this.sustainability.recyclability === 'fully_recyclable') score += 25;
  if (this.ethicalSourcing.carbonNeutral) score += 25;
  return Math.min(score, 100);
});

// Methods
ethicalProductSchema.methods.generateQRCode = function() {
  if (!this.traceability.qrCode) {
    this.traceability.qrCode = `SB-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }
  return this.traceability.qrCode;
};

ethicalProductSchema.methods.addSupplyChainStep = function(stepData) {
  this.supplyChain.push({
    ...stepData,
    date: new Date(),
    verified: false
  });
  return this.save();
};

ethicalProductSchema.methods.verifySupplyChainStep = function(stepIndex, verificationData) {
  if (this.supplyChain[stepIndex]) {
    this.supplyChain[stepIndex].verified = true;
    this.supplyChain[stepIndex].documents.push(verificationData);
    return this.save();
  }
  throw new Error('Supply chain step not found');
};

ethicalProductSchema.methods.updateEthicalRating = function() {
  const ethicalScore = this.ethicalScore;
  const traceabilityScore = this.traceabilityScore;
  const sustainabilityScore = this.sustainabilityScore;
  
  const overallScore = (ethicalScore + traceabilityScore + sustainabilityScore) / 3;
  
  return this.save();
};

ethicalProductSchema.methods.getTraceabilityData = function() {
  return {
    product: {
      qrCode: this.traceability.qrCode,
      batchNumber: this.traceability.batchNumber,
      productionDate: this.traceability.productionDate,
      expiryDate: this.traceability.expiryDate
    },
    origin: {
      story: this.originStory,
      farmers: this.farmers,
      location: this.farmers[0]?.location
    },
    supplyChain: this.supplyChain,
    certifications: this.certifications,
    sustainability: {
      carbonFootprint: this.sustainability.carbonFootprint,
      packagingType: this.sustainability.packagingType,
      recyclability: this.sustainability.recyclability
    },
    socialImpact: this.socialImpact,
    scores: {
      ethical: this.ethicalScore,
      traceability: this.traceabilityScore,
      sustainability: this.sustainabilityScore,
      overall: (this.ethicalScore + this.traceabilityScore + this.sustainabilityScore) / 3
    }
  };
};

// Static methods
ethicalProductSchema.statics.findByEthicalCriteria = function(criteria) {
  const query = {};
  
  if (criteria.fairTrade) {
    query['ethicalSourcing.isFairTrade'] = true;
  }
  
  if (criteria.organic) {
    query['ethicalSourcing.isOrganic'] = true;
  }
  
  if (criteria.local) {
    query['ethicalSourcing.isLocal'] = true;
  }
  
  if (criteria.plasticFree) {
    query['ethicalSourcing.isPlasticFree'] = true;
  }
  
  if (criteria.carbonNeutral) {
    query['ethicalSourcing.carbonNeutral'] = true;
  }
  
  return this.find(query).populate('productId').sort({ createdAt: -1 });
};

ethicalProductSchema.statics.getEthicalSourcingStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        fairTradeProducts: {
          $sum: { $cond: [{ $eq: ['$ethicalSourcing.isFairTrade', true] }, 1, 0] }
        },
        organicProducts: {
          $sum: { $cond: [{ $eq: ['$ethicalSourcing.isOrganic', true] }, 1, 0] }
        },
        localProducts: {
          $sum: { $cond: [{ $eq: ['$ethicalSourcing.isLocal', true] }, 1, 0] }
        },
        plasticFreeProducts: {
          $sum: { $cond: [{ $eq: ['$ethicalSourcing.isPlasticFree', true] }, 1, 0] }
        },
        avgCarbonFootprint: { $avg: '$sustainability.carbonFootprint' },
        avgEthicalScore: { $avg: { $add: [
          { $cond: [{ $eq: ['$ethicalSourcing.isFairTrade', true] }, 20, 0] },
          { $cond: [{ $eq: ['$ethicalSourcing.isOrganic', true] }, 20, 0] },
          { $cond: [{ $eq: ['$ethicalSourcing.isSustainable', true] }, 15, 0] },
          { $cond: [{ $eq: ['$ethicalSourcing.isLocal', true] }, 15, 0] },
          { $cond: [{ $eq: ['$ethicalSourcing.isPlasticFree', true] }, 15, 0] }
        ]}}
      }
    }
  ]);
  
  return stats[0] || {
    totalProducts: 0,
    fairTradeProducts: 0,
    organicProducts: 0,
    localProducts: 0,
    plasticFreeProducts: 0,
    avgCarbonFootprint: 0,
    avgEthicalScore: 0
  };
};

// Pre-save middleware
ethicalProductSchema.pre('save', function(next) {
  if (this.isModified('ethicalSourcing') || this.isModified('certifications')) {
    this.updateEthicalRating();
  }
  
  if (!this.traceability.qrCode) {
    this.generateQRCode();
  }
  
  next();
});

const EthicalProduct = mongoose.model('EthicalProduct', ethicalProductSchema);

export default EthicalProduct;
