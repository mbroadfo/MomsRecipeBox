/**
 * API Client for MomsRecipeBox
 * Environment-aware HTTP client with automatic endpoint configuration
 */

import { config, getApiUrl, devLog } from '../config/environment.js';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
  status: number;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

/**
 * Enhanced fetch with timeout and error handling
 */
async function fetchWithTimeout(
  url: string, 
  options: RequestInit = {}, 
  timeout = config.API_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Main API client class
 */
export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  
  constructor() {
    this.baseUrl = config.API_BASE_URL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    devLog('ApiClient initialized:', { baseUrl: this.baseUrl });
  }
  
  /**
   * Set authorization token for authenticated requests
   */
  setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  /**
   * Remove authorization token
   */
  clearAuthToken() {
    delete this.defaultHeaders['Authorization'];
  }
  
  /**
   * Generic API request method
   */
  async request<T = any>(
    endpoint: string, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { 
      method = 'GET', 
      headers = {}, 
      body, 
      timeout = config.API_TIMEOUT 
    } = options;
    
    const url = getApiUrl(endpoint);
    const requestHeaders = { ...this.defaultHeaders, ...headers };
    
    devLog(`${method} ${url}`, { body });
    
    try {
      const response = await fetchWithTimeout(url, {
        method,
        headers: requestHeaders,
        body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
      }, timeout);
      
      const isJson = response.headers.get('content-type')?.includes('application/json');
      const responseData = isJson ? await response.json() : await response.text();
      
      const apiResponse: ApiResponse<T> = {
        data: responseData,
        success: response.ok,
        status: response.status,
      };
      
      if (!response.ok) {
        apiResponse.error = responseData.message || responseData.error || `HTTP ${response.status}`;
        devLog('API Error:', apiResponse);
      } else {
        devLog('API Success:', { status: response.status, data: responseData });
      }
      
      return apiResponse;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      devLog('API Request Failed:', { url, error: errorMessage });
      
      return {
        success: false,
        status: 0,
        error: errorMessage,
      };
    }
  }
  
  /**
   * GET request helper
   */
  async get<T = any>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }
  
  /**
   * POST request helper
   */
  async post<T = any>(endpoint: string, body?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }
  
  /**
   * PUT request helper
   */
  async put<T = any>(endpoint: string, body?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }
  
  /**
   * DELETE request helper
   */
  async delete<T = any>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
  
  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<ApiResponse> {
    return this.get('/health');
  }
  
  /**
   * Get detailed health information
   */
  async healthDetailed(): Promise<ApiResponse> {
    return this.get('/health/detailed');
  }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient();

/**
 * Recipe API endpoints
 */
export const recipeApi = {
  getAll: () => apiClient.get('/recipes'),
  getById: (id: string) => apiClient.get(`/recipes/${id}`),
  create: (recipe: any) => apiClient.post('/recipes', recipe),
  update: (id: string, recipe: any) => apiClient.put(`/recipes/${id}`, recipe),
  delete: (id: string) => apiClient.delete(`/recipes/${id}`),
  search: (query: string) => apiClient.get(`/recipes/search?q=${encodeURIComponent(query)}`),
};

/**
 * Image API endpoints
 */
export const imageApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return apiClient.post('/upload', formData, {
      headers: {}, // Let browser set Content-Type for FormData
    });
  },
};

/**
 * Admin API endpoints
 */
export const adminApi = {
  getStats: () => apiClient.get('/admin/stats'),
  getRecipes: () => apiClient.get('/admin/recipes'),
  deleteRecipe: (id: string) => apiClient.delete(`/admin/recipes/${id}`),
};