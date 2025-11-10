# Common Energy Usage Data Schema

## Overview

This document defines the standardized data structure for energy usage data that works across most energy usage APIs. This schema is designed to be flexible enough to accommodate variations while maintaining consistency.

## Core Data Structure

### JSON Schema

```json
{
  "customer_info": {
    "customer_id": "string (optional)",
    "account_number": "string (optional)",
    "customer_type": "residential|commercial|industrial (optional)",
    "address": {
      "street": "string (optional)",
      "city": "string (optional)",
      "state": "string (optional)",
      "zip_code": "string (optional)",
      "country": "string (optional, default: 'US')",
      "latitude": "float (optional)",
      "longitude": "float (optional)"
    }
  },
  "utility_info": {
    "utility_provider": "string (optional)",
    "utility_id": "string (optional)",
    "meter_id": "string (optional)",
    "meter_type": "smart|analog|digital (optional)",
    "service_type": "electricity|gas|both (optional)"
  },
  "usage_data": [
    {
      "timestamp": "ISO 8601 datetime (required)",
      "period_start": "ISO 8601 datetime (optional)",
      "period_end": "ISO 8601 datetime (optional)",
      "kwh": "float (required)",
      "cost": "float (optional)",
      "cost_per_kwh": "float (optional)",
      "demand_kw": "float (optional)",
      "peak_demand_kw": "float (optional)",
      "temperature": "float (optional, in Fahrenheit)",
      "billing_period": "string (optional, e.g., '2025-01')",
      "interval_type": "hourly|daily|monthly|billing_period (optional)"
    }
  ],
  "aggregated_statistics": {
    "total_kwh": "float (optional)",
    "total_cost": "float (optional)",
    "average_monthly_kwh": "float (optional)",
    "average_daily_kwh": "float (optional)",
    "peak_kwh": "float (optional)",
    "peak_timestamp": "ISO 8601 datetime (optional)",
    "lowest_kwh": "float (optional)",
    "lowest_timestamp": "ISO 8601 datetime (optional)",
    "number_of_data_points": "integer (optional)",
    "date_range": {
      "start": "ISO 8601 datetime (optional)",
      "end": "ISO 8601 datetime (optional)"
    }
  },
  "billing_info": {
    "current_rate": "float (optional, $/kWh)",
    "rate_structure": "flat|tiered|time_of_use|demand (optional)",
    "tariff_name": "string (optional)",
    "billing_cycle_days": "integer (optional)",
    "estimated_annual_cost": "float (optional)"
  },
  "environmental_data": {
    "co2_emissions_kg": "float (optional)",
    "renewable_percentage": "float (optional, 0-100)",
    "energy_source": "electricity|gas|solar|wind|hydro|mixed (optional)"
  },
  "metadata": {
    "data_source": "string (optional, e.g., 'PublicGrid', 'PG&E', 'GreenButton')",
    "data_quality": "actual|estimated|projected (optional)",
    "last_updated": "ISO 8601 datetime (optional)",
    "api_version": "string (optional)",
    "raw_data": "object (optional, for storing original API response)"
  }
}
```

## Field Descriptions

### Customer Information

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `customer_id` | string | No | Unique identifier for the customer |
| `account_number` | string | No | Utility account number |
| `customer_type` | enum | No | Type of customer: residential, commercial, or industrial |
| `address` | object | No | Physical address information |
| `address.street` | string | No | Street address |
| `address.city` | string | No | City name |
| `address.state` | string | No | State code (e.g., "TX", "CA") |
| `address.zip_code` | string | No | ZIP or postal code |
| `address.country` | string | No | Country code (default: "US") |
| `address.latitude` | float | No | Geographic latitude |
| `address.longitude` | float | No | Geographic longitude |

### Utility Information

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `utility_provider` | string | No | Name of the utility company |
| `utility_id` | string | No | Utility company identifier |
| `meter_id` | string | No | Unique meter identifier |
| `meter_type` | enum | No | Type of meter: smart, analog, or digital |
| `service_type` | enum | No | Type of service: electricity, gas, or both |

### Usage Data Points

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timestamp` | datetime | **Yes** | ISO 8601 timestamp for the data point |
| `period_start` | datetime | No | Start of the measurement period |
| `period_end` | datetime | No | End of the measurement period |
| `kwh` | float | **Yes** | Energy consumption in kilowatt-hours |
| `cost` | float | No | Total cost for this period |
| `cost_per_kwh` | float | No | Cost per kilowatt-hour |
| `demand_kw` | float | No | Instantaneous demand in kilowatts |
| `peak_demand_kw` | float | No | Peak demand during the period |
| `temperature` | float | No | Average temperature during period (Fahrenheit) |
| `billing_period` | string | No | Billing period identifier (e.g., "2025-01") |
| `interval_type` | enum | No | Granularity: hourly, daily, monthly, billing_period |

### Aggregated Statistics

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `total_kwh` | float | No | Total consumption across all periods |
| `total_cost` | float | No | Total cost across all periods |
| `average_monthly_kwh` | float | No | Average monthly consumption |
| `average_daily_kwh` | float | No | Average daily consumption |
| `peak_kwh` | float | No | Highest consumption value |
| `peak_timestamp` | datetime | No | Timestamp of peak consumption |
| `lowest_kwh` | float | No | Lowest consumption value |
| `lowest_timestamp` | datetime | No | Timestamp of lowest consumption |
| `number_of_data_points` | integer | No | Count of usage data points |
| `date_range.start` | datetime | No | Start of data range |
| `date_range.end` | datetime | No | End of data range |

### Billing Information

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `current_rate` | float | No | Current rate in $/kWh |
| `rate_structure` | enum | No | Type: flat, tiered, time_of_use, or demand |
| `tariff_name` | string | No | Name of the tariff/rate plan |
| `billing_cycle_days` | integer | No | Number of days in billing cycle |
| `estimated_annual_cost` | float | No | Projected annual cost |

### Environmental Data

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `co2_emissions_kg` | float | No | CO2 emissions in kilograms |
| `renewable_percentage` | float | No | Percentage of renewable energy (0-100) |
| `energy_source` | enum | No | Primary energy source |

### Metadata

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data_source` | string | No | Source API name |
| `data_quality` | enum | No | Quality indicator: actual, estimated, or projected |
| `last_updated` | datetime | No | When data was last updated |
| `api_version` | string | No | Version of the source API |
| `raw_data` | object | No | Original API response for reference |

## Common Variations & Mappings

### Field Name Variations

Different APIs use different field names. Here are common mappings:

| Common Name | API Variations |
|------------|----------------|
| `kwh` | `consumption`, `usage`, `energy`, `kWh`, `kilowatt_hours`, `usage_kwh` |
| `cost` | `total_cost`, `amount`, `bill_amount`, `charges`, `total_charges` |
| `timestamp` | `date`, `time`, `datetime`, `period`, `reading_date`, `interval_start` |
| `utility_provider` | `utility`, `provider`, `utility_company`, `supplier`, `utility_name` |
| `customer_id` | `user_id`, `account_id`, `customer_number`, `account_number` |
| `meter_id` | `meter_number`, `device_id`, `meter_serial`, `meter_identifier` |

### Date/Time Format Variations

- **ISO 8601** (preferred): `2025-01-15T00:00:00Z`
- **Unix timestamp**: `1736899200` (seconds)
- **Unix timestamp (ms)**: `1736899200000` (milliseconds)
- **Date string**: `"2025-01-15"`, `"01/15/2025"`, `"January 15, 2025"`
- **Date + Time**: `"2025-01-15 00:00:00"`

**Normalization**: Always convert to ISO 8601 format.

### Unit Variations

| Standard Unit | Variations |
|---------------|------------|
| kWh | `kWh`, `kilowatt-hours`, `kilowatt hours`, `kw-h`, `kw*h` |
| $ (USD) | `USD`, `dollars`, `$`, `cost` |
| kW | `kilowatts`, `kw`, `kW` |

**Normalization**: Always use standard units (kWh, $, kW).

## Example: Normalized Data Structure

### Example 1: Monthly Billing Data

```json
{
  "customer_info": {
    "customer_id": "CUST123456",
    "customer_type": "residential",
    "address": {
      "street": "123 Main St",
      "city": "Austin",
      "state": "TX",
      "zip_code": "78701"
    }
  },
  "utility_info": {
    "utility_provider": "Austin Energy",
    "meter_id": "METER789",
    "meter_type": "smart",
    "service_type": "electricity"
  },
  "usage_data": [
    {
      "timestamp": "2025-01-15T00:00:00Z",
      "period_start": "2025-01-01T00:00:00Z",
      "period_end": "2025-01-31T23:59:59Z",
      "kwh": 850.5,
      "cost": 102.06,
      "cost_per_kwh": 0.12,
      "billing_period": "2025-01",
      "interval_type": "monthly"
    },
    {
      "timestamp": "2025-02-15T00:00:00Z",
      "period_start": "2025-02-01T00:00:00Z",
      "period_end": "2025-02-28T23:59:59Z",
      "kwh": 920.3,
      "cost": 110.44,
      "cost_per_kwh": 0.12,
      "billing_period": "2025-02",
      "interval_type": "monthly"
    }
  ],
  "aggregated_statistics": {
    "total_kwh": 1770.8,
    "total_cost": 212.50,
    "average_monthly_kwh": 885.4,
    "peak_kwh": 920.3,
    "peak_timestamp": "2025-02-15T00:00:00Z",
    "number_of_data_points": 2,
    "date_range": {
      "start": "2025-01-01T00:00:00Z",
      "end": "2025-02-28T23:59:59Z"
    }
  },
  "billing_info": {
    "current_rate": 0.12,
    "rate_structure": "flat",
    "billing_cycle_days": 30
  },
  "metadata": {
    "data_source": "PublicGrid",
    "data_quality": "actual",
    "last_updated": "2025-03-01T10:00:00Z"
  }
}
```

### Example 2: Hourly Interval Data

```json
{
  "usage_data": [
    {
      "timestamp": "2025-01-15T00:00:00Z",
      "period_start": "2025-01-15T00:00:00Z",
      "period_end": "2025-01-15T01:00:00Z",
      "kwh": 0.5,
      "demand_kw": 0.5,
      "interval_type": "hourly"
    },
    {
      "timestamp": "2025-01-15T01:00:00Z",
      "period_start": "2025-01-15T01:00:00Z",
      "period_end": "2025-01-15T02:00:00Z",
      "kwh": 0.3,
      "demand_kw": 0.3,
      "interval_type": "hourly"
    }
  ],
  "aggregated_statistics": {
    "total_kwh": 0.8,
    "average_daily_kwh": 19.2,
    "number_of_data_points": 2
  }
}
```

## Implementation Notes

### Required Fields

The minimum required fields for a valid usage data structure:
- At least one `usage_data` entry
- Each `usage_data` entry must have:
  - `timestamp` (ISO 8601 datetime)
  - `kwh` (float, >= 0)

### Optional Fields

All other fields are optional but recommended for completeness. The AI normalizer should:
1. Extract all available fields from source APIs
2. Map to standard field names
3. Convert units to standard units
4. Normalize date formats to ISO 8601
5. Calculate aggregated statistics if not provided
6. Preserve original data in `metadata.raw_data`

### Data Quality Indicators

- **actual**: Real measured data from meters
- **estimated**: Estimated based on historical patterns or similar properties
- **projected**: Forecasted future usage

### Validation Rules

1. `kwh` must be >= 0
2. `cost` must be >= 0 if provided
3. `timestamp` must be valid ISO 8601 datetime
4. `period_end` must be >= `period_start` if both provided
5. `renewable_percentage` must be between 0 and 100 if provided
6. `cost_per_kwh` should equal `cost / kwh` if both provided

## AI Normalization Prompt Template

When using AI to normalize data, use this prompt structure:

```
Convert the following energy usage API response to the standardized format.

Source API: {api_name}
API Response:
{raw_api_response}

Target Schema: {schema_json}

Instructions:
1. Extract all available fields from the API response
2. Map field names to standard schema (handle variations)
3. Convert date/time formats to ISO 8601
4. Normalize units (kWh, $, kW)
5. Calculate aggregated statistics if not provided
6. Preserve original data in metadata.raw_data
7. Use null for missing optional fields
8. Return valid JSON only
```

## Benefits of This Schema

1. **Flexibility**: Accommodates different API structures
2. **Completeness**: Captures all common fields
3. **Extensibility**: Metadata field allows API-specific data
4. **Validation**: Clear required vs optional fields
5. **Standardization**: Consistent format across all sources
6. **AI-Friendly**: Well-structured for LLM normalization

