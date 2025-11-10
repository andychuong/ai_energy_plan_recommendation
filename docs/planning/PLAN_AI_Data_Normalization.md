# Plan: AI-Powered Data Normalization

## Overview

This plan explores using AI (LLMs) to automatically convert data from different energy APIs into a common format, replacing or supplementing manual parsers.

## Current State

### Current Approach
- **Manual Parsers**: Each API client has custom parsing logic
  - `OpenEIClient.parse_plans_from_rates()` - Hand-coded extraction
  - `WattBuyClient.parse_plans_from_response()` - Hand-coded extraction
  - `PublicGridClient.get_usage_data()` - Hand-coded extraction
  - `GreenButtonParser` - XML/JSON parser for standardized format

### Challenges with Current Approach
1. **Maintenance Burden**: Each new API requires writing custom parsing code
2. **Fragility**: API response changes break parsers
3. **Incomplete Coverage**: Some fields may be missed or incorrectly mapped
4. **Time to Market**: Adding new APIs takes development time

## Proposed AI-Powered Approach

### Concept
Use Large Language Models (LLMs) to:
1. Accept raw API responses (JSON, XML, or other formats)
2. Extract relevant data fields
3. Convert to standardized format (EnergyPlan, CustomerUsageData)
4. Handle variations and edge cases automatically

### Architecture Options

#### Option 1: Pure AI Normalization (Full Replacement)
- **Flow**: API Response → AI Normalizer → Common Format
- **Pros**: 
  - No manual parsers needed
  - Handles any API format
  - Adapts to API changes automatically
- **Cons**:
  - Higher latency (LLM API calls)
  - Higher cost per request
  - Less deterministic (may need validation)
  - Requires internet connection for LLM

#### Option 2: Hybrid Approach (AI as Fallback)
- **Flow**: Try Manual Parser → If fails/unsupported → AI Normalizer
- **Pros**:
  - Fast for known APIs (manual parsers)
  - Flexible for new/unknown APIs (AI)
  - Cost-effective (only use AI when needed)
- **Cons**:
  - More complex logic
  - Still need some manual parsers

#### Option 3: AI-Assisted Parser Generation
- **Flow**: AI generates parser code → Validate → Use generated parser
- **Pros**:
  - Best of both worlds (fast + flexible)
  - Can cache generated parsers
- **Cons**:
  - Most complex implementation
  - Requires code generation and validation

## Recommended Approach: Hybrid (Option 2)

### Rationale
- **Performance**: Keep fast manual parsers for known APIs
- **Flexibility**: Use AI for new APIs or when parsers fail
- **Cost**: Only pay for AI when necessary
- **Reliability**: Can fall back to manual if AI fails

### Implementation Flow

```
API Response
    ↓
[Check if manual parser exists]
    ↓
Yes → Manual Parser → Validate → Success?
    ↓ No
AI Normalizer → Validate → Success?
    ↓ No
Error/Log for manual fix
```

## Technical Design

### AI Normalization Module

#### Components
1. **Prompt Templates**: Structured prompts for different data types
   - Energy Plan normalization prompt
   - Usage Data normalization prompt
   - Current Plan normalization prompt

2. **Schema Definitions**: JSON schemas for target formats
   - EnergyPlan schema
   - CustomerUsageData schema
   - UsageDataPoint schema

3. **LLM Client**: Wrapper for OpenAI/Anthropic APIs
   - Support multiple providers
   - Retry logic
   - Cost tracking

4. **Validation Layer**: Post-AI validation
   - Schema validation
   - Business rule validation
   - Confidence scoring

### Example Prompt Structure

#### For Energy Plans:
```
You are a data normalization expert. Convert the following API response 
into a standardized energy plan format.

API Response:
{raw_api_response}

Target Schema:
{
  "supplier_name": "string",
  "plan_name": "string",
  "rate_per_kwh": "float",
  "contract_type": "fixed|variable|indexed|hybrid",
  "contract_length_months": "integer|null",
  "early_termination_fee": "float|null",
  "renewable_percentage": "float|null",
  ...
}

Instructions:
- Extract all relevant fields from the API response
- Map field names to target schema (handle variations)
- Convert data types appropriately
- Use null for missing fields
- Return valid JSON only
```

#### For Usage Data:
```
Convert the following energy usage API response into standardized format.

API Response:
{raw_api_response}

Target Schema:
{
  "usage_points": [
    {
      "date": "ISO 8601 datetime",
      "kwh": "float",
      "cost": "float|null",
      ...
    }
  ],
  "total_annual_kwh": "float",
  "average_monthly_kwh": "float",
  ...
}

Instructions:
- Extract all usage data points
- Normalize date formats
- Calculate statistics if not provided
- Handle missing data gracefully
```

## AI Provider Options

### Option 1: OpenAI
- **Models**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Pros**: 
  - Excellent JSON output
  - Function calling support
  - Good structured data extraction
- **Cons**: 
  - Higher cost
  - Requires API key

### Option 2: Anthropic Claude
- **Models**: Claude 3 Opus, Sonnet, Haiku
- **Pros**:
  - Strong reasoning
  - Good at following instructions
  - Competitive pricing
- **Cons**:
  - Slightly less structured output than GPT-4

### Option 3: Open Source (Local)
- **Models**: Llama 3, Mistral, etc.
- **Pros**:
  - No API costs
  - Data privacy
  - No rate limits
- **Cons**:
  - Requires infrastructure
  - Lower quality than commercial models
  - More setup complexity

## Cost Analysis

### Estimated Costs (per 1000 requests)

#### OpenAI GPT-4o-mini
- Input: ~$0.15 per 1M tokens
- Output: ~$0.60 per 1M tokens
- Average request: ~500 tokens input, ~200 tokens output
- **Cost per request**: ~$0.0002
- **Cost per 1000 requests**: ~$0.20

#### Anthropic Claude Haiku
- Input: ~$0.25 per 1M tokens
- Output: ~$1.25 per 1M tokens
- **Cost per request**: ~$0.0003
- **Cost per 1000 requests**: ~$0.30

### Cost Mitigation Strategies
1. **Caching**: Cache normalized results for same API responses
2. **Batch Processing**: Process multiple items in single request
3. **Fallback to Manual**: Use AI only when manual parser fails
4. **Model Selection**: Use cheaper models (GPT-4o-mini, Claude Haiku) for simple cases

## Performance Considerations

### Latency
- **Manual Parser**: <10ms
- **AI Normalization**: 500ms - 2s (API call + processing)
- **Impact**: Acceptable for background processing, may need async handling for real-time

### Optimization Strategies
1. **Async Processing**: Don't block on AI calls
2. **Caching**: Cache normalized results
3. **Batch Requests**: Process multiple items together
4. **Parallel Processing**: Normalize multiple APIs concurrently

## Validation & Quality Assurance

### Validation Layers
1. **Schema Validation**: Ensure output matches expected schema
2. **Business Rules**: Validate data ranges, required fields
3. **Confidence Scoring**: AI provides confidence scores
4. **Human Review**: Flag low-confidence results for review

### Quality Metrics
- **Accuracy**: % of correctly normalized records
- **Completeness**: % of fields successfully extracted
- **Consistency**: Same input produces same output
- **Latency**: Time to normalize

## Implementation Plan

### Phase 1: Proof of Concept
1. Create AI normalization module
2. Implement for one API (e.g., OpenEI)
3. Compare results with manual parser
4. Measure accuracy and performance

### Phase 2: Integration
1. Add AI normalization to data integration flow
2. Implement fallback logic (manual → AI)
3. Add validation layer
4. Add logging and monitoring

### Phase 3: Optimization
1. Implement caching
2. Optimize prompts
3. Add batch processing
4. Cost optimization

### Phase 4: Expansion
1. Support all APIs with AI fallback
2. Add confidence scoring
3. Implement human review workflow
4. Continuous improvement based on feedback

## Risks & Mitigations

### Risk 1: AI Hallucination
- **Mitigation**: Schema validation, business rule checks, confidence thresholds

### Risk 2: Cost Overruns
- **Mitigation**: Usage limits, caching, fallback to manual parsers

### Risk 3: Latency Issues
- **Mitigation**: Async processing, caching, batch operations

### Risk 4: API Changes Break AI
- **Mitigation**: Version detection, prompt updates, manual parser fallback

### Risk 5: Data Privacy
- **Mitigation**: Review data sent to AI APIs, consider local models for sensitive data

## Success Criteria

1. **Accuracy**: >95% correct normalization
2. **Coverage**: Handles 100% of API response variations
3. **Performance**: <2s latency for AI normalization
4. **Cost**: <$0.50 per 1000 normalizations
5. **Reliability**: 99%+ success rate

## Alternative Approaches

### 1. JSON Schema Matching
- Use JSON schema matching libraries
- Less flexible than AI
- Faster and cheaper

### 2. Template-Based Extraction
- Define extraction templates per API
- More maintainable than full manual parsers
- Still requires per-API configuration

### 3. Machine Learning Models
- Train custom ML models for extraction
- Requires training data
- More complex but potentially better accuracy

## Recommendation

**Proceed with Hybrid Approach (Option 2)**:
- Start with manual parsers for known APIs
- Add AI normalization as fallback
- Gradually improve AI prompts based on real data
- Monitor costs and performance
- Consider full AI replacement if accuracy/cost improve

## Next Steps

1. **Research**: Test AI normalization on sample API responses
2. **Prototype**: Build minimal AI normalizer
3. **Evaluate**: Compare accuracy vs manual parsers
4. **Decide**: Proceed with implementation or refine approach

