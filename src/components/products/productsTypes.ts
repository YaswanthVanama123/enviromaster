

export type BillingPeriod = "week" | "month" | "year";

export type MoneyAmount = {
  amount: number;
  currency: "USD";
  uom?: string;            
  unitSizeLabel?: string;  
  billingPeriod?: BillingPeriod;
};

export type EnvProduct = {
  key: string;
  name: string;
  familyKey: string;          
  kind?: string;              
  basePrice?: MoneyAmount;    
  effectivePerRollPriceInternal?: number;
  suggestedCustomerRollPrice?: number;
  quantityPerCase?: number;
  quantityPerCaseLabel?: string;
  warrantyPricePerUnit?: MoneyAmount; 
  frequency?: string;         
  description?: string;       
  displayByAdmin?: boolean;   
};

export type EnvProductFamily = {
  key: string;
  label: string;
  sortOrder: number;
  products: EnvProduct[];
};

export type EnvProductCatalog = {
  version: string;
  lastUpdated?: string;
  currency: "USD";
  families: EnvProductFamily[];
};


export type ColumnKey = "products" | "dispensers";


export type ProductRow = {
  id: string;
  productKey: string | null;
  isDefault?: boolean;
  qty?: number;
  unitPriceOverride?: number;
  warrantyPriceOverride?: number;
  replacementPriceOverride?: number;
  amountOverride?: number;


  isCustom?: boolean;
  customName?: string;


  totalOverride?: number;


  frequency?: string;


  costType?: 'productCost' | 'warranty';


  customFields?: Record<string, string | number>;
};
