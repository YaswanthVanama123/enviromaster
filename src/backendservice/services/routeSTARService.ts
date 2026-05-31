

import {
  AccountType,
  RouteSTARCustomer,
  RouteSTARAnchor,
  DrivingTimeResult,
  AccountTypeDetectionResult,
} from '../types/commission.types.v2';
import { detectAccountType } from '../utils/commissionCalculatorV2';

export interface RouteSTARConfig {
  baseUrl: string;
  loginEndpoint: string;
  distanceEndpoint: string;
  customersEndpoint: string;
  timeout: number;
}

const DEFAULT_CONFIG: RouteSTARConfig = {
  baseUrl: process.env.ROUTESTAR_BASE_URL || 'https://emnrv.routestar.online',
  loginEndpoint: '/web/login/',
  distanceEndpoint: '/web/mapdistance/',
  customersEndpoint: '/api/customers/',
  timeout: 30000,
};

export class RouteSTARService {
  private config: RouteSTARConfig;
  private sessionToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private anchorsCache: RouteSTARAnchor[] = [];
  private anchorsCacheExpiry: Date | null = null;

  constructor(config?: Partial<RouteSTARConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  

  
  async authenticate(): Promise<boolean> {
    const username = process.env.ROUTESTAR_USERNAME;
    const password = process.env.ROUTESTAR_PASSWORD;

    if (!username || !password) {
      console.error('RouteSTAR credentials not configured in environment variables');
      return false;
    }

    try {
      const response = await fetch(`${this.config.baseUrl}${this.config.loginEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username,
          password,
        }),
      });

      if (response.ok) {
        
        const cookies = response.headers.get('set-cookie');
        if (cookies) {
          const sessionMatch = cookies.match(/session[_-]?id=([^;]+)/i);
          if (sessionMatch) {
            this.sessionToken = sessionMatch[1];
            
            this.tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
            return true;
          }
        }

        const data = await response.json().catch(() => null);
        if (data?.token) {
          this.sessionToken = data.token;
          this.tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
          return true;
        }
      }

      console.error('RouteSTAR authentication failed:', response.status);
      return false;
    } catch (error) {
      console.error('RouteSTAR authentication error:', error);
      return false;
    }
  }

  isAuthenticated(): boolean {
    if (!this.sessionToken || !this.tokenExpiry) {
      return false;
    }
    return new Date() < this.tokenExpiry;
  }

  private async ensureAuthenticated(): Promise<boolean> {
    if (this.isAuthenticated()) {
      return true;
    }
    return this.authenticate();
  }

  

  
  async searchCustomer(customerName: string): Promise<RouteSTARCustomer | null> {
    if (!(await this.ensureAuthenticated())) {
      throw new Error('RouteSTAR authentication failed');
    }

    try {
      const response = await fetch(
        `${this.config.baseUrl}${this.config.customersEndpoint}?search=${encodeURIComponent(customerName)}`,
        {
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`,
            'Cookie': `session_id=${this.sessionToken}`,
          },
        }
      );

      if (!response.ok) {
        console.error('Customer search failed:', response.status);
        return null;
      }

      const data = await response.json();
      const customers = data.results || data.customers || data;

      if (Array.isArray(customers) && customers.length > 0) {
        const customer = customers[0];
        return {
          id: customer.id || customer.customer_id,
          name: customer.name || customer.customer_name,
          address: customer.address || customer.street_address,
          city: customer.city,
          state: customer.state,
          zipCode: customer.zip_code || customer.zipCode,
          latitude: customer.latitude || customer.lat,
          longitude: customer.longitude || customer.lng,
        };
      }

      return null;
    } catch (error) {
      console.error('Customer search error:', error);
      return null;
    }
  }

  async getCustomer(customerId: string): Promise<RouteSTARCustomer | null> {
    if (!(await this.ensureAuthenticated())) {
      throw new Error('RouteSTAR authentication failed');
    }

    try {
      const response = await fetch(
        `${this.config.baseUrl}${this.config.customersEndpoint}${customerId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`,
            'Cookie': `session_id=${this.sessionToken}`,
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const customer = await response.json();
      return {
        id: customer.id || customer.customer_id,
        name: customer.name || customer.customer_name,
        address: customer.address || customer.street_address,
        city: customer.city,
        state: customer.state,
        zipCode: customer.zip_code || customer.zipCode,
        latitude: customer.latitude || customer.lat,
        longitude: customer.longitude || customer.lng,
      };
    } catch (error) {
      console.error('Get customer error:', error);
      return null;
    }
  }

  

  
  async getAnchorLocations(): Promise<RouteSTARAnchor[]> {
    
    if (this.anchorsCacheExpiry && new Date() < this.anchorsCacheExpiry && this.anchorsCache.length > 0) {
      return this.anchorsCache;
    }

    if (!(await this.ensureAuthenticated())) {
      throw new Error('RouteSTAR authentication failed');
    }

    try {

      const response = await fetch(
        `${this.config.baseUrl}/api/locations/anchors`,
        {
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`,
            'Cookie': `session_id=${this.sessionToken}`,
          },
        }
      );

      if (!response.ok) {
        console.error('Failed to get anchors:', response.status);
        return this.anchorsCache; 
      }

      const data = await response.json();
      this.anchorsCache = (data.anchors || data || []).map((a: any) => ({
        customerId: a.customer_id || a.id,
        customerName: a.customer_name || a.name,
        address: a.address,
        perVisitRevenue: a.per_visit_revenue || a.revenue,
        isActive: a.is_active !== false,
      }));

      this.anchorsCacheExpiry = new Date(Date.now() + 15 * 60 * 1000);

      return this.anchorsCache;
    } catch (error) {
      console.error('Get anchors error:', error);
      return this.anchorsCache;
    }
  }

  

  
  async calculateDrivingTime(
    fromCustomer: RouteSTARCustomer,
    toCustomer: RouteSTARCustomer
  ): Promise<DrivingTimeResult> {
    if (!(await this.ensureAuthenticated())) {
      throw new Error('RouteSTAR authentication failed');
    }

    try {
      
      const fromAddress = `${fromCustomer.address}, ${fromCustomer.city}, ${fromCustomer.state} ${fromCustomer.zipCode}`;
      const toAddress = `${toCustomer.address}, ${toCustomer.city}, ${toCustomer.state} ${toCustomer.zipCode}`;

      const response = await fetch(`${this.config.baseUrl}${this.config.distanceEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.sessionToken}`,
          'Cookie': `session_id=${this.sessionToken}`,
        },
        body: JSON.stringify({
          origin: fromAddress,
          destination: toAddress,
          
          origin_lat: fromCustomer.latitude,
          origin_lng: fromCustomer.longitude,
          destination_lat: toCustomer.latitude,
          destination_lng: toCustomer.longitude,
        }),
      });

      if (!response.ok) {
        throw new Error(`Distance calculation failed: ${response.status}`);
      }

      const data = await response.json();

      return {
        fromCustomer,
        toCustomer,
        drivingTimeMinutes: data.duration_minutes || data.time || Math.round(data.duration / 60),
        distanceMiles: data.distance_miles || data.distance,
        calculatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Driving time calculation error:', error);
      throw error;
    }
  }

  async findNearestAnchor(
    customerName: string
  ): Promise<{ anchor: RouteSTARAnchor | null; drivingTime: DrivingTimeResult | null }> {
    
    const customer = await this.searchCustomer(customerName);
    if (!customer) {
      return { anchor: null, drivingTime: null };
    }

    const anchors = await this.getAnchorLocations();
    if (anchors.length === 0) {
      return { anchor: null, drivingTime: null };
    }

    let nearestAnchor: RouteSTARAnchor | null = null;
    let shortestTime: DrivingTimeResult | null = null;

    for (const anchor of anchors) {
      if (!anchor.isActive) continue;

      try {
        
        const anchorCustomer = await this.getCustomer(anchor.customerId);
        if (!anchorCustomer) continue;

        const drivingTime = await this.calculateDrivingTime(anchorCustomer, customer);

        if (!shortestTime || drivingTime.drivingTimeMinutes < shortestTime.drivingTimeMinutes) {
          shortestTime = drivingTime;
          nearestAnchor = anchor;
        }
      } catch (error) {
        console.error(`Error calculating distance to anchor ${anchor.customerName}:`, error);
      }
    }

    return { anchor: nearestAnchor, drivingTime: shortestTime };
  }

  

  
  async detectAccountType(
    customerName: string,
    perVisitRevenue: number,
    isGreenline: boolean = false
  ): Promise<AccountTypeDetectionResult> {
    
    const anchorThreshold = isGreenline ? 100 : 200;

    if (perVisitRevenue >= anchorThreshold) {
      return {
        detectedAccountType: 'Anchor',
        nearestAnchor: null,
        drivingTimeMinutes: 0,
        distanceMiles: 0,
        reason: `Revenue $${perVisitRevenue} meets Anchor threshold ($${anchorThreshold}+)`,
        confidence: 'high',
      };
    }

    const { anchor, drivingTime } = await this.findNearestAnchor(customerName);

    if (!anchor || !drivingTime) {
      
      return {
        detectedAccountType: 'Pit',
        nearestAnchor: null,
        drivingTimeMinutes: 999,
        distanceMiles: 0,
        reason: 'No existing Anchor locations found in territory',
        confidence: 'low',
      };
    }

    const drivingTimeMinutes = drivingTime.drivingTimeMinutes;
    let accountType: AccountType;
    let reason: string;

    if (drivingTimeMinutes < 5) {
      accountType = 'Bread5';
      reason = `Within 5 minutes of ${anchor.customerName} (${drivingTimeMinutes} min)`;
    } else if (drivingTimeMinutes <= 15) {
      accountType = 'Bread15';
      reason = `Within 15 minutes of ${anchor.customerName} (${drivingTimeMinutes} min)`;
    } else {
      accountType = 'Pit';
      reason = `More than 15 minutes from nearest Anchor ${anchor.customerName} (${drivingTimeMinutes} min)`;
    }

    return {
      detectedAccountType: accountType,
      nearestAnchor: anchor,
      drivingTimeMinutes,
      distanceMiles: drivingTime.distanceMiles,
      reason,
      confidence: 'high',
    };
  }
}

let routeSTARInstance: RouteSTARService | null = null;

export function getRouteSTARService(): RouteSTARService {
  if (!routeSTARInstance) {
    routeSTARInstance = new RouteSTARService();
  }
  return routeSTARInstance;
}

export async function detectAccountTypeForCustomer(
  customerName: string,
  perVisitRevenue: number,
  isGreenline: boolean = false
): Promise<AccountTypeDetectionResult> {
  const service = getRouteSTARService();
  return service.detectAccountType(customerName, perVisitRevenue, isGreenline);
}

export async function getDrivingTime(
  fromAddress: string,
  toAddress: string
): Promise<{ drivingTimeMinutes: number; distanceMiles: number } | null> {
  const service = getRouteSTARService();

  const fromCustomer: RouteSTARCustomer = {
    id: 'from',
    name: 'Origin',
    address: fromAddress,
    city: '',
    state: '',
    zipCode: '',
  };

  const toCustomer: RouteSTARCustomer = {
    id: 'to',
    name: 'Destination',
    address: toAddress,
    city: '',
    state: '',
    zipCode: '',
  };

  try {
    const result = await service.calculateDrivingTime(fromCustomer, toCustomer);
    return {
      drivingTimeMinutes: result.drivingTimeMinutes,
      distanceMiles: result.distanceMiles,
    };
  } catch (error) {
    console.error('Error getting driving time:', error);
    return null;
  }
}

export default RouteSTARService;
