# Updated DELETE Service Config API - Fixed ObjectId Issue

## Problem Fixed

The original DELETE API was expecting a MongoDB ObjectId (like `60f7b3b3b3b3b3b3b3b3b3b3`) but you tried to use `"refreshPowerScrub"` which is a `serviceId`, causing this error:

```
CastError: Cast to ObjectId failed for value "refreshPowerScrub" (type string)
```

## Solution

I've implemented **two DELETE endpoints** to handle both use cases:

### 1. **Delete by Document ID** (Original - Now with Validation)

```
DELETE /api/service-configs/:id
```

**Usage:** When you have the MongoDB document ID
```bash
curl -X DELETE http://localhost:3000/api/service-configs/60f7b3b3b3b3b3b3b3b3b3b3
```

**New Error Handling:**
```json
// If you pass an invalid ObjectId (like "refreshPowerScrub")
{
  "message": "Invalid ID format. Expected MongoDB ObjectId.",
  "hint": "If you want to delete by serviceId (e.g., 'refreshPowerScrub'), use DELETE /api/service-configs/service/:serviceId"
}
```

### 2. **Delete by Service ID** (New - What You Actually Wanted)

```
DELETE /api/service-configs/service/:serviceId
```

**Usage:** When you want to delete by serviceId (like "refreshPowerScrub")
```bash
curl -X DELETE http://localhost:3000/api/service-configs/service/refreshPowerScrub
```

**Success Response:**
```json
{
  "success": true,
  "message": "Deleted 3 service config(s) for serviceId: refreshPowerScrub",
  "serviceId": "refreshPowerScrub",
  "deletedCount": 3
}
```

## Complete API Usage Examples

### Delete All Refresh Power Scrub Configs (What You Want)

```bash
# This is what you should use for "refreshPowerScrub"
curl -X DELETE http://localhost:3000/api/service-configs/service/refreshPowerScrub
```

**JavaScript/Fetch:**
```javascript
async function deleteServiceConfigsByServiceId(serviceId) {
  try {
    const response = await fetch(`/api/service-configs/service/${serviceId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`Deleted ${result.deletedCount} configs for ${serviceId}`);
    return result;
  } catch (error) {
    console.error('Delete failed:', error);
    throw error;
  }
}

// Usage
deleteServiceConfigsByServiceId('refreshPowerScrub');
```

### Delete Single Config by Document ID

```bash
# First, get the document IDs
curl http://localhost:3000/api/service-configs?serviceId=refreshPowerScrub

# Then delete specific document
curl -X DELETE http://localhost:3000/api/service-configs/60f7b3b3b3b3b3b3b3b3b3b3
```

## Error Handling

### Invalid ObjectId Format
```bash
# This will now give a helpful error instead of crashing
curl -X DELETE http://localhost:3000/api/service-configs/refreshPowerScrub

# Response:
{
  "message": "Invalid ID format. Expected MongoDB ObjectId.",
  "hint": "If you want to delete by serviceId (e.g., 'refreshPowerScrub'), use DELETE /api/service-configs/service/:serviceId"
}
```

### Service Not Found
```bash
# If no configs exist for the serviceId
curl -X DELETE http://localhost:3000/api/service-configs/service/nonexistent

# Response:
{
  "message": "No service configs found for serviceId: nonexistent"
}
```

## Key Differences

| Endpoint | Purpose | Parameter | Deletes |
|----------|---------|-----------|---------|
| `DELETE /:id` | Delete single config | MongoDB ObjectId | One specific document |
| `DELETE /service/:serviceId` | Delete by service type | serviceId string | All configs for that service |

## Complete Updated API

| Method | Endpoint | Description | Example |
|--------|----------|-------------|---------|
| POST | `/api/service-configs` | Create new service config | - |
| GET | `/api/service-configs` | Get all configs | `?serviceId=refreshPowerScrub` |
| GET | `/api/service-configs/active` | Get active configs | - |
| GET | `/api/service-configs/:id` | Get single by ObjectId | `/60f7b3...` |
| GET | `/api/service-configs/service/:serviceId/latest` | Get latest for service | `/refreshPowerScrub/latest` |
| PUT | `/api/service-configs/:id` | Full replace | `/60f7b3...` |
| PUT | `/api/service-configs/:id/partial` | Partial update | `/60f7b3...` |
| DELETE | `/api/service-configs/:id` | Delete by ObjectId | `/60f7b3...` |
| **DELETE** | `/api/service-configs/service/:serviceId` | **Delete by serviceId** | `/service/refreshPowerScrub` |

## Implementation Summary

### Files Modified:

1. **Service Layer** (`serviceConfigService.js:159-161`)
   ```javascript
   export async function deleteServiceConfigsByServiceId(serviceId) {
     return ServiceConfig.deleteMany({ serviceId });
   }
   ```

2. **Controller Layer** (`serviceConfigController.js:174-201`)
   - Added ObjectId validation with helpful error messages
   - Added `deleteServiceConfigsByServiceIdController`

3. **Routes Layer** (`serviceConfigRoutes.js:55-59`)
   ```javascript
   router.delete("/service/:serviceId", serviceConfigController.deleteServiceConfigsByServiceIdController);
   ```

## Testing

**Test the fix:**
```bash
# This should now work (what you originally wanted)
curl -X DELETE http://localhost:3000/api/service-configs/service/refreshPowerScrub

# This should give a helpful error
curl -X DELETE http://localhost:3000/api/service-configs/refreshPowerScrub
```

## Next Time

- Use `DELETE /api/service-configs/service/refreshPowerScrub` when you want to delete by serviceId
- Use `DELETE /api/service-configs/:id` only when you have the actual MongoDB document ID

The API now handles both use cases properly with clear error messages! 🎉