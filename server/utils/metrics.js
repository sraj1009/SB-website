import promClient from 'prom-client';

// Create a Registry which registers the metrics
const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
    app: 'singglebee-backend'
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Custom Metrics
export const ordersCreatedCounter = new promClient.Counter({
    name: 'orders_created_total',
    help: 'Total number of orders created',
    labelNames: ['status'],
    registers: [register]
});

export const paymentsCounter = new promClient.Counter({
    name: 'payments_processed_total',
    help: 'Total number of payments processed',
    labelNames: ['gateway', 'status'],
    registers: [register]
});

export const cacheHitsCounter = new promClient.Counter({
    name: 'cache_operations_total',
    help: 'Total number of cache operations',
    labelNames: ['type', 'result'], // type: get/set, result: hit/miss/success
    registers: [register]
});

export const rateLimitBlocksCounter = new promClient.Counter({
    name: 'rate_limit_blocks_total',
    help: 'Total number of requests blocked by rate limiters',
    labelNames: ['limiter_type'],
    registers: [register]
});

export { register };
