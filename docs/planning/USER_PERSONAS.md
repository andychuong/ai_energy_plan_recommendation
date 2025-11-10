# Target Users & Personas

## Overview

This document defines the target users, personas, and user stories for the AI Energy Plan Recommendation Agent. Understanding our users helps guide product development and ensures we're solving real problems.

---

## Primary Users

### Residential Energy Consumers

**Description**: Individuals in deregulated energy markets looking to optimize their energy costs and preferences.

**Characteristics**:
- Live in states with deregulated energy markets (e.g., Texas, Pennsylvania, New York)
- Typically homeowners or renters managing household energy bills
- May have varying levels of energy market knowledge
- Concerned about monthly energy costs
- Interested in renewable energy options but may not understand trade-offs

**Pain Points**:
1. **Difficulty understanding complex plans**: Energy plans have complex rate structures, contract terms, and fees that are hard to compare
2. **Fear of overpaying**: Worried about choosing a plan that costs more than necessary
3. **Confusion over renewable options**: Don't understand the cost/benefit trade-offs of renewable energy plans

**Goals**:
- Find the most cost-effective energy plan for their household
- Understand what they're paying for
- Make informed decisions about renewable energy options
- Avoid unexpected fees or rate increases

**Technology Comfort**:
- Comfortable using web applications
- May use mobile devices for research
- Expect clear, simple explanations

---

## Secondary Users

### Small Business Owners

**Description**: Business owners seeking cost-effective and sustainable energy solutions for their operations.

**Characteristics**:
- Own or operate small businesses (typically <50 employees)
- Manage business expenses including energy costs
- May have sustainability goals or requirements
- Need predictable costs for budgeting
- May have higher energy consumption than residential users

**Pain Points**:
1. **Need for predictable energy costs**: Require stable, predictable energy costs for business budgeting and planning
2. **Sustainability goals**: Want to align energy choices with company values or customer expectations
3. **Time constraints**: Limited time to research and compare energy plans
4. **Complex business needs**: May have different usage patterns than residential customers

**Goals**:
- Minimize energy costs while maintaining service quality
- Understand trade-offs between cost and renewable energy
- Make decisions that align with business values
- Simplify the energy plan selection process

**Technology Comfort**:
- Comfortable with business software and web applications
- May delegate research to staff
- Expect professional, detailed information

---

## User Stories

### User Story 1: Personalized Recommendations
**As a** residential energy consumer  
**I want to** receive personalized energy plan recommendations  
**So that** I can choose the most cost-effective and suitable option for my household

**Acceptance Criteria**:
- System analyzes my 12 months of usage data
- Recommendations consider my preferences (cost, flexibility, renewable energy)
- Top 3 plans are presented with clear explanations
- Projected annual savings are calculated and displayed

**Priority**: P0 (Must-have)

---

### User Story 2: Cost vs. Renewable Trade-offs
**As a** small business owner  
**I want to** understand the trade-offs between cost and renewable energy options  
**So that** I can align my energy plan with my sustainability goals

**Acceptance Criteria**:
- System shows cost difference between renewable and non-renewable plans
- Renewable percentage is clearly displayed for each plan
- Trade-offs are explained in plain language
- Recommendations can be filtered by renewable energy percentage

**Priority**: P0 (Must-have)

---

### User Story 3: Seasonal Usage Accommodation
**As a** customer with high summer usage  
**I want to** know how different plans accommodate seasonal variations  
**So that** I can avoid unexpected costs during peak usage months

**Acceptance Criteria**:
- System analyzes seasonal usage patterns from historical data
- Plans are evaluated based on how they handle peak usage periods
- Warnings are provided for plans that may have high costs during peak seasons
- Recommendations consider seasonal variations in pricing

**Priority**: P0 (Must-have)

---

## Additional User Stories (Future Considerations)

### User Story 4: Contract Timing Awareness
**As a** customer with an existing energy plan  
**I want to** know when it's best to switch plans  
**So that** I can avoid early termination fees and optimize timing

**Priority**: P1 (Should-have)

---

### User Story 5: Plan Comparison
**As a** residential energy consumer  
**I want to** compare multiple plans side-by-side  
**So that** I can easily see the differences in rates, terms, and features

**Priority**: P1 (Should-have)

---

### User Story 6: Risk Awareness
**As a** customer considering a new energy plan  
**I want to** be warned about potential issues with recommendations  
**So that** I can make informed decisions and avoid surprises

**Priority**: P1 (Should-have)

---

## Persona Details

### Persona 1: "Cost-Conscious Carol"
**Type**: Primary User - Residential Energy Consumer

**Demographics**:
- Age: 35-55
- Location: Texas (deregulated market)
- Income: Middle class
- Education: Some college

**Background**:
- Homeowner with family
- Monthly energy bill: $150-250
- Currently on a fixed-rate plan
- Contract is expiring soon

**Goals**:
- Reduce monthly energy costs
- Find a plan with no hidden fees
- Understand what she's paying for

**Frustrations**:
- Overwhelmed by too many plan options
- Doesn't understand rate structures
- Worried about making the wrong choice

**Technology Use**:
- Uses smartphone and laptop regularly
- Comfortable with online shopping
- Prefers simple, clear interfaces

---

### Persona 2: "Eco-Conscious Eric"
**Type**: Primary User - Residential Energy Consumer

**Demographics**:
- Age: 25-45
- Location: Pennsylvania (deregulated market)
- Income: Upper middle class
- Education: College degree

**Background**:
- Homeowner, environmentally conscious
- Monthly energy bill: $100-200
- Willing to pay more for renewable energy
- Wants to reduce carbon footprint

**Goals**:
- Find renewable energy plans
- Understand environmental impact
- Balance cost and sustainability

**Frustrations**:
- Doesn't know which renewable plans are legitimate
- Unclear about actual environmental benefits
- Wants to understand cost premium for renewable options

**Technology Use**:
- Tech-savvy, uses multiple devices
- Comfortable with detailed information
- Values transparency and data

---

### Persona 3: "Business Owner Bob"
**Type**: Secondary User - Small Business Owner

**Demographics**:
- Age: 40-60
- Location: New York (deregulated market)
- Business: Retail store or small office
- Employees: 5-20

**Background**:
- Owns small business
- Monthly energy bill: $500-1500
- Needs predictable costs for budgeting
- Has sustainability goals for brand image

**Goals**:
- Minimize energy costs
- Predictable monthly expenses
- Align with sustainability values
- Save time on research

**Frustrations**:
- Too busy to research energy plans thoroughly
- Needs professional-grade information
- Wants to understand business-specific implications

**Technology Use**:
- Uses business software regularly
- Comfortable with detailed reports
- May delegate to staff

---

## User Needs Summary

### Must-Have Features (P0)
1. Personalized plan recommendations based on usage data
2. Clear cost savings calculations
3. Renewable energy options and trade-offs
4. Seasonal usage pattern analysis
5. Plain language explanations

### Should-Have Features (P1)
1. Contract timing recommendations
2. Risk warnings and flags
3. Side-by-side plan comparison
4. Early termination fee calculations

### Nice-to-Have Features (P2)
1. User feedback and rating system
2. Historical plan performance tracking
3. Alerts for better plans becoming available
4. Integration with utility accounts

---

## Success Metrics by User Type

### Residential Energy Consumers
- **Conversion Rate**: % of users who sign up for a recommended plan
- **Satisfaction**: NPS score from residential users
- **Cost Savings**: Average annual savings achieved
- **Engagement**: Time spent reviewing recommendations

### Small Business Owners
- **Conversion Rate**: % of business users who switch plans
- **Satisfaction**: NPS score from business users
- **Cost Savings**: Average annual savings for businesses
- **Time Saved**: Reduction in research time

---

## Notes

- All users need clear, simple explanations regardless of technical background
- Mobile-friendly design is essential for residential users
- Business users may need more detailed information and export capabilities
- Both user types value transparency and trust in recommendations

