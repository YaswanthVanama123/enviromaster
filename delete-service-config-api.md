# DELETE Service Config API Endpoint

## Overview

I've successfully implemented a **DELETE API endpoint** for service configurations that allows deleting service configs by their MongoDB document ID.

## API Endpoint

```
DELETE /api/service-configs/:id
```

### Parameters
- `id` (string, required) - The MongoDB document ID of the service config to delete

### Response

#### Success Response (200)
```json
{
  "success": true,
  "message": "ServiceConfig deleted successfully",
  "deletedId": "60f7b3b3b3b3b3b3b3b3b3b3"
}
```

#### Not Found Response (404)
```json
{
  "message": "ServiceConfig not found"
}
```

#### Error Response (500)
```json
{
  "error": "Internal server error message"
}
```

## Implementation Details

### Files Modified

#### 1. **Service Layer** - `/src/services/serviceConfigService.js`

**Added Function:**
```javascript
/**
 * Delete a service config by id.
 * Returns the deleted document if successful, null if not found.
 */
export async function deleteServiceConfig(id) {
  return ServiceConfig.findByIdAndDelete(id);
}
```

#### 2. **Controller Layer** - `/src/controllers/serviceConfigController.js`

**Added Import:**
```javascript
import {
  // ... existing imports
  deleteServiceConfig,
} from "../services/serviceConfigService.js";
```

**Added Controller:**
```javascript
export async function deleteServiceConfigController(req, res, next) {
  try {
    const { id } = req.params;

    const deleted = await deleteServiceConfig(id);

    if (!deleted) {
      return res.status(404).json({ message: "ServiceConfig not found" });
    }

    res.json({
      success: true,
      message: "ServiceConfig deleted successfully",
      deletedId: id,
    });
  } catch (err) {
    next(err);
  }
}
```

#### 3. **Routes Layer** - `/src/routes/serviceConfigRoutes.js`

**Added Route:**
```javascript
// Delete config by id
router.delete(
  "/:id",
  serviceConfigController.deleteServiceConfigController
);
```

## Usage Examples

### Using cURL
```bash
# Delete a service config
curl -X DELETE http://localhost:3000/api/service-configs/60f7b3b3b3b3b3b3b3b3b3b3

# Response
{
  "success": true,
  "message": "ServiceConfig deleted successfully",
  "deletedId": "60f7b3b3b3b3b3b3b3b3b3b3"
}
```

### Using JavaScript/Fetch
```javascript
async function deleteServiceConfig(configId) {
  try {
    const response = await fetch(`/api/service-configs/${configId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Deleted successfully:', result);
    return result;
  } catch (error) {
    console.error('Delete failed:', error);
    throw error;
  }
}

// Usage
deleteServiceConfig('60f7b3b3b3b3b3b3b3b3b3b3')
  .then(result => console.log('Success:', result))
  .catch(error => console.error('Error:', error));
```

### Using Axios
```javascript
import axios from 'axios';

async function deleteServiceConfig(configId) {
  try {
    const response = await axios.delete(`/api/service-configs/${configId}`);
    console.log('Deleted successfully:', response.data);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.error('Service config not found');
    } else {
      console.error('Delete failed:', error.response?.data || error.message);
    }
    throw error;
  }
}
```

## Error Handling

The endpoint handles these scenarios:

1. **Invalid ID Format**: MongoDB will throw an error for invalid ObjectId format
2. **Document Not Found**: Returns 404 status with appropriate message
3. **Database Errors**: Returns 500 status with error details
4. **Server Errors**: Handled by Express error middleware

## Security Considerations

- The endpoint requires a valid MongoDB ObjectId
- No additional validation beyond ID format checking
- Consider adding authentication/authorization middleware if needed
- The delete operation is permanent and cannot be undone

## Integration with Existing API

The DELETE endpoint follows the same patterns as other service config endpoints:

- **URL Structure**: `/api/service-configs/:id` (consistent with GET, PUT operations)
- **Error Responses**: Same format as other endpoints
- **Success Responses**: Includes success flag and descriptive message
- **Error Middleware**: Uses `next(err)` for consistent error handling

## Complete API Overview

Now the service config API supports full CRUD operations:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/service-configs` | Create new service config |
| GET | `/api/service-configs` | Get all configs (with optional serviceId filter) |
| GET | `/api/service-configs/active` | Get active configs |
| GET | `/api/service-configs/:id` | Get single config by ID |
| GET | `/api/service-configs/service/:serviceId/latest` | Get latest for service |
| PUT | `/api/service-configs/:id` | Full replace config |
| PUT | `/api/service-configs/:id/partial` | Partial update config |
| **DELETE** | `/api/service-configs/:id` | **Delete config (NEW)** |

## Testing

You can test the endpoint using:

1. **Postman**: Create a DELETE request to `http://localhost:3000/api/service-configs/{id}`
2. **Browser DevTools**: Use fetch API in console
3. **API Testing Tools**: Thunder Client, Insomnia, etc.

## Next Steps

1. **Authentication**: Consider adding auth middleware if needed
2. **Soft Delete**: Consider implementing soft delete instead of hard delete
3. **Cascade Delete**: Consider if related data needs cleanup
4. **Audit Logging**: Log delete operations for audit trails
5. **Bulk Delete**: Consider adding bulk delete functionality

The DELETE API endpoint is now fully functional and ready for use! 🎉