# Parallel Development Setup

## Overview

This document outlines the setup for parallel frontend and backend development. Both teams can work independently using shared types and mock data.

## Project Structure

```
arbor_ai_energy/
├── src/                          # Frontend code
│   ├── components/              # React components
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── charts/              # Data visualization components
│   │   ├── forms/               # Form components
│   │   ├── layout/              # Layout components
│   │   ├── features/            # Feature-specific components
│   │   └── auth/                # Authentication components
│   ├── pages/                    # Page components
│   ├── hooks/                    # Custom React hooks
│   ├── services/                 # API service layer
│   ├── lib/                      # Utilities
│   ├── types/                    # Frontend-specific types
│   └── contexts/                 # React contexts
├── amplify/                      # Backend code (Amplify Gen 2)
│   ├── backend.ts               # Main backend configuration
│   ├── auth/                    # Authentication
│   ├── api/                     # API endpoints
│   ├── function/                # Lambda functions
│   ├── data/                    # Database schema
│   └── storage/                 # S3 storage
├── shared/                       # Shared code
│   └── types/                   # Shared TypeScript types
│       ├── models.ts            # Data models
│       ├── api.ts               # API types
│       └── memory-bank.ts       # Memory bank types
└── planning/                     # Planning documents
```

## Shared Types

All shared types are in `shared/types/`:
- **models.ts**: Core data models (EnergyPlan, CustomerUsageData, etc.)
- **api.ts**: API request/response types
- **memory-bank.ts**: Memory bank data models (UserPreferences, UsagePattern, etc.)

Both frontend and backend import from `shared/types/` to ensure type consistency.

## Development Workflow

### Frontend Development

1. **Work with mock data** initially
2. **Use shared types** from `shared/types/`
3. **Create API service layer** that can switch between mock and real API
4. **Test independently** with mock data
5. **Integrate with backend** when ready

### Backend Development

1. **Use shared types** from `shared/types/`
2. **Create API endpoints** matching the shared API types
3. **Implement memory bank** using DynamoDB
4. **Test independently** with API testing tools
5. **Deploy to sandbox** for frontend integration

## Mock Data Strategy

### Frontend Mock Services

Create mock API services in `src/services/mock/`:
- `mockApi.ts` - Mock API client
- `mockData.ts` - Mock data generators
- Switch between mock and real API via environment variable

### Backend Testing

- Use local testing for Lambda functions
- Test API endpoints with Postman/Insomnia
- Use DynamoDB Local for local database testing

## Communication Contract

### API Endpoints

All API endpoints are defined in `shared/types/api.ts`:
- Request types
- Response types
- Error types

### Data Models

All data models are defined in:
- `shared/types/models.ts` - Core models
- `shared/types/memory-bank.ts` - Memory bank models

## Next Steps

### Frontend Team

1. Set up shadcn/ui
2. Create layout components
3. Set up routing
4. Create data visualization components
5. Build forms and interfaces
6. Use mock data for development

### Backend Team

1. Set up Amplify API (AppSync or REST)
2. Create DynamoDB tables
3. Implement Lambda functions
4. Set up memory bank services
5. Create API endpoints
6. Test with API tools

## Integration Points

### When to Integrate

- Frontend: When API endpoints are ready
- Backend: When frontend needs real data
- Both: During integration testing phase

### Integration Steps

1. Frontend switches from mock to real API
2. Backend deploys to sandbox
3. Test end-to-end flows
4. Fix integration issues
5. Deploy to production

---

**Version**: 1.0  
**Last Updated**: 2025

