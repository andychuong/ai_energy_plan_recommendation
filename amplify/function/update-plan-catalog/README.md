# Plan Catalog Update Function

## Overview

This Lambda function updates the energy plan catalog by fetching electricity rates from public APIs (EIA, OpenEI) and generating realistic energy plans based on market rates.

## APIs Used

### 1. EIA (U.S. Energy Information Administration) API
- **URL**: `https://api.eia.gov/v2/`
- **Purpose**: Get average retail electricity prices by state
- **API Key**: Required (get free key from [eia.gov/developer](https://www.eia.gov/developer/))
- **Data**: Average electricity rates in cents per kWh
- **Fallback**: Uses state average defaults if API unavailable

### 2. OpenEI (Open Energy Information) API
- **URL**: `https://api.openei.org/`
- **Purpose**: Get utility rate data
- **API Key**: Optional (get from [openei.org](https://openei.org))
- **Data**: Utility rate information
- **Fallback**: Falls back to EIA or defaults

## Plan Generation Logic

Since retail electricity plan APIs are limited, this function:

1. **Fetches market rates** from EIA/OpenEI APIs
2. **Generates realistic plans** based on market rates with variations:
   - Fixed rate plans (12, 24 months)
   - Variable rate plans
   - Green energy plans (100% renewable)
   - Different contract lengths and terms
   - Supplier ratings and early termination fees

3. **Stores plans** in DynamoDB EnergyPlan table

## Environment Variables

- `EIA_API_KEY` - EIA API key (required for EIA data)
- `OPENEI_API_KEY` - OpenEI API key (optional)

## Usage

```typescript
const event = {
  sources: ['eia', 'openei'], // Optional: which APIs to use
  states: ['CA', 'TX', 'NY'], // Optional: which states to update
};

const response = await handler(event);
```

## Response

```typescript
{
  success: boolean;
  plansUpdated?: number; // Number of plans stored/updated
  error?: string;
}
```

## State Defaults

If APIs are unavailable, uses these state average rates (in $/kWh):
- CA: $0.22
- TX: $0.12
- NY: $0.18
- FL: $0.12
- IL: $0.12
- PA: $0.14
- OH: $0.12
- GA: $0.11
- Default: $0.13

## Setup

1. Get EIA API key from [eia.gov/developer](https://www.eia.gov/developer/)
2. Set secret: `npx ampx sandbox secret set EIA_API_KEY`
3. (Optional) Get OpenEI API key from [openei.org](https://openei.org)
4. (Optional) Set secret: `npx ampx sandbox secret set OPENEI_API_KEY`
5. Deploy backend: `npx ampx sandbox`

## Features

- ✅ Fetches real electricity rates from EIA API
- ✅ Generates realistic plans with market variations
- ✅ Stores plans in DynamoDB
- ✅ Updates existing plans
- ✅ Fallback to defaults if APIs unavailable
- ✅ Supports multiple states
- ✅ Handles API errors gracefully

