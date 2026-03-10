const crypto = require('crypto');
const EventEmitter = require('events');

/**
 * Comprehensive Payment Failure Handling System
 */
class PaymentFailureHandler extends EventEmitter {
  constructor() {
    super();
    this.failureStats = new Map();
    this.retryAttempts = new Map();
    this.compensationQueue = [];
    this.alertThresholds = {
      consecutiveFailures: 3,
      failureRate: 10, // 10%
      totalFailures: 50
    };
    
    this.setupEventHandlers();
    this.startCompensationProcessor();
  }

  setupEventHandlers() {
    this.on('payment.failed', this.handlePaymentFailure.bind(this));
    this.on('payment.retried', this.handlePaymentRetry.bind(this));
    this.on('payment.compensated', this.handleCompensation.bind(this));
    this.on('threshold.exceeded', this.handleThresholdExceeded.bind(this));
  }

  // Handle payment failure
  async handlePaymentFailure(failureData) {
    try {
      const {
        orderId,
        paymentId,
        userId,
        amount,
        paymentMethod,
        errorCode,
        errorMessage,
        provider,
        timestamp = new Date()
      } = failureData;

      console.error('Payment failure detected:', {
        orderId,
        paymentId,
        userId,
        amount,
        paymentMethod,
        errorCode,
        errorMessage,
        provider,
        timestamp
      });

      // Record failure statistics
      this.recordFailureStats(provider, errorCode, paymentMethod);

      // Check if retry is needed
      const retryDecision = this.shouldRetry(failureData);
      
      if (retryDecision.shouldRetry) {
        await this.scheduleRetry(failureData, retryDecision);
      } else {
        await this.handleFinalFailure(failureData);
      }

      // Check alert thresholds
      this.checkAlertThresholds(provider);

    } catch (error) {
      console.error('Error handling payment failure:', error);
      this.emit('error', error);
    }
  }

  // Record failure statistics
  recordFailureStats(provider, errorCode, paymentMethod) {
    const key = `${provider}:${errorCode}`;
    const stats = this.failureStats.get(key) || {
      count: 0,
      firstOccurrence: new Date(),
      lastOccurrence: new Date(),
      paymentMethods: new Map(),
      hourlyStats: new Map()
    };

    stats.count++;
    stats.lastOccurrence = new Date();

    // Track payment method failures
    const methodCount = stats.paymentMethods.get(paymentMethod) || 0;
    stats.paymentMethods.set(paymentMethod, methodCount + 1);

    // Track hourly statistics
    const hour = new Date().getHours();
    const hourlyCount = stats.hourlyStats.get(hour) || 0;
    stats.hourlyStats.set(hour, hourlyCount + 1);

    this.failureStats.set(key, stats);
  }

  // Determine if payment should be retried
  shouldRetry(failureData) {
    const { errorCode, paymentMethod, provider, amount } = failureData;
    const retryKey = `${failureData.orderId}:${failureData.paymentId}`;
    
    // Get current retry attempts
    const attempts = this.retryAttempts.get(retryKey) || 0;

    // Define retry rules based on error codes
    const retryRules = {
      // Temporary errors - should retry
      'temporary_decline': {
        maxRetries: 3,
        delay: 5000, // 5 seconds
        backoffMultiplier: 2
      },
      'insufficient_funds': {
        maxRetries: 2,
        delay: 30000, // 30 seconds
        backoffMultiplier: 1.5
      },
      'network_error': {
        maxRetries: 5,
        delay: 1000, // 1 second
        backoffMultiplier: 2
      },
      'timeout': {
        maxRetries: 3,
        delay: 2000, // 2 seconds
        backoffMultiplier: 2
      },
      'rate_limit': {
        maxRetries: 3,
        delay: 60000, // 1 minute
        backoffMultiplier: 1.5
      },
      
      // Permanent errors - should not retry
      'invalid_card': {
        maxRetries: 0,
        delay: 0,
        backoffMultiplier: 1
      },
      'expired_card': {
        maxRetries: 0,
        delay: 0,
        backoffMultiplier: 1
      },
      'fraud_detected': {
        maxRetries: 0,
        delay: 0,
        backoffMultiplier: 1
      },
      'invalid_cvv': {
        maxRetries: 0,
        delay: 0,
        backoffMultiplier: 1
      },
      'card_not_supported': {
        maxRetries: 0,
        delay: 0,
        backoffMultiplier: 1
      }
    };

    const rule = retryRules[errorCode] || {
      maxRetries: 2,
      delay: 10000,
      backoffMultiplier: 2
    };

    // Check if max retries exceeded
    if (attempts >= rule.maxRetries) {
      return {
        shouldRetry: false,
        reason: 'Maximum retry attempts exceeded'
      };
    }

    // Calculate delay with exponential backoff
    const delay = rule.delay * Math.pow(rule.backoffMultiplier, attempts);

    return {
      shouldRetry: true,
      delay,
      nextAttempt: new Date(Date.now() + delay),
      attemptNumber: attempts + 1,
      maxRetries: rule.maxRetries
    };
  }

  // Schedule payment retry
  async scheduleRetry(failureData, retryDecision) {
    const retryKey = `${failureData.orderId}:${failureData.paymentId}`;
    
    // Increment retry attempts
    this.retryAttempts.set(retryKey, retryDecision.attemptNumber);

    // Schedule retry
    setTimeout(async () => {
      try {
        console.log('Retrying payment:', {
          orderId: failureData.orderId,
          paymentId: failureData.paymentId,
          attempt: retryDecision.attemptNumber,
          maxRetries: retryDecision.maxRetries
        });

        // Emit retry event
        this.emit('payment.retried', {
          ...failureData,
          retryAttempt: retryDecision.attemptNumber,
          retryScheduledAt: new Date()
        });

        // Here you would call the actual payment retry logic
        // await this.retryPayment(failureData);

      } catch (error) {
        console.error('Error during payment retry:', error);
        this.emit('error', error);
      }
    }, retryDecision.delay);
  }

  // Handle final failure (no more retries)
  async handleFinalFailure(failureData) {
    try {
      console.error('Payment failed permanently:', {
        orderId: failureData.orderId,
        paymentId: failureData.paymentId,
        userId: failureData.userId,
        errorCode: failureData.errorCode,
        errorMessage: failureData.errorMessage
      });

      // Update order status
      await this.updateOrderStatus(failureData.orderId, 'payment_failed');

      // Notify user
      await this.notifyUser(failureData);

      // Add to compensation queue if needed
      if (this.needsCompensation(failureData)) {
        this.addToCompensationQueue(failureData);
      }

      // Clean up retry attempts
      const retryKey = `${failureData.orderId}:${failureData.paymentId}`;
      this.retryAttempts.delete(retryKey);

      // Log for audit
      await this.logFailure(failureData);

    } catch (error) {
      console.error('Error handling final payment failure:', error);
      this.emit('error', error);
    }
  }

  // Handle payment retry
  async handlePaymentRetry(retryData) {
    try {
      // Here you would implement the actual retry logic
      // For now, we'll just simulate it
      
      console.log('Processing payment retry:', retryData);

      // Simulate retry result
      const retrySuccess = Math.random() > 0.3; // 70% success rate

      if (retrySuccess) {
        console.log('Payment retry successful:', retryData);
        await this.handleRetrySuccess(retryData);
      } else {
        console.log('Payment retry failed:', retryData);
        await this.handlePaymentFailure({
          ...retryData,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('Error processing payment retry:', error);
      this.emit('error', error);
    }
  }

  // Handle successful retry
  async handleRetrySuccess(retryData) {
    try {
      // Update order status
      await this.updateOrderStatus(retryData.orderId, 'paid');

      // Notify user
      await this.notifyUser({
        ...retryData,
        status: 'success',
        message: 'Payment successful after retry'
      });

      // Clean up retry attempts
      const retryKey = `${retryData.orderId}:${retryData.paymentId}`;
      this.retryAttempts.delete(retryKey);

      // Log success
      console.log('Payment retry successful:', {
        orderId: retryData.orderId,
        paymentId: retryData.paymentId,
        userId: retryData.userId,
        retryAttempt: retryData.retryAttempt
      });

    } catch (error) {
      console.error('Error handling retry success:', error);
      this.emit('error', error);
    }
  }

  // Check if compensation is needed
  needsCompensation(failureData) {
    // Compensation needed for certain failure types
    const compensatableErrors = [
      'temporary_decline',
      'network_error',
      'timeout',
      'rate_limit',
      'provider_error'
    ];

    return compensatableErrors.includes(failureData.errorCode);
  }

  // Add to compensation queue
  addToCompensationQueue(failureData) {
    const compensationItem = {
      id: crypto.randomUUID(),
      orderId: failureData.orderId,
      paymentId: failureData.paymentId,
      userId: failureData.userId,
      amount: failureData.amount,
      paymentMethod: failureData.paymentMethod,
      errorCode: failureData.errorCode,
      errorMessage: failureData.errorMessage,
      provider: failureData.provider,
      addedAt: new Date(),
      status: 'pending',
      attempts: 0
    };

    this.compensationQueue.push(compensationItem);
    
    console.log('Added to compensation queue:', compensationItem);
  }

  // Process compensation queue
  async processCompensationQueue() {
    try {
      const pendingItems = this.compensationQueue.filter(
        item => item.status === 'pending'
      );

      for (const item of pendingItems) {
        if (item.attempts >= 3) {
          item.status = 'failed';
          continue;
        }

        try {
          // Process compensation
          await this.processCompensation(item);
          item.status = 'completed';
          this.emit('payment.compensated', item);
        } catch (error) {
          console.error('Compensation failed:', error);
          item.attempts++;
          item.status = 'retry';
        }
      }

      // Clean up completed items
      this.compensationQueue = this.compensationQueue.filter(
        item => item.status !== 'completed'
      );

    } catch (error) {
      console.error('Error processing compensation queue:', error);
      this.emit('error', error);
    }
  }

  // Process individual compensation
  async processCompensation(item) {
    // Here you would implement the actual compensation logic
    // For example:
    // - Refund the payment
    // - Issue store credit
    // - Retry with different payment method
    // - Manual review

    console.log('Processing compensation:', item);

    // Simulate compensation processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update order status
    await this.updateOrderStatus(item.orderId, 'compensated');
  }

  // Handle compensation
  async handleCompensation(compensationData) {
    try {
      console.log('Compensation completed:', compensationData);

      // Notify user
      await this.notifyUser({
        ...compensationData,
        status: 'compensated',
        message: 'Payment has been compensated'
      });

    } catch (error) {
      console.error('Error handling compensation:', error);
      this.emit('error', error);
    }
  }

  // Check alert thresholds
  checkAlertThresholds(provider) {
    const providerStats = this.getProviderStats(provider);
    
    // Check consecutive failures
    if (providerStats.consecutiveFailures >= this.alertThresholds.consecutiveFailures) {
      this.emit('threshold.exceeded', {
        type: 'consecutive_failures',
        provider,
        value: providerStats.consecutiveFailures,
        threshold: this.alertThresholds.consecutiveFailures
      });
    }

    // Check failure rate
    if (providerStats.failureRate >= this.alertThresholds.failureRate) {
      this.emit('threshold.exceeded', {
        type: 'failure_rate',
        provider,
        value: providerStats.failureRate,
        threshold: this.alertThresholds.failureRate
      });
    }

    // Check total failures
    if (providerStats.totalFailures >= this.alertThresholds.totalFailures) {
      this.emit('threshold.exceeded', {
        type: 'total_failures',
        provider,
        value: providerStats.totalFailures,
        threshold: this.alertThresholds.totalFailures
      });
    }
  }

  // Handle threshold exceeded
  async handleThresholdExceeded(alertData) {
    try {
      console.error('Payment failure threshold exceeded:', alertData);

      // Send alert notification
      await this.sendAlert(alertData);

      // Could implement automatic actions here
      // - Switch to backup payment provider
      // - Temporarily disable payment method
      // - Escalate to manual review

    } catch (error) {
      console.error('Error handling threshold exceeded:', error);
      this.emit('error', error);
    }
  }

  // Get provider statistics
  getProviderStats(provider) {
    let totalFailures = 0;
    let consecutiveFailures = 0;
    let totalPayments = 100; // This would come from your payment stats
    let failureRate = 0;

    for (const [key, stats] of this.failureStats.entries()) {
      if (key.startsWith(provider)) {
        totalFailures += stats.count;
        
        // Check if failures are consecutive (simplified)
        const timeSinceLastFailure = Date.now() - stats.lastOccurrence.getTime();
        if (timeSinceLastFailure < 300000) { // 5 minutes
          consecutiveFailures = Math.max(consecutiveFailures, stats.count);
        }
      }
    }

    if (totalPayments > 0) {
      failureRate = (totalFailures / totalPayments) * 100;
    }

    return {
      provider,
      totalFailures,
      consecutiveFailures,
      totalPayments,
      failureRate: Math.round(failureRate * 100) / 100
    };
  }

  // Update order status (placeholder)
  async updateOrderStatus(orderId, status) {
    // This would update your order in the database
    console.log(`Updating order ${orderId} status to ${status}`);
  }

  // Notify user (placeholder)
  async notifyUser(data) {
    // This would send notification to the user
    console.log('Notifying user:', data);
  }

  // Send alert (placeholder)
  async sendAlert(alertData) {
    // This would send alert to monitoring system
    console.error('ALERT:', alertData);
  }

  // Log failure (placeholder)
  async logFailure(failureData) {
    // This would log to your audit system
    console.log('Logging failure:', failureData);
  }

  // Start compensation processor
  startCompensationProcessor() {
    // Process compensation queue every 5 minutes
    setInterval(() => {
      this.processCompensationQueue();
    }, 5 * 60 * 1000);
  }

  // Get failure statistics
  getFailureStats() {
    const stats = {
      totalFailures: 0,
      providerStats: {},
      errorCodes: {},
      paymentMethods: {},
      compensationQueue: this.compensationQueue.length,
      retryAttempts: this.retryAttempts.size
    };

    for (const [key, failureStats] of this.failureStats.entries()) {
      const [provider, errorCode] = key.split(':');
      
      stats.totalFailures += failureStats.count;
      
      // Provider stats
      if (!stats.providerStats[provider]) {
        stats.providerStats[provider] = 0;
      }
      stats.providerStats[provider] += failureStats.count;
      
      // Error code stats
      if (!stats.errorCodes[errorCode]) {
        stats.errorCodes[errorCode] = 0;
      }
      stats.errorCodes[errorCode] += failureStats.count;
      
      // Payment method stats
      for (const [method, count] of failureStats.paymentMethods.entries()) {
        if (!stats.paymentMethods[method]) {
          stats.paymentMethods[method] = 0;
        }
        stats.paymentMethods[method] += count;
      }
    }

    return stats;
  }
}

// Singleton instance
const paymentFailureHandler = new PaymentFailureHandler();

module.exports = {
  PaymentFailureHandler,
  paymentFailureHandler
};
