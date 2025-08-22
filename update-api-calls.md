# API Migration Guide

## Completed Files
✅ **Core API Configuration**
- Created `src/lib/api.ts` with centralized API endpoints
- Updated `.env` and `.env.example` with environment variables
- Updated `vite.config.ts` to use environment variables for proxy

✅ **Updated Files**
- `src/pages/Sortie.tsx` - All fetch calls updated
- `src/pages/Products.tsx` - All fetch calls updated  
- `src/pages/ProductMaterials.tsx` - All fetch calls updated
- `src/pages/NewProduct.tsx` - POST request updated
- `src/pages/EditProduct.tsx` - GET and PUT requests updated
- `src/components/layout/Header.tsx` - Socket.IO and API calls updated
- `src/lib/utils.ts` - Image service URLs updated
- `src/pages/ProductDetail.tsx` - Placeholder images updated
- `src/components/dashboard/ProductCard.tsx` - Placeholder images updated

## Remaining Files to Update

### Files using `/api` paths (relative URLs):
1. `src/pages/Staff.tsx`
2. `src/pages/ProduitSemi.tsx`
3. `src/pages/ProduitFinis.tsx`
4. `src/pages/ProductHistory.tsx`
5. `src/pages/PrisonZoneHistory.tsx`
6. `src/pages/Locations.tsx`
7. `src/pages/Index.tsx`
8. `src/pages/ControlQuality.tsx`
9. `src/components/product/ProductOperationDialog.tsx`

### Files with external image URLs:
1. `src/pages/Register.tsx` - Has hardcoded illustration URL

## How to Use

### For Development (localhost):
```bash
# Your .env file should have:
VITE_API_BASE_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

### For Production:
```bash
# Update your .env file to:
VITE_API_BASE_URL=https://your-production-api.com
VITE_SOCKET_URL=https://your-production-api.com
```

### Quick Update Commands

To update the remaining files, you can use find and replace:

**For `/api` paths:**
- Find: `fetch('/api/`
- Replace: `fetch(\`\${import.meta.env.VITE_API_BASE_URL}/api/\``

**Or import the API utilities:**
```typescript
import { API_ENDPOINTS, buildEndpoint, apiCall } from '@/lib/api';
```

## Benefits
- ✅ Single place to change API URLs
- ✅ Easy switching between environments
- ✅ Type-safe API endpoints
- ✅ Consistent error handling
- ✅ Centralized configuration