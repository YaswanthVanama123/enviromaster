// src/backendservice/index.ts

// Export all APIs
export * from "./api";

// Export all hooks
export * from "./hooks";

// Export all types
export * from "./types/serviceConfig.types";
export * from "./types/productCatalog.types";
export * from "./types/api.types";

// Export utils
export { apiClient } from "./utils/apiClient";
export { storage } from "./utils/storage";
