/**
 * Comprehensive Error Handling & TypeScript Definitions
 * This file documents all error handling patterns and types used in the application
 */

// ===== CUSTOM ERROR TYPES =====

export class VideoError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'VideoError';
  }
}

export class FirebaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'FirebaseError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ===== ERROR CODES =====

export const ErrorCodes = {
  // Auth Errors
  AUTH_NOT_AUTHENTICATED: 'AUTH_NOT_AUTHENTICATED',
  AUTH_ADMIN_REQUIRED: 'AUTH_ADMIN_REQUIRED',
  AUTH_GOOGLE_SIGN_IN_FAILED: 'AUTH_GOOGLE_SIGN_IN_FAILED',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',

  // Video Errors
  VIDEO_INVALID_URL: 'VIDEO_INVALID_URL',
  VIDEO_DURATION_LOAD_FAILED: 'VIDEO_DURATION_LOAD_FAILED',
  VIDEO_NOT_FOUND: 'VIDEO_NOT_FOUND',
  VIDEO_INVALID_FORMAT: 'VIDEO_INVALID_FORMAT',

  // Playlist Errors
  PLAYLIST_NOT_FOUND: 'PLAYLIST_NOT_FOUND',
  PLAYLIST_DUPLICATE_NAME: 'PLAYLIST_DUPLICATE_NAME',
  PLAYLIST_EMPTY: 'PLAYLIST_EMPTY',

  // Firebase Errors
  FIREBASE_PERMISSION_DENIED: 'FIREBASE_PERMISSION_DENIED',
  FIREBASE_NOT_FOUND: 'FIREBASE_NOT_FOUND',
  FIREBASE_UNAVAILABLE: 'FIREBASE_UNAVAILABLE',
  FIREBASE_NETWORK_ERROR: 'FIREBASE_NETWORK_ERROR',

  // Validation Errors
  VALIDATION_INVALID_INPUT: 'VALIDATION_INVALID_INPUT',
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_LENGTH: 'VALIDATION_INVALID_LENGTH',

  // Cache Errors
  CACHE_WRITE_FAILED: 'CACHE_WRITE_FAILED',
  CACHE_READ_FAILED: 'CACHE_READ_FAILED',

  // Generic Errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR'
};

// ===== ERROR HANDLING UTILITIES =====

/**
 * Global error handler for async operations
 */
export function handleError(error: any, context: string = 'Unknown'): VideoError {
  console.error(`[${context}] Error:`, error);

  if (error instanceof VideoError || error instanceof FirebaseError || error instanceof ValidationError) {
    return error as VideoError;
  }

  let videoError: VideoError;

  if (error?.code?.includes('permission-denied')) {
    videoError = new VideoError(
      'Permission denied. Check your access level.',
      ErrorCodes.FIREBASE_PERMISSION_DENIED,
      403,
      error
    );
  } else if (error?.code?.includes('not-found')) {
    videoError = new VideoError(
      'Resource not found.',
      ErrorCodes.FIREBASE_NOT_FOUND,
      404,
      error
    );
  } else if (error?.code?.includes('unavailable')) {
    videoError = new VideoError(
      'Service temporarily unavailable. Please try again later.',
      ErrorCodes.FIREBASE_UNAVAILABLE,
      503,
      error
    );
  } else if (error?.code?.includes('network')) {
    videoError = new VideoError(
      'Network error. Check your internet connection.',
      ErrorCodes.NETWORK_ERROR,
      0,
      error
    );
  } else if (error instanceof TypeError) {
    videoError = new VideoError(
      'Invalid input or operation.',
      ErrorCodes.VALIDATION_INVALID_INPUT,
      400,
      error
    );
  } else {
    videoError = new VideoError(
      error?.message || 'An unexpected error occurred.',
      error?.code || ErrorCodes.UNKNOWN_ERROR,
      error?.statusCode || 500,
      error
    );
  }

  return videoError;
}

/**
 * Retry operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
  context: string = 'Operation'
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[${context}] Attempt ${attempt}/${maxAttempts}`);
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`[${context}] Attempt ${attempt} failed:`, error);

      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  const finalError = handleError(lastError, context);
  throw finalError;
}

// ===== VALIDATION UTILITIES =====

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Validate video URL
 */
export function validateVideoUrl(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: false, error: 'URL is required' };
  }

  if (!validateUrl(url)) {
    return { valid: false, error: 'Invalid URL format' };
  }

  const videoExtensions = ['.mp4', '.webm', '.ogg', '.m3u8', '.mpd'];
  const isVideoExtension = videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');

  if (!isVideoExtension && !isYouTube) {
    return { 
      valid: false, 
      error: 'Unsupported video format. Use MP4, WebM, OGG, HLS, DASH, or YouTube' 
    };
  }

  return { valid: true };
}

/**
 * Validate playlist name
 */
export function validatePlaylistName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Playlist name is required' };
  }

  if (name.length < 3) {
    return { valid: false, error: 'Playlist name must be at least 3 characters' };
  }

  if (name.length > 100) {
    return { valid: false, error: 'Playlist name cannot exceed 100 characters' };
  }

  return { valid: true };
}

/**
 * Validate video metadata
 */
export function validateVideoMetadata(metadata: {
  title?: string;
  creator?: string;
  description?: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!metadata.title || metadata.title.trim().length === 0) {
    errors.title = 'Title is required';
  } else if (metadata.title.length < 3) {
    errors.title = 'Title must be at least 3 characters';
  }

  if (!metadata.creator || metadata.creator.trim().length === 0) {
    errors.creator = 'Creator name is required';
  }

  if (metadata.description && metadata.description.length > 5000) {
    errors.description = 'Description cannot exceed 5000 characters';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

// Import from your environment file
const environment = {
  production: false
};

// ===== LOGGING UTILITIES =====

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * Centralized logging system
 */
export class Logger {
  private static isDevelopment = !environment.production;

  static log(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;

    switch (level) {
      case LogLevel.DEBUG:
        if (this.isDevelopment) console.debug(prefix, message, data);
        break;
      case LogLevel.INFO:
        console.info(prefix, message, data);
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, data);
        break;
      case LogLevel.ERROR:
        console.error(prefix, message, data);
        break;
    }

    // Send to logging service in production
    if (!this.isDevelopment) {
      this.sendToLoggingService(level, message, data);
    }
  }

  static debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, data);
  }

  static info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data);
  }

  static warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data);
  }

  static error(message: string, data?: any) {
    this.log(LogLevel.ERROR, message, data);
  }

  private static sendToLoggingService(level: LogLevel, message: string, data?: any) {
    // Implement your logging service integration here
    // Examples: Sentry, LogRocket, Datadog, etc.
    console.log('Would send to logging service:', { level, message, data });
  }
}

// ===== PERFORMANCE MONITORING =====

/**
 * Performance monitor for tracking operation times
 */
export class PerformanceMonitor {
  private static measurements = new Map<string, number>();

  static start(label: string) {
    this.measurements.set(label, performance.now());
  }

  static end(label: string): number {
    const startTime = this.measurements.get(label);
    if (!startTime) {
      console.warn(`No start measurement for label: ${label}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.measurements.delete(label);

    Logger.debug(`Performance: ${label} took ${duration.toFixed(2)}ms`);
    return duration;
  }

  static measure(label: string, operation: () => any): any {
    this.start(label);
    try {
      const result = operation();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }

  static async measureAsync(label: string, operation: () => Promise<any>): Promise<any> {
    this.start(label);
    try {
      const result = await operation();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }
}

// ===== TYPE GUARDS =====

/**
 * Check if error is a specific type
 */
export function isVideoError(error: any): error is VideoError {
  return error instanceof VideoError;
}

export function isFirebaseError(error: any): error is FirebaseError {
  return error instanceof FirebaseError;
}

export function isValidationError(error: any): error is ValidationError {
  return error instanceof ValidationError;
}

// ===== CONSTANTS =====



/**
 * Configuration constants
 */
export const Config = {
  // Retry Configuration
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,

  // Cache Configuration
  CACHE_DURATION_PLAYLISTS: 5 * 60 * 1000, // 5 minutes
  CACHE_DURATION_DURATION: 10 * 60 * 1000, // 10 minutes
  CACHE_DURATION_VIEWS: 30 * 60 * 1000, // 30 minutes
  CACHE_DURATION_WATCH_HISTORY: 30 * 24 * 60 * 60 * 1000, // 30 days

  // Video Configuration
  VIDEO_DURATION_TIMEOUT: 10000, // 10 seconds
  VIDEO_DURATION_PRELOAD: 'metadata',

  // View Count Configuration
  VIEW_COUNT_DEBOUNCE: 2000, // 2 seconds
  VIEW_COUNT_MIN_DURATION: 0.9, // 90% watched

  // Watch Position Configuration
  WATCH_POSITION_SAVE_INTERVAL: 10000, // 10 seconds

  // UI Configuration
  CONTROLS_HIDE_TIMEOUT: 3000, // 3 seconds
  TOAST_DURATION: 5000, // 5 seconds
  ERROR_TOAST_DURATION: 5000, // 5 seconds

  // Performance Thresholds
  PERFORMANCE_THRESHOLD_LOAD: 2000, // 2 seconds
  PERFORMANCE_THRESHOLD_PLAYBACK: 500, // 500ms
  PERFORMANCE_THRESHOLD_SEEK: 100, // 100ms
};

/**
 * User messages
 */
export const Messages = {
  // Success Messages
  SUCCESS_VIDEO_ADDED: 'Video added successfully!',
  SUCCESS_VIDEO_DELETED: 'Video deleted successfully!',
  SUCCESS_PLAYLIST_CREATED: 'Playlist created successfully!',
  SUCCESS_PLAYLIST_DELETED: 'Playlist deleted successfully!',
  SUCCESS_LOGIN: 'Welcome! You are now logged in.',
  SUCCESS_LOGOUT: 'You have been logged out.',

  // Error Messages
  ERROR_VIDEO_NOT_FOUND: 'Video not found.',
  ERROR_PLAYLIST_NOT_FOUND: 'Playlist not found.',
  ERROR_INVALID_URL: 'Invalid video URL.',
  ERROR_LOAD_FAILED: 'Failed to load. Please try again.',
  ERROR_SAVE_FAILED: 'Failed to save. Please try again.',
  ERROR_NETWORK: 'Network error. Check your internet connection.',
  ERROR_PERMISSION: 'You do not have permission to perform this action.',
  ERROR_LOGIN_REQUIRED: 'Please login to continue.',
  ERROR_ADMIN_REQUIRED: 'Admin access required.',

  // Info Messages
  INFO_LOADING: 'Loading...',
  INFO_NO_VIDEOS: 'No videos in this playlist.',
  INFO_NO_PLAYLISTS: 'No playlists yet. Create one above!',
  INFO_SELECT_PLAYLIST: 'Select a playlist to view videos.',
};

/**
 * HTTP Status Code Messages
 */
export const HttpStatusMessages: Record<number, string> = {
  400: 'Bad request. Check your input.',
  401: 'Unauthorized. Please login.',
  403: 'Forbidden. You do not have access.',
  404: 'Not found.',
  408: 'Request timeout. Please try again.',
  429: 'Too many requests. Please wait.',
  500: 'Server error. Please try again later.',
  502: 'Bad gateway. Please try again later.',
  503: 'Service unavailable. Please try again later.',
  504: 'Gateway timeout. Please try again later.'
};
