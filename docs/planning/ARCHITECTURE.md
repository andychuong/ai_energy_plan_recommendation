# System Architecture

## Overview

This document outlines the system architecture for the AI Energy Plan Recommendation Agent, using AWS Amplify, React with shadcn UI, and OpenAI LLM API.

---

## Technology Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **UI Library**: shadcn/ui (built on Radix UI and Tailwind CSS)
- **State Management**: React Context API / Zustand (for complex state)
- **Data Fetching**: React Query (TanStack Query) for API calls
- **Form Handling**: React Hook Form with Zod validation
- **Routing**: React Router v6

### Backend & Infrastructure
- **Platform**: AWS Amplify
- **Authentication**: AWS Amplify Auth (Amazon Cognito)
- **API**: AWS AppSync (GraphQL) or REST API with AWS Lambda
- **Database**: Amazon DynamoDB (for user data, preferences, feedback)
- **Storage**: Amazon S3 (for file uploads, usage data files)
- **Functions**: AWS Lambda (for business logic, API integrations)
- **AI/ML**: OpenAI API (for data normalization and recommendations)

### Data Visualization
- **Primary**: Recharts (React-native, declarative, built on D3.js)
- **Secondary**: Chart.js with react-chartjs-2 (for additional chart types)
- **Advanced**: D3.js (for custom visualizations if needed)

### Address Lookup
- **Primary**: Google Places Autocomplete API
- **Alternative**: Mapbox Geocoding API

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   shadcn UI  │  │  Recharts    │  │ React Query  │      │
│  │  Components  │  │  Charts      │  │  Data Fetch  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │         Google Places API (Address Lookup)          │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    AWS Amplify Platform                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Cognito    │  │   AppSync     │  │   Lambda     │    │
│  │  (OAuth/Auth)│  │  (GraphQL)    │  │  Functions   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  DynamoDB    │  │     S3        │  │   API GW     │    │
│  │  (Database)  │  │  (Storage)   │  │  (REST API)  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   OpenAI     │  │  Energy APIs  │  │  Green Button│    │
│  │  LLM API     │  │  (EIA, etc.)  │  │   Format     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Authentication & OAuth

### AWS Amplify Auth (Amazon Cognito)

**Yes, AWS Amplify provides OAuth support** through Amazon Cognito:

#### Supported OAuth Providers
- **Social Logins**: Google, Facebook, Amazon, Apple
- **OAuth 2.0**: Standard OAuth 2.0 flows
- **SAML**: Enterprise SAML providers
- **OpenID Connect**: OIDC providers

#### Implementation
```typescript
// Amplify Auth Configuration
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_xxxxx',
      userPoolClientId: 'xxxxx',
      oauth: {
        domain: 'your-domain.auth.us-east-1.amazoncognito.com',
        scope: ['email', 'openid', 'profile'],
        redirectSignIn: ['http://localhost:3000/'],
        redirectSignOut: ['http://localhost:3000/'],
        responseType: 'code',
        providers: ['Google', 'Facebook', 'Amazon']
      }
    }
  }
});
```

#### Features
- Pre-built UI components (`@aws-amplify/ui-react`)
- Social login buttons
- User management (sign up, sign in, password reset)
- MFA support
- Session management
- Token refresh

---

## Address Lookup & Autocomplete

### Google Places Autocomplete API

#### Implementation Options

**Option 1: Google Places Autocomplete (Recommended)**
```typescript
// Using @react-google-maps/api
import { useLoadScript, Autocomplete } from '@react-google-maps/api';

const libraries = ['places'];

function AddressInput() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries
  });

  return (
    <Autocomplete
      onLoad={(autocomplete) => {
        autocomplete.setFields(['address_components', 'formatted_address', 'geometry']);
      }}
      onPlaceChanged={() => {
        // Handle place selection
      }}
    >
      <Input placeholder="Enter address" />
    </Autocomplete>
  );
}
```

**Option 2: react-places-autocomplete**
```typescript
import PlacesAutocomplete from 'react-places-autocomplete';

function AddressInput() {
  return (
    <PlacesAutocomplete
      value={address}
      onChange={setAddress}
      onSelect={handleSelect}
    >
      {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
        <div>
          <Input {...getInputProps({ placeholder: 'Enter address' })} />
          {suggestions.map(suggestion => (
            <div {...getSuggestionItemProps(suggestion)}>
              {suggestion.description}
            </div>
          ))}
        </div>
      )}
    </PlacesAutocomplete>
  );
}
```

#### Features
- Real-time address suggestions
- Address component parsing (street, city, state, zip)
- Geocoding (lat/lng)
- Formatted address output
- Cost: ~$0.03 per 1000 requests (first 1000 free/month)

#### Alternative: Mapbox Geocoding API
- Similar functionality
- Different pricing model
- Good alternative if already using Mapbox

---

## Data Visualization Libraries

### Recommended: Recharts

**Why Recharts?**
- Built specifically for React
- Declarative API (easy to use)
- Built on D3.js (powerful)
- Responsive by default
- Good TypeScript support
- Active maintenance

#### Installation
```bash
npm install recharts
```

#### Example Usage
```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function UsageChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis label={{ value: 'kWh', angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="kwh" stroke="#8884d8" name="Usage (kWh)" />
        <Line type="monotone" dataKey="cost" stroke="#82ca9d" name="Cost ($)" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

#### Chart Types for Energy Data
- **Line Charts**: Usage over time, cost trends
- **Bar Charts**: Monthly comparisons, plan comparisons
- **Area Charts**: Cumulative usage, cost projections
- **Pie Charts**: Energy source breakdown, plan distribution
- **Composed Charts**: Multiple metrics on same chart

### Alternative: Chart.js with react-chartjs-2

**When to Use:**
- Need more chart types
- Prefer Chart.js ecosystem
- Need animation-heavy charts

```bash
npm install chart.js react-chartjs-2
```

### Advanced: D3.js

**When to Use:**
- Need custom visualizations
- Complex interactive charts
- Unique data representations

---

## Frontend Architecture

### Component Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── charts/          # Recharts wrappers
│   ├── forms/           # Form components
│   ├── layout/          # Layout components
│   └── features/        # Feature-specific components
│       ├── recommendations/
│       ├── usage-data/
│       └── plan-comparison/
├── pages/
│   ├── Home.tsx
│   ├── Recommendations.tsx
│   ├── UsageData.tsx
│   └── PlanComparison.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useRecommendations.ts
│   └── useUsageData.ts
├── services/
│   ├── api.ts           # API client
│   ├── openai.ts        # OpenAI integration
│   └── energy-apis.ts   # Energy API clients
├── lib/
│   ├── utils.ts
│   └── validations.ts
└── types/
    └── index.ts
```

### State Management

**Simple State**: React Context API
```typescript
// contexts/AuthContext.tsx
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // ...
}
```

**Complex State**: Zustand (if needed)
```typescript
// stores/recommendations.ts
import create from 'zustand';

const useRecommendationsStore = create((set) => ({
  recommendations: [],
  loading: false,
  setRecommendations: (data) => set({ recommendations: data }),
}));
```

**Server State**: React Query
```typescript
// hooks/useRecommendations.ts
import { useQuery } from '@tanstack/react-query';

export function useRecommendations(userId) {
  return useQuery({
    queryKey: ['recommendations', userId],
    queryFn: () => fetchRecommendations(userId),
  });
}
```

---

## Backend Architecture

### AWS Amplify Setup

#### Amplify Configuration
```typescript
// amplify/backend/amplify-meta.json
{
  "auth": {
    "cognito": {
      "userPoolId": "...",
      "userPoolClientId": "..."
    }
  },
  "api": {
    "graphql": {
      "apiId": "...",
      "url": "..."
    }
  },
  "storage": {
    "s3": {
      "bucketName": "..."
    }
  }
}
```

### API Design

#### Option 1: GraphQL with AppSync (Recommended)
```graphql
# schema.graphql
type UsageData {
  id: ID!
  userId: ID!
  timestamp: AWSDateTime!
  kwh: Float!
  cost: Float
  periodStart: AWSDateTime
  periodEnd: AWSDateTime
}

type Recommendation {
  id: ID!
  userId: ID!
  planId: ID!
  rank: Int!
  projectedSavings: Float!
  explanation: String!
  createdAt: AWSDateTime!
}

type Query {
  getUsageData(userId: ID!): [UsageData!]!
  getRecommendations(userId: ID!): [Recommendation!]!
}

type Mutation {
  uploadUsageData(input: UsageDataInput!): UsageData!
  generateRecommendations(userId: ID!): [Recommendation!]!
}
```

#### Option 2: REST API with Lambda
```typescript
// Lambda function handler
export const handler = async (event) => {
  const { userId } = event.pathParameters;
  
  // Fetch usage data
  const usageData = await getUsageData(userId);
  
  // Generate recommendations
  const recommendations = await generateRecommendations(usageData);
  
  return {
    statusCode: 200,
    body: JSON.stringify(recommendations)
  };
};
```

### Database Schema (DynamoDB)

#### Tables

**Users Table**
```
PK: userId (String)
Attributes:
  - email (String)
  - preferences (Map)
  - createdAt (String)
  - updatedAt (String)
```

**UsageData Table**
```
PK: userId (String)
SK: timestamp (String)
Attributes:
  - kwh (Number)
  - cost (Number)
  - periodStart (String)
  - periodEnd (String)
  - source (String)
```

**Recommendations Table**
```
PK: userId (String)
SK: recommendationId (String)
Attributes:
  - planId (String)
  - rank (Number)
  - projectedSavings (Number)
  - explanation (String)
  - createdAt (String)
```

**Plans Table**
```
PK: planId (String)
Attributes:
  - supplierName (String)
  - planName (String)
  - ratePerKwh (Number)
  - contractType (String)
  - renewablePercentage (Number)
  - state (String)
```

---

## OpenAI Integration

### Data Normalization Service

```typescript
// services/openai.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function normalizeUsageData(rawData: any) {
  const prompt = `
    Convert the following energy usage API response to the standardized format.
    
    API Response:
    ${JSON.stringify(rawData, null, 2)}
    
    Target Schema: ${COMMON_USAGE_DATA_SCHEMA}
    
    Instructions:
    1. Extract all available fields
    2. Map field names to standard schema
    3. Convert date/time formats to ISO 8601
    4. Normalize units (kWh, $, kW)
    5. Return valid JSON only
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a data normalization expert.' },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### Recommendation Generation

```typescript
export async function generateRecommendations(
  usageData: UsageData,
  preferences: Preferences,
  plans: Plan[]
) {
  const prompt = `
    Generate top 3 energy plan recommendations based on:
    
    Usage Data: ${JSON.stringify(usageData)}
    Preferences: ${JSON.stringify(preferences)}
    Available Plans: ${JSON.stringify(plans)}
    
    Provide:
    1. Top 3 recommendations with rankings
    2. Projected annual savings for each
    3. Plain language explanations
    4. Risk flags if applicable
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are an energy plan recommendation expert.' },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content);
}
```

---

## Data Flow

### Recommendation Generation Flow

```
1. User uploads usage data
   ↓
2. Data validated and stored in S3/DynamoDB
   ↓
3. OpenAI normalizes data (if needed)
   ↓
4. System fetches available plans from APIs
   ↓
5. OpenAI generates recommendations
   ↓
6. Recommendations stored in DynamoDB
   ↓
7. Frontend displays recommendations with charts
```

### Authentication Flow

```
1. User clicks "Sign in with Google"
   ↓
2. AWS Cognito handles OAuth flow
   ↓
3. User redirected back with auth code
   ↓
4. Cognito exchanges code for tokens
   ↓
5. Tokens stored in Amplify Auth
   ↓
6. User authenticated, access granted
```

---

## Deployment

### AWS Amplify Hosting

```bash
# Initialize Amplify
amplify init

# Add authentication
amplify add auth

# Add API
amplify add api

# Add storage
amplify add storage

# Deploy
amplify push
```

### CI/CD Pipeline

Amplify provides built-in CI/CD:
- Connect to GitHub/GitLab
- Automatic builds on push
- Preview deployments for PRs
- Production deployments on merge

---

## Security Considerations

### Data Protection
- **Encryption**: All data encrypted at rest (DynamoDB, S3)
- **HTTPS**: All API calls over HTTPS
- **API Keys**: Stored in AWS Secrets Manager
- **Tokens**: JWT tokens for authentication

### Privacy
- **GDPR Compliance**: User data anonymization
- **Data Retention**: Configurable retention policies
- **User Rights**: Data export and deletion

### API Security
- **Rate Limiting**: API Gateway rate limits
- **CORS**: Configured CORS policies
- **Input Validation**: All inputs validated
- **SQL Injection**: Not applicable (NoSQL)

---

## Performance Optimization

### Frontend
- **Code Splitting**: React.lazy() for route-based splitting
- **Image Optimization**: Next.js Image or similar
- **Caching**: React Query caching
- **Bundle Size**: Tree shaking, minification

### Backend
- **Lambda Cold Starts**: Provisioned concurrency for critical functions
- **Database**: DynamoDB on-demand or provisioned capacity
- **Caching**: ElastiCache for frequently accessed data
- **CDN**: CloudFront for static assets

---

## Monitoring & Analytics

### AWS Services
- **CloudWatch**: Logs, metrics, alarms
- **X-Ray**: Distributed tracing
- **Amplify Analytics**: User behavior tracking

### Frontend Monitoring
- **Sentry**: Error tracking
- **Google Analytics**: User analytics (if needed)

---

## Cost Estimation

### AWS Amplify
- **Hosting**: ~$0.15/GB served
- **Build Minutes**: ~$0.01/minute
- **Data Transfer**: Included in hosting

### AWS Services
- **Cognito**: Free tier (50K MAU)
- **DynamoDB**: On-demand pricing (~$1.25/million requests)
- **Lambda**: Free tier (1M requests/month)
- **S3**: ~$0.023/GB storage

### External Services
- **OpenAI API**: ~$0.20-0.30 per 1000 normalizations
- **Google Places**: ~$0.03 per 1000 requests (first 1000 free)
- **Energy APIs**: Varies by provider

---

## Next Steps

1. **Set up AWS Amplify project**
   - Initialize Amplify
   - Configure authentication
   - Set up API

2. **Create React app**
   - Initialize with Vite or Create React App
   - Install shadcn/ui
   - Set up routing

3. **Implement authentication**
   - Configure Cognito OAuth
   - Add auth components
   - Protect routes

4. **Build core features**
   - Address lookup component
   - Usage data upload
   - Recommendation display
   - Charts and visualizations

5. **Integrate OpenAI**
   - Set up API client
   - Implement normalization
   - Generate recommendations

6. **Deploy and test**
   - Deploy to Amplify
   - Test end-to-end flows
   - Monitor performance

