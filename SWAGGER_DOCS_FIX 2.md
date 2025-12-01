# 🔧 Swagger Documentation Fix for Railway & Codespace

## Problem

The Swagger/OpenAPI documentation had hardcoded server URLs that didn't work correctly when deployed to Railway or Codespace:

- **API Gateway**: Hardcoded to `http://localhost:8000` and `https://api.coinet.ai`
- **User Service**: Hardcoded to `http://localhost:8005` and `https://users.coinet.ai`

This caused issues because:
1. Railway provides dynamic URLs (e.g., `https://your-service.railway.app`)
2. The Swagger UI couldn't make API calls to the correct server
3. Production URLs might not be configured yet

## Solution

Updated both `swagger.ts` files to dynamically determine server URLs based on environment variables:

### Environment Variable Priority

1. **`SWAGGER_SERVER_URL`** - Explicit Swagger server URL (highest priority)
2. **`RAILWAY_PUBLIC_DOMAIN`** - Railway's public domain (auto-provided)
3. **`API_URL`** - Generic API URL environment variable
4. **`localhost`** - Default fallback for local development

### Changes Made

#### API Gateway (`services/api-gateway/src/swagger.ts`)
- Added `getServerUrl()` function to determine server URL
- Added `getServers()` function to build servers array
- Server URL now adapts to deployment environment

#### User Service (`services/user/src/swagger.ts`)
- Added `getServerUrl()` function to determine server URL
- Added `getServers()` function to build servers array
- Server URL now adapts to deployment environment

## Usage

### Local Development
No changes needed - defaults to `http://localhost:8000` (API Gateway) or `http://localhost:8005` (User Service)

### Railway Deployment
Railway automatically provides `RAILWAY_PUBLIC_DOMAIN` environment variable, so Swagger will automatically use the correct URL.

### Codespace Deployment
Set the `SWAGGER_SERVER_URL` environment variable:
```bash
export SWAGGER_SERVER_URL=https://your-codespace-url.preview.app.github.dev
```

### Custom Production URL
Set the `SWAGGER_SERVER_URL` environment variable:
```bash
export SWAGGER_SERVER_URL=https://api.coinet.ai
```

## Testing

1. **Local Development**:
   ```bash
   # API Gateway
   curl http://localhost:8000/docs
   curl http://localhost:8000/openapi.json
   
   # User Service
   curl http://localhost:8005/docs
   curl http://localhost:8005/openapi.json
   ```

2. **Railway/Codespace**:
   - Visit `https://your-service-url/docs`
   - Verify the server URL in Swagger UI matches your deployment URL
   - Test API calls from Swagger UI

## Benefits

✅ **Automatic URL Detection**: Works out of the box in Railway  
✅ **Flexible Configuration**: Supports multiple environment variable options  
✅ **Development Friendly**: Still works locally without configuration  
✅ **Production Ready**: Easy to configure custom production URLs  

## Files Modified

- `services/api-gateway/src/swagger.ts`
- `services/user/src/swagger.ts`

## Next Steps

1. Deploy to Railway - Swagger should automatically work with Railway URLs
2. Test in Codespace - Set `SWAGGER_SERVER_URL` if needed
3. Verify Swagger UI loads correctly and API calls work

