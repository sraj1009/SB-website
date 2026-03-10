import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { SimpleLogRecordProcessor, ConsoleLogRecordExporter } from '@opentelemetry/sdk-logs';
import { LoggerProvider } from '@opentelemetry/sdk-logs';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import config from '../config/config.js';

// Initialize OpenTelemetry
export function initializeTracing() {
  const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
    headers: {
      'x-honeycomb-team': process.env.HONEYCOMB_API_KEY,
    },
  });

  const metricExporter = new OTLPMetricExporter({
    url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
    headers: {
      'x-honeycomb-team': process.env.HONEYCOMB_API_KEY,
    },
  });

  const sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: 'singglebee-api',
      [ATTR_SERVICE_VERSION]: '1.0.0',
      [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.HOSTNAME || 'unknown',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.nodeEnv,
      [SemanticResourceAttributes.TELEMETRY_SDK_LANGUAGE]: 'nodejs',
      [SemanticResourceAttributes.TELEMETRY_SDK_VERSION]: '1.0.0',
    }),
    traceExporter,
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 15000, // 15 seconds
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable some instrumentations for performance
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
      }),
    ],
    // Add sampling configuration for production
    sampler: config.nodeEnv === 'production' 
      ? { type: 'traceidratio', ratio: 0.1 } // 10% sampling in production
      : { type: 'always_on' }, // 100% sampling in development
  });

  // Initialize logging
  const loggerProvider = new LoggerProvider();
  loggerProvider.addLogRecordProcessor(
    new SimpleLogRecordProcessor({
      exporter: new ConsoleLogRecordExporter(),
    })
  );

  // Initialize the SDK and start collecting telemetry
  sdk.start({
    onStart: (span) => {
      // Add custom attributes to all spans
      span.setAttributes({
        'app.version': '1.0.0',
        'app.environment': config.nodeEnv,
        'app.region': process.env.AWS_REGION || 'local',
      });
    },
  });

  console.log('🔍 OpenTelemetry initialized successfully');

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('🔍 OpenTelemetry shut down gracefully'))
      .catch((error) => console.error('🔍 Error shutting down OpenTelemetry', error))
      .finally(() => process.exit(0));
  });

  return sdk;
}

// Custom span creation utilities
export class TracingUtils {
  static createSpan(name, attributes = {}) {
    const tracer = trace.getTracer('singglebee-tracer');
    return tracer.startSpan(name, { attributes });
  }

  static async traceAsync(name, fn, attributes = {}) {
    const span = this.createSpan(name, attributes);
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  }

  static addCustomAttributes(span) {
    if (span && span.setAttributes) {
      span.setAttributes({
        'user.id': span.attributes?.userId || 'anonymous',
        'request.id': span.attributes?.requestId || 'unknown',
        'session.id': span.attributes?.sessionId || 'none',
        'correlation.id': span.attributes?.correlationId || 'auto-generated',
      });
    }
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  static measureFunction(name, fn) {
    return async (...args) => {
      const start = Date.now();
      const span = TracingUtils.createSpan(`function.${name}`);
      
      try {
        const result = await fn(...args);
        span.setAttributes({
          'function.name': name,
          'function.duration': Date.now() - start,
          'function.success': true,
        });
        return result;
      } catch (error) {
        span.setAttributes({
          'function.name': name,
          'function.duration': Date.now() - start,
          'function.success': false,
          'function.error': error.message,
        });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    };
  }

  static measureDatabaseQuery(query, collection) {
    return async (...args) => {
      const start = Date.now();
      const span = TracingUtils.createSpan('database.query', {
        'db.collection': collection,
        'db.operation': query,
      });
      
      try {
        const result = await query(...args);
        span.setAttributes({
          'db.duration': Date.now() - start,
          'db.success': true,
          'db.result_count': Array.isArray(result) ? result.length : 1,
        });
        return result;
      } catch (error) {
        span.setAttributes({
          'db.duration': Date.now() - start,
          'db.success': false,
          'db.error': error.message,
        });
        throw error;
      } finally {
        span.end();
      }
    };
  }
}

// Error tracking with enhanced context
export class ErrorTracker {
  static trackError(error, context = {}) {
    const span = TracingUtils.createSpan('error.occurred', {
      'error.type': error.constructor.name,
      'error.message': error.message,
      'error.stack': error.stack?.substring(0, 1000), // Limit stack trace length
      ...context,
    });
    
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.end();
  }

  static trackUserAction(action, userId, metadata = {}) {
    const span = TracingUtils.createSpan('user.action', {
      'user.action': action,
      'user.id': userId,
      ...metadata,
    });
    span.end();
  }
}

export { trace, context, SpanStatusCode };
