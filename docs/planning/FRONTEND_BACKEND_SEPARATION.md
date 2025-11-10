# Frontend/Backend Separation Strategy

## Current Setup

The project is currently set up as a **monorepo** with AWS Amplify, which supports both frontend and backend in the same repository with clear separation.

## Current Structure

```
arbor_ai_energy/
├── src/                    # Frontend (React)
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── services/          # API clients (frontend)
│   ├── lib/
│   └── types/
├── amplify/                # Backend (AWS Amplify) - to be created
│   ├── backend/
│   │   ├── api/           # API definitions
│   │   ├── function/      # Lambda functions
│   │   ├── storage/       # S3 buckets
│   │   └── auth/          # Cognito configuration
│   └── .config/
└── planning/              # Documentation
```

## Options for Separation

### Option 1: Monorepo with Directory Separation (Current - Recommended)

**Structure**: Frontend and backend in same repo, separated by directories

**Pros**:
- Single repository for easier coordination
- Shared TypeScript types between frontend and backend
- Single CI/CD pipeline
- Easier to maintain API contracts
- AWS Amplify CLI works seamlessly
- Easier to refactor across boundaries
- Single source of truth

**Cons**:
- Both teams work in same repo (can cause merge conflicts)
- Need clear ownership boundaries
- Single deployment pipeline

**Best For**: 
- Small to medium teams
- Tight integration between frontend and backend
- Shared types and interfaces
- AWS Amplify projects

**Implementation**:
- Frontend in `src/` directory
- Backend in `amplify/` directory
- Shared types in `src/types/` (frontend) and `amplify/backend/function/src/types/` (backend)
- Or shared types in `shared/types/` directory

### Option 2: Separate Repositories

**Structure**: Frontend and backend in different repositories

**Pros**:
- Complete separation of concerns
- Independent versioning
- Independent CI/CD pipelines
- No merge conflicts between teams
- Can deploy independently
- Clear ownership boundaries

**Cons**:
- Need to manage shared types separately
- More complex coordination
- Need API contract documentation
- More repositories to manage
- Harder to refactor across boundaries

**Best For**:
- Large teams
- Independent deployment schedules
- Different technology stacks
- Microservices architecture

**Implementation**:
- Frontend repo: `arbor-ai-energy-frontend`
- Backend repo: `arbor-ai-energy-backend`
- Shared types repo: `arbor-ai-energy-shared` (optional)

### Option 3: Monorepo with Workspaces (Advanced)

**Structure**: Monorepo with npm/yarn workspaces

**Pros**:
- Clear package boundaries
- Independent dependencies
- Can publish packages separately
- Better for large monorepos

**Cons**:
- More complex setup
- Requires workspace management
- May be overkill for this project

**Best For**:
- Large monorepos
- Multiple packages
- Shared libraries

## Recommendation: Option 1 (Monorepo with Directory Separation)

For this project, **Option 1 is recommended** because:

1. **AWS Amplify Integration**: Amplify CLI works best with monorepo structure
2. **Shared Types**: Frontend and backend can share TypeScript types easily
3. **Team Size**: Small to medium team can coordinate well
4. **API Contracts**: Easier to maintain API contracts when in same repo
5. **Simpler CI/CD**: Single pipeline is simpler to manage
6. **Parallel Development**: Still possible with clear directory separation

## Implementation Plan for Monorepo Separation

### Directory Structure

```
arbor_ai_energy/
├── src/                           # Frontend
│   ├── components/               # React components
│   ├── pages/                    # Page components
│   ├── hooks/                     # Custom hooks
│   ├── services/                  # API clients (calls backend)
│   │   ├── api.ts                 # Main API client
│   │   ├── recommendations.ts     # Recommendation API
│   │   └── usage-data.ts          # Usage data API
│   ├── lib/                       # Utilities
│   └── types/                     # TypeScript types (frontend-specific)
│
├── amplify/                       # Backend (AWS Amplify)
│   ├── backend/
│   │   ├── api/                   # API definitions
│   │   │   └── energyapi/        # GraphQL or REST API
│   │   ├── function/              # Lambda functions
│   │   │   ├── recommendationEngine/
│   │   │   ├── dataNormalization/
│   │   │   ├── energyApiClients/
│   │   │   └── memoryBank/
│   │   ├── storage/               # S3 buckets
│   │   └── auth/                  # Cognito configuration
│   └── .config/
│
├── shared/                        # Shared code (optional)
│   ├── types/                     # Shared TypeScript types
│   │   ├── models.ts              # Data models
│   │   ├── api.ts                 # API types
│   │   └── index.ts
│   └── constants/                 # Shared constants
│
└── planning/                      # Documentation
```

### Clear Boundaries

**Frontend Responsibilities**:
- UI components and pages
- User interactions
- Client-side validation
- API calls to backend
- State management
- Routing

**Backend Responsibilities**:
- Business logic
- API endpoints
- Database operations
- External API integrations
- Data processing
- Authentication/authorization

**Shared**:
- TypeScript types/interfaces
- Constants
- Validation schemas (Zod)

### API Contract

Define clear API contracts between frontend and backend:

**File**: `shared/types/api.ts`

```typescript
// Shared API types
export interface RecommendationRequest {
  userId: string;
  usageData: UsageData;
  preferences: UserPreferences;
}

export interface RecommendationResponse {
  recommendations: Recommendation[];
  projectedSavings: number;
  explanation: string;
}
```

### Development Workflow

1. **Frontend Team**:
   - Works in `src/` directory
   - Uses mock data or API stubs initially
   - Implements UI components
   - Calls backend APIs when ready

2. **Backend Team**:
   - Works in `amplify/` directory
   - Implements Lambda functions
   - Sets up API endpoints
   - Provides API documentation

3. **Integration**:
   - Frontend connects to backend APIs
   - Test integration points
   - Update shared types as needed

### CI/CD for Monorepo

**Option A: Single Pipeline** (Current setup)
- Lint and test both frontend and backend
- Build frontend
- Deploy backend (Amplify)
- Deploy frontend (Amplify hosting)

**Option B: Separate Jobs**
- Frontend job: Lint, test, build frontend
- Backend job: Lint, test, deploy backend
- Integration job: Test integration

### Benefits of Current Setup

1. **Easy Type Sharing**: Import types from shared directory
2. **Single Source of Truth**: API contracts in one place
3. **Simpler Deployment**: Amplify handles both frontend and backend
4. **Better Coordination**: Teams can see each other's changes
5. **Easier Refactoring**: Can refactor across boundaries easily

## If You Want Separate Repos

If you decide to split into separate repositories, here's how:

### Frontend Repository

```
arbor-ai-energy-frontend/
├── src/
├── package.json
├── vite.config.ts
└── .github/workflows/
```

### Backend Repository

```
arbor-ai-energy-backend/
├── amplify/
├── package.json
└── .github/workflows/
```

### Shared Types Repository (Optional)

```
arbor-ai-energy-shared/
├── types/
├── package.json
└── README.md
```

**Challenges**:
- Need to publish shared types as npm package
- More complex CI/CD coordination
- Need API contract documentation
- Harder to keep in sync

## Recommendation

**Stick with monorepo (Option 1)** because:

1. AWS Amplify works best with monorepo
2. Easier to share types
3. Simpler CI/CD
4. Better for parallel development with coordination
5. Can still have clear separation with directories

**To ensure good separation**:
- Use clear directory structure
- Define API contracts clearly
- Use shared types directory
- Set up code ownership (CODEOWNERS file)
- Use separate CI/CD jobs for frontend/backend

## Next Steps

1. **Create directory structure**:
   ```bash
   mkdir -p src/{components,pages,hooks,services,lib,types}
   mkdir -p shared/types
   ```

2. **Set up shared types**:
   - Create `shared/types/` directory
   - Define API contracts
   - Export types for both frontend and backend

3. **Initialize Amplify**:
   ```bash
   amplify init
   ```
   This will create `amplify/` directory

4. **Set up code ownership** (optional):
   - Create `.github/CODEOWNERS` file
   - Define frontend and backend owners

5. **Update CI/CD** (if needed):
   - Add separate jobs for frontend and backend
   - Keep integration testing

---

**Version**: 1.0  
**Last Updated**: 2025

