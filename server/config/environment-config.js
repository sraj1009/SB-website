const path = require('path');
const fs = require('fs');

/**
 * Environment Configuration Manager
 * Handles loading and validating environment-specific configurations
 */
class EnvironmentConfig {
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
    this.config = {};
    this.requiredEnvVars = this.getRequiredEnvVars();
    
    this.loadEnvironmentConfig();
    this.validateRequiredEnvVars();
    this.setupEnvironmentSpecifics();
  }

  getRequiredEnvVars() {
    const common = [
      'NODE_ENV',
      'APP_NAME',
      'APP_VERSION',
      'APP_PORT',
      'MONGODB_URI',
      'MONGODB_DB_NAME',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'ENCRYPTION_KEY'
    ];

    const production = [
      ...common,
      'STRIPE_SECRET_KEY',
      'STRIPE_PUBLISHABLE_KEY',
      'SENDGRID_API_KEY',
      'REDIS_HOST',
      'REDIS_PASSWORD',
      'SENTRY_DSN'
    ];

    const staging = [
      ...common,
      'STRIPE_SECRET_KEY',
      'STRIPE_PUBLISHABLE_KEY',
      'REDIS_HOST',
      'SENTRY_DSN'
    ];

    const development = [
      ...common,
      'MONGODB_URI'
    ];

    return {
      production,
      staging,
      development,
      common
    };
  }

  loadEnvironmentConfig() {
    try {
      // Load environment file based on NODE_ENV
      const envFile = path.join(process.cwd(), `.env.${this.env}`);
      
      if (fs.existsSync(envFile)) {
        console.log(`📄 Loading environment config from: .env.${this.env}`);
        
        // Read and parse environment file
        const envContent = fs.readFileSync(envFile, 'utf8');
        const envLines = envContent.split('\n');
        
        envLines.forEach(line => {
          // Skip comments and empty lines
          if (line.trim() && !line.trim().startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
              const value = valueParts.join('=').trim();
              // Remove quotes if present
              const cleanValue = value.replace(/^["']|["']$/g, '');
              process.env[key.trim()] = cleanValue;
            }
          }
        });
      } else {
        console.warn(`⚠️ Environment file not found: .env.${this.env}`);
      }

      // Load common environment variables
      const commonEnvFile = path.join(process.cwd(), '.env');
      if (fs.existsSync(commonEnvFile)) {
        console.log('📄 Loading common environment config from: .env');
        
        const envContent = fs.readFileSync(commonEnvFile, 'utf8');
        const envLines = envContent.split('\n');
        
        envLines.forEach(line => {
          if (line.trim() && !line.trim().startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
              const value = valueParts.join('=').trim();
              const cleanValue = value.replace(/^["']|["']$/g, '');
              // Don't override environment-specific values
              if (!process.env[key.trim()]) {
                process.env[key.trim()] = cleanValue;
              }
            }
          }
        });
      }

      // Build configuration object
      this.config = {
        environment: this.env,
        app: {
          name: process.env.APP_NAME || 'singglebee',
          version: process.env.APP_VERSION || '1.0.0',
          port: parseInt(process.env.APP_PORT) || 3000,
          host: process.env.HOST || 'localhost'
        },
        database: {
          mongodb: {
            uri: process.env.MONGODB_URI,
            dbName: process.env.MONGODB_DB_NAME,
            options: this.getMongoDBOptions()
          },
          redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD || '',
            db: parseInt(process.env.REDIS_DB) || 0
          }
        },
        security: {
          jwt: {
            secret: process.env.JWT_SECRET,
            refreshSecret: process.env.JWT_REFRESH_SECRET,
            issuer: process.env.JWT_ISSUER || 'singglebee',
            audience: process.env.JWT_AUDIENCE || 'singglebee-users',
            expiresIn: process.env.JWT_EXPIRES_IN || '15m',
            refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
          },
          encryption: {
            key: process.env.ENCRYPTION_KEY,
            algorithm: 'aes-256-gcm'
          },
          session: {
            secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
            name: process.env.SESSION_NAME || 'singglebee-session',
            maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000,
            secure: process.env.SESSION_SECURE === 'true',
            httpOnly: process.env.SESSION_HTTP_ONLY !== 'false',
            sameSite: process.env.SESSION_SAME_SITE || 'lax'
          }
        },
        payment: {
          stripe: {
            secretKey: process.env.STRIPE_SECRET_KEY,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
            webhookEndpoint: process.env.STRIPE_WEBHOOK_ENDPOINT
          },
          razorpay: {
            keyId: process.env.RAZORPAY_KEY_ID,
            keySecret: process.env.RAZORPAY_KEY_SECRET,
            webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
            webhookEndpoint: process.env.RAZORPAY_WEBHOOK_ENDPOINT
          },
          paypal: {
            clientId: process.env.PAYPAL_CLIENT_ID,
            clientSecret: process.env.PAYPAL_CLIENT_SECRET,
            webhookSecret: process.env.PAYPAL_WEBHOOK_SECRET,
            webhookEndpoint: process.env.PAYPAL_WEBHOOK_ENDPOINT
          }
        },
        email: {
          sendgrid: {
            apiKey: process.env.SENDGRID_API_KEY,
            fromEmail: process.env.FROM_EMAIL || 'noreply@singglebee.com',
            fromName: process.env.FROM_NAME || 'SINGGLEBEE'
          }
        },
        sms: {
          twilio: {
            accountSid: process.env.TWILIO_ACCOUNT_SID,
            authToken: process.env.TWILIO_AUTH_TOKEN,
            phoneNumber: process.env.TWILIO_PHONE_NUMBER
          }
        },
        storage: {
          aws: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION || 'ap-south-1',
            s3Bucket: process.env.AWS_S3_BUCKET,
            cloudFrontDomain: process.env.AWS_CLOUDFRONT_DOMAIN
          }
        },
        monitoring: {
          sentry: {
            dsn: process.env.SENTRY_DSN,
            environment: this.env
          },
          analytics: {
            trackingId: process.env.GA_TRACKING_ID
          }
        },
        logging: {
          level: process.env.LOG_LEVEL || 'info',
          format: process.env.LOG_FORMAT || 'json',
          filePath: process.env.LOG_FILE_PATH,
          maxSize: process.env.LOG_MAX_SIZE || '100m',
          maxFiles: parseInt(process.env.LOG_MAX_FILES) || 10
        },
        cors: {
          origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
          credentials: process.env.CORS_CREDENTIALS === 'true',
          methods: process.env.CORS_METHODS?.split(',') || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          headers: process.env.CORS_HEADERS?.split(',') || ['Content-Type', 'Authorization']
        },
        rateLimiting: {
          windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
          maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
          skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true'
        },
        cache: {
          ttl: parseInt(process.env.CACHE_TTL) || 3600,
          maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 1000,
          strategy: process.env.CACHE_STRATEGY || 'lru'
        },
        features: this.getFeatureFlags(),
        business: {
          currency: {
            default: process.env.DEFAULT_CURRENCY || 'INR',
            supported: process.env.SUPPORTED_CURRENCIES?.split(',') || ['INR']
          },
          tax: {
            rate: parseFloat(process.env.TAX_RATE) || 0.18
          },
          shipping: {
            cost: parseFloat(process.env.SHIPPING_COST) || 0
          }
        }
      };

    } catch (error) {
      console.error('❌ Error loading environment config:', error);
      throw error;
    }
  }

  getMongoDBOptions() {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: parseInt(process.env.DB_POOL_MAX) || 10,
      minPoolSize: parseInt(process.env.DB_POOL_MIN) || 5,
      maxIdleTimeMS: 30000,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          bufferMaxEntries: 0,
          bufferCommands: false
    };

    // Add SSL options for production
    if (this.env === 'production') {
      options.ssl = true;
      options.sslValidate = true;
    }

    return options;
  }

  getFeatureFlags() {
    return {
      paymentGateway: process.env.FEATURE_PAYMENT_GATEWAY === 'true',
      emailNotifications: process.env.FEATURE_EMAIL_NOTIFICATIONS === 'true',
      smsNotifications: process.env.FEATURE_SMS_NOTIFICATIONS === 'true',
      cdnEnabled: process.env.FEATURE_CDN_ENABLED === 'true',
      analyticsEnabled: process.env.FEATURE_ANALYTICS_ENABLED === 'true',
      monitoringEnabled: process.env.FEATURE_MONITORING_ENABLED === 'true',
      rateLimiting: process.env.FEATURE_RATE_LIMITING === 'true',
      caching: process.env.FEATURE_CACHING === 'true'
    };
  }

  validateRequiredEnvVars() {
    const required = this.requiredEnvVars[this.env] || this.requiredEnvVars.common;
    const missing = [];

    required.forEach(envVar => {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    });

    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:');
      missing.forEach(envVar => {
        console.error(`   - ${envVar}`);
      });
      
      if (this.env === 'production') {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
      } else {
        console.warn('⚠️ Some environment variables are missing. The application may not function correctly.');
      }
    }
  }

  setupEnvironmentSpecifics() {
    switch (this.env) {
      case 'production':
        this.setupProduction();
        break;
      case 'staging':
        this.setupStaging();
        break;
      case 'development':
        this.setupDevelopment();
        break;
      default:
        console.warn(`⚠️ Unknown environment: ${this.env}. Using development settings.`);
        this.setupDevelopment();
    }
  }

  setupProduction() {
    // Production-specific settings
    process.env.DEBUG = 'false';
    process.env.VERBOSE_LOGGING = 'false';
    
    // Ensure security settings are strict
    this.config.security.session.secure = true;
    this.config.security.session.sameSite = 'strict';
    
    // Enable all monitoring
    this.config.features.monitoringEnabled = true;
    this.config.features.analyticsEnabled = true;
    
    console.log('🚀 Production environment configured');
  }

  setupStaging() {
    // Staging-specific settings
    process.env.DEBUG = 'true';
    process.env.VERBOSE_LOGGING = 'true';
    
    // Slightly relaxed security for testing
    this.config.security.session.sameSite = 'lax';
    
    // Enable monitoring but with higher thresholds
    this.config.features.monitoringEnabled = true;
    
    console.log('🧪 Staging environment configured');
  }

  setupDevelopment() {
    // Development-specific settings
    process.env.DEBUG = 'true';
    process.env.VERBOSE_LOGGING = 'true';
    
    // Relaxed security for development
    this.config.security.session.secure = false;
    this.config.security.session.sameSite = 'lax';
    
    // Disable some features for development
    this.config.features.smsNotifications = false;
    this.config.features.cdnEnabled = false;
    
    console.log('💻 Development environment configured');
  }

  get(key) {
    return this.getNestedValue(this.config, key);
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  getAll() {
    return this.config;
  }

  isProduction() {
    return this.env === 'production';
  }

  isStaging() {
    return this.env === 'staging';
  }

  isDevelopment() {
    return this.env === 'development';
  }

  getDatabaseURL() {
    return this.config.database.mongodb.uri;
  }

  getRedisConfig() {
    return this.config.database.redis;
  }

  getJWTConfig() {
    return this.config.security.jwt;
  }

  getPaymentConfig(provider) {
    return this.config.payment[provider];
  }

  isEnabled(feature) {
    return this.config.features[feature] === true;
  }

  // Validation helper
  validateConfig() {
    const issues = [];

    // Validate database configuration
    if (!this.config.database.mongodb.uri) {
      issues.push('MongoDB URI is required');
    }

    // Validate JWT configuration
    if (!this.config.security.jwt.secret || this.config.security.jwt.secret.length < 32) {
      issues.push('JWT secret must be at least 32 characters long');
    }

    // Validate payment configuration for production
    if (this.isProduction()) {
      if (!this.config.payment.stripe.secretKey) {
        issues.push('Stripe secret key is required in production');
      }
      
      if (!this.config.monitoring.sentry.dsn) {
        issues.push('Sentry DSN is required in production');
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  // Environment-specific helper methods
  shouldUseSSL() {
    return this.isProduction() || this.isStaging();
  }

  shouldUseCDN() {
    return this.isEnabled('cdnEnabled') && !this.isDevelopment();
  }

  shouldMockPayments() {
    return process.env.MOCK_PAYMENTS === 'true' || this.isDevelopment();
  }

  shouldMockEmails() {
    return process.env.MOCK_EMAILS === 'true' || this.isDevelopment();
  }

  shouldMockSMS() {
    return process.env.MOCK_SMS === 'true' || this.isDevelopment();
  }

  getLogLevel() {
    if (this.isProduction()) {
      return 'error';
    } else if (this.isStaging()) {
      return 'warn';
    } else {
      return 'debug';
    }
  }

  // Configuration summary for logging
  getConfigSummary() {
    return {
      environment: this.env,
      app: this.config.app,
      database: {
        mongodb: {
          configured: !!this.config.database.mongodb.uri,
          dbName: this.config.database.mongodb.dbName
        },
        redis: {
          configured: !!this.config.database.redis.host,
          host: this.config.database.redis.host,
          port: this.config.database.redis.port
        }
      },
      features: this.config.features,
      security: {
        jwt: !!this.config.security.jwt.secret,
        session: this.config.security.session
      },
      payments: {
        stripe: !!this.config.payment.stripe.secretKey,
        razorpay: !!this.config.payment.razorpay.keyId,
        paypal: !!this.config.payment.paypal.clientId
      }
    };
  }
}

// Singleton instance
const environmentConfig = new EnvironmentConfig();

module.exports = {
  EnvironmentConfig,
  environmentConfig
};
