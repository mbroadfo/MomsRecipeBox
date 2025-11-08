// File: app/utils/logger.js
// Structured logging utility for Mom's Recipe Box
// Replaces scattered console.log statements with proper log levels and formatting

/**
 * Log levels in order of severity
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

/**
 * Environment-based log level configuration
 * Production should run at WARN level, development at DEBUG
 */
function getLogLevel() {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase();
  
  // Explicit log level from environment
  if (envLevel && LOG_LEVELS.hasOwnProperty(envLevel)) {
    return LOG_LEVELS[envLevel];
  }
  
  // AWS Lambda production environment detection
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return LOG_LEVELS.WARN; // Production: only WARN and ERROR
  }
  
  // Node environment fallback
  if (process.env.NODE_ENV === 'production') {
    return LOG_LEVELS.WARN;
  }
  
  // Development: full debugging
  return LOG_LEVELS.DEBUG;
}

/**
 * Get request context for structured logging
 * @param {object} event - Lambda event or Express request
 * @returns {object} Context object for logging
 */
function getRequestContext(event = {}) {
  const context = {
    timestamp: new Date().toISOString()
  };
  
  // Lambda event context
  if (event.requestContext) {
    context.requestId = event.requestContext.requestId;
    context.method = event.httpMethod;
    context.path = event.path;
    context.userAgent = event.headers?.['User-Agent'];
  }
  
  // User context (if available)
  if (event.requestContext?.authorizer?.principalId) {
    context.userId = event.requestContext.authorizer.principalId;
  }
  
  return context;
}

/**
 * Format log message for CloudWatch
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {object} data - Additional data to log
 * @param {object} context - Request context
 * @returns {object} Formatted log object
 */
function formatLogMessage(level, message, data = {}, context = {}) {
  const logObject = {
    level,
    message,
    ...context,
    ...data
  };
  
  // Add error stack if present
  if (data instanceof Error) {
    logObject.error = {
      message: data.message,
      stack: data.stack,
      name: data.name
    };
  }
  
  return logObject;
}

/**
 * Core logging function
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {object|Error} data - Additional data or error object
 * @param {object} event - Lambda event for context
 */
function log(level, message, data = {}, event = {}) {
  const currentLogLevel = getLogLevel();
  const levelValue = LOG_LEVELS[level];
  
  // Skip if log level is below threshold
  if (levelValue > currentLogLevel) {
    return;
  }
  
  const context = getRequestContext(event);
  const logMessage = formatLogMessage(level, message, data, context);
  
  // Use appropriate console method
  switch (level) {
    case 'ERROR':
      console.error(JSON.stringify(logMessage));
      break;
    case 'WARN':
      console.warn(JSON.stringify(logMessage));
      break;
    default:
      console.log(JSON.stringify(logMessage));
  }
}

/**
 * Logger class with convenience methods
 */
class Logger {
  constructor(component = 'unknown') {
    this.component = component;
  }
  
  error(message, data = {}, event = {}) {
    const errorData = { component: this.component, ...data };
    log('ERROR', message, errorData, event);
  }
  
  warn(message, data = {}, event = {}) {
    const warnData = { component: this.component, ...data };
    log('WARN', message, warnData, event);
  }
  
  info(message, data = {}, event = {}) {
    const infoData = { component: this.component, ...data };
    log('INFO', message, infoData, event);
  }
  
  debug(message, data = {}, event = {}) {
    const debugData = { component: this.component, ...data };
    log('DEBUG', message, debugData, event);
  }
  
  // Convenience method for timing operations
  time(label) {
    this._timers = this._timers || {};
    this._timers[label] = Date.now();
  }
  
  timeEnd(label, message = `Operation completed: ${label}`) {
    this._timers = this._timers || {};
    const startTime = this._timers[label];
    
    if (startTime) {
      const duration = Date.now() - startTime;
      this.info(message, { duration, label });
      delete this._timers[label];
      return duration;
    }
    
    this.warn(`Timer not found: ${label}`);
    return null;
  }
}

/**
 * Create a logger instance for a component
 * @param {string} component - Component name (e.g., 'upload_image', 'auth_utils')
 * @returns {Logger} Logger instance
 */
export function createLogger(component) {
  return new Logger(component);
}

/**
 * Direct logging functions (for migration compatibility)
 */
export const logger = {
  error: (message, data, event) => log('ERROR', message, data, event),
  warn: (message, data, event) => log('WARN', message, data, event),
  info: (message, data, event) => log('INFO', message, data, event),
  debug: (message, data, event) => log('DEBUG', message, data, event)
};

/**
 * Lambda-specific helper for consistent request logging
 * @param {object} event - Lambda event
 * @param {string} handler - Handler name
 */
export function logLambdaStart(event, handler) {
  const context = getRequestContext(event);
  log('INFO', `Lambda handler started: ${handler}`, {
    handler,
    method: event.httpMethod,
    path: event.path,
    userAgent: event.headers?.['User-Agent']
  }, event);
}

/**
 * Lambda-specific helper for response logging
 * @param {object} event - Lambda event
 * @param {string} handler - Handler name
 * @param {number} statusCode - Response status code
 * @param {number} duration - Request duration in ms
 */
export function logLambdaEnd(event, handler, statusCode, duration) {
  const level = statusCode >= 400 ? 'WARN' : 'INFO';
  log(level, `Lambda handler completed: ${handler}`, {
    handler,
    statusCode,
    duration
  }, event);
}

/**
 * Migration helper: converts old console.log calls
 * @deprecated Use proper log levels instead
 */
export function migrationLog(originalMessage, component = 'migration') {
  // Parse old emoji-style logs and convert to proper levels
  if (originalMessage.includes('❌') || originalMessage.includes('Error:')) {
    logger.error(originalMessage.replace(/[❌🔥]/g, '').trim(), { component });
  } else if (originalMessage.includes('⚠️') || originalMessage.includes('Warning:')) {
    logger.warn(originalMessage.replace(/[⚠️]/g, '').trim(), { component });
  } else if (originalMessage.includes('✅') || originalMessage.includes('🔧')) {
    logger.info(originalMessage.replace(/[✅🔧🔐📋📝🎯]/g, '').trim(), { component });
  } else {
    logger.debug(originalMessage, { component });
  }
}

export default { createLogger, logger, logLambdaStart, logLambdaEnd, migrationLog };