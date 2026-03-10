import Joi from 'joi';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').default('development'),
    PORT: Joi.number().default(5000),
    MONGODB_URI: Joi.string().required().description('MongoDB connection string'),
    JWT_ACCESS_SECRET: Joi.string().required().description('JWT access secret key'),
    JWT_REFRESH_SECRET: Joi.string().required().description('JWT refresh secret key'),
    JWT_ACCESS_EXPIRES_IN: Joi.string()
      .default('15m')
      .description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRES_IN: Joi.string()
      .default('7d')
      .description('days after which refresh tokens expire'),
    CASHFREE_APP_ID: Joi.string().allow('').description('Cashfree App ID'),
    CASHFREE_SECRET_KEY: Joi.string().allow('').description('Cashfree Secret Key'),
    CASHFREE_ENV: Joi.string().valid('sandbox', 'production').default('sandbox'),
    FRONTEND_URL: Joi.string().default('http://localhost:5173'),
    BACKEND_URL: Joi.string().allow('').optional().description('Backend URL for webhooks (e.g. https://api.singglebee.com)'),
    ADMIN_EMAIL: Joi.string().email().required(),
    ADMIN_PASSWORD: Joi.string().required(),
    GEMINI_API_KEY: Joi.string().required(),
    REDIS_URL: Joi.string().description('Redis connection string'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: 'key' } })
  .validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export default {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mongoose: {
    url: envVars.MONGODB_URI,
  },
  jwt: {
    accessSecret: envVars.JWT_ACCESS_SECRET,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    accessExpiration: envVars.JWT_ACCESS_EXPIRES_IN,
    refreshExpiration: envVars.JWT_REFRESH_EXPIRES_IN,
  },
  cashfree: {
    appId: envVars.CASHFREE_APP_ID,
    secretKey: envVars.CASHFREE_SECRET_KEY,
    env: envVars.CASHFREE_ENV,
    version: envVars.CASHFREE_API_VERSION || '2023-08-01',
  },
  frontendUrl: envVars.FRONTEND_URL,
  backendUrl: envVars.BACKEND_URL || `http://localhost:${envVars.PORT}`,
  admin: {
    email: envVars.ADMIN_EMAIL,
    password: envVars.ADMIN_PASSWORD,
  },
  gemini: {
    apiKey: envVars.GEMINI_API_KEY,
  },
  redis: {
    url: envVars.REDIS_URL,
  },
};
