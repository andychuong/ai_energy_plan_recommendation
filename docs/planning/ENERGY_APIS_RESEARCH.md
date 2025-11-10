# Energy APIs Research

## Overview

This document lists publicly available APIs for energy supplier data and customer usage data, as researched for the AI Energy Plan Recommendation Agent project.

## APIs for Energy Supplier Data

### 1. U.S. Energy Information Administration (EIA) API
- **URL**: https://www.eia.gov/developer/
- **Purpose**: Comprehensive energy data including electricity generation, retail sales, and average prices at state/national levels
- **Data Available**: 
  - Aggregated supplier data
  - Pricing trends
  - Market statistics
  - Electricity generation by source
  - Retail sales data
- **Access**: Free, requires registration for API key
- **Use Case**: Market-level supplier information and pricing trends
- **Limitation**: Aggregated data, not individual supplier plan catalogs
- **Documentation**: https://www.eia.gov/opendata/

### 2. Open Energy Information (OpenEI) APIs
- **URL**: https://openei.org/services/
- **Purpose**: Utility companies, utility rates, and renewable energy incentives
- **Data Available**: 
  - Utility rate structures
  - Company information
  - Renewable energy programs
  - Utility rates database
- **Access**: Requires registration for API key
- **Use Case**: Utility rate structures and supplier information
- **Limitation**: May not have complete plan catalogs for all deregulated markets
- **Documentation**: https://openei.org/wiki/OpenEI_API

### 3. WattBuy API
- **URL**: https://openpublicapis.com/api/wattbuy
- **Purpose**: Electricity plan comparisons, utility data, carbon footprint
- **Data Available**: 
  - Utility details
  - Plan comparison data
  - Usage estimations
  - Carbon footprint calculations
- **Access**: Requires API key (contact WattBuy)
- **Use Case**: Plan comparison data and utility information
- **Note**: May provide plan comparison features
- **Documentation**: Contact WattBuy for API documentation

## APIs for Customer Usage Data

### 1. Green Button Connect My Data (Standard)
- **Purpose**: Industry-standard format for energy usage data
- **Data Available**: 
  - Standardized XML/JSON format for usage data (kWh, billing periods)
  - Interval data (hourly, daily, monthly)
  - Billing information
- **Adoption**: Supported by many utilities including PG&E, SDG&E, and others
- **Use Case**: Standardized customer usage data retrieval
- **Format**: Green Button XML/JSON standard
- **Note**: Requires customer authorization via OAuth
- **Documentation**: https://www.greenbuttondata.org/

### 2. Public Grid API
- **URL**: https://publicgrid.energy/developers
- **Purpose**: Access to user's own electricity data
- **Data Available**: 
  - Monthly bill usage
  - Real-time data (where accessible)
  - Monthly bill PDFs
  - Green Button format support
- **Access**: Requires user authorization
- **Use Case**: Customer-specific usage data retrieval
- **Format**: REST API
- **Documentation**: https://publicgrid.energy/developers

### 3. PG&E Share My Data API
- **URL**: https://www.pge.com/en/save-energy-and-money/energy-saving-programs/smartmeter/third-party-companies.html
- **Purpose**: Third-party access to customer-authorized energy usage data
- **Data Available**: 
  - Electricity and gas usage data
  - Interval data
  - Billing information
- **Access**: Requires customer authorization and third-party registration
- **Use Case**: California PG&E customer usage data
- **Note**: Utility-specific, not universal
- **Format**: Green Button standard
- **Documentation**: https://www.pge.com/en/save-energy-and-money/energy-saving-programs/smartmeter/third-party-companies.html

### 4. Quantiv Utility Bill API
- **URL**: https://docs.quantiv.io/api
- **Purpose**: Address-specific energy usage data without requiring utility bill
- **Data Available**: 
  - Monthly, quarterly, annual electricity consumption
  - Cost breakdowns
  - Utility rates
  - Address-based estimates
- **Access**: Requires API key
- **Use Case**: Usage estimation based on address when actual usage data unavailable
- **Note**: Provides estimates, not actual usage data
- **Documentation**: https://docs.quantiv.io/api

### 5. Palmetto Energy Intelligence API
- **URL**: https://palmetto.com/business/energy-intelligence-api
- **Purpose**: Detailed simulations of home energy usage
- **Data Available**: 
  - Device-level consumption
  - Bill size estimations
  - Savings estimations
  - Climate impact data
  - Production data (for solar)
- **Access**: Requires API key
- **Use Case**: Usage modeling and projections
- **Note**: Simulation-based, not actual usage data
- **Documentation**: Contact Palmetto for API documentation

## Additional Energy Data APIs

### 6. ENERGY STAR Product Finder API
- **URL**: https://energystar.gov/productfinder/advanced
- **Purpose**: Access to ENERGY STAR certified products data
- **Data Available**: 
  - Energy-efficient product specifications
  - Energy consumption ratings
- **Use Case**: Product energy efficiency analysis
- **Note**: Product-focused, not usage data

### 7. National Grid ESO API (UK)
- **URL**: https://publicapis.io/national-grid-eso-api
- **Purpose**: Great Britain's electricity system data
- **Data Available**: 
  - Electricity consumption patterns
  - Demand forecasting
  - Generation statistics
  - System balancing data
- **Use Case**: UK-specific electricity data
- **Note**: UK-specific, not US-focused

## API Registration Links

1. **EIA API**: https://www.eia.gov/developer/
2. **OpenEI API**: https://openei.org/services/
3. **WattBuy API**: Contact WattBuy for access
4. **Public Grid API**: https://publicgrid.energy/developers
5. **Quantiv API**: https://docs.quantiv.io/api
6. **Palmetto API**: Contact Palmetto for access
7. **PG&E Share My Data**: Requires utility partnership registration

## Recommendations for PRD Requirements

### For Supplier Plan Catalog (P0 Requirement)
**Primary Options:**
1. **OpenEI APIs** - For utility rate structures and supplier information
2. **WattBuy API** - For plan comparison data (if available)
3. **EIA API** - For market-level pricing data to supplement

**Challenge**: No single comprehensive API provides complete supplier plan catalogs with all attributes (rates, contract terms, fees, renewable content). May need to:
- Combine multiple APIs
- Consider web scraping (with legal compliance)
- Partner with energy comparison platforms
- Use mock/sample data for MVP

### For Customer Usage Data (P0 Requirement - 12 months kWh)
**Primary Options:**
1. **Green Button Connect My Data** - Industry standard, widely supported
2. **Public Grid API** - User-friendly interface for data access
3. **Utility-specific APIs** (PG&E, etc.) - For specific regions
4. **Quantiv API** - As fallback for address-based estimates when actual data unavailable

**Implementation Approach:**
- Support Green Button standard as primary method
- Integrate with utility-specific APIs for major providers
- Use Quantiv API as fallback for address-based estimates when actual data unavailable

## Technical Implementation Notes

1. **Authentication**: Most APIs require API keys; customer usage data requires OAuth/user authorization
2. **Data Format**: Green Button uses XML/JSON standard format
3. **Rate Limits**: Check each API's rate limiting policies
4. **Compliance**: Ensure GDPR and data privacy compliance when handling customer usage data
5. **Fallback Strategy**: Implement multiple data sources with fallback options

## API Data Quality Indicators

- **Actual Data**: Real measured data from meters (Green Button, Public Grid, PG&E)
- **Estimated Data**: Based on historical patterns or similar properties (Quantiv)
- **Simulated Data**: Modeled projections (Palmetto)
- **Aggregated Data**: Market-level statistics (EIA)

## Next Steps

1. Register for API keys from recommended providers
2. Review API documentation for exact endpoints and data formats
3. Create integration architecture supporting multiple data sources
4. Implement Green Button standard parser for usage data
5. Design fallback mechanisms for when primary APIs are unavailable

