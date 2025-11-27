# SparkSave 💡

**Smart energy plan recommendations that save you money**

SparkSave is an intelligent solution that helps customers find the best energy plans by analyzing usage patterns, preferences, and available options to recommend personalized plans that maximize savings.

## Features

- **AI-Powered Bill Reading**: Upload energy bills (PDF, CSV, images) and automatically extract usage data using AI
- **Personalized Recommendations**: Get tailored energy plan recommendations based on your usage patterns and preferences
- **Usage Data Management**: Track and manage your energy usage data with visualizations
- **Customer Satisfaction Ratings**: See how other customers rate recommended plans
- **Smart Learning System**: The AI learns from successful bill extractions to improve accuracy over time

## Technology Stack

- **Frontend**: React 18+ with TypeScript, shadcn/ui, Tailwind CSS
- **Backend**: AWS Amplify Gen 2, AWS Lambda, DynamoDB
- **AI/ML**: OpenRouter API (GPT-4o, GPT-4 Turbo) for bill reading and recommendations
- **Data Visualization**: Recharts, Chart.js
- **CI/CD**: GitHub Actions
- **Testing**: Jest, React Testing Library

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- AWS Account (for Amplify deployment)
- OpenRouter API key (for AI features)

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd arbor_ai_energy
```

2. Install dependencies

```bash
npm install
```

3. Set up AWS Amplify

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Configure Amplify (if not already configured)
amplify configure
```

4. Set up secrets for Lambda functions

```bash
# Start sandbox to set secrets
npm run sandbox

# In another terminal, set OpenRouter API key
npx ampx sandbox secret set OPENROUTER_API_KEY
```

5. Start development server

```bash
npm run dev
```

6. Start Amplify sandbox (in another terminal)

```bash
npm run sandbox
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Check TypeScript types
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ci` - Run tests for CI
- `npm run test:coverage` - Generate test coverage
- `npm run sandbox` - Start Amplify sandbox for local backend development

## Project Structure

```
arbor_ai_energy/
├── .github/
│   └── workflows/          # GitHub Actions CI/CD workflows
├── amplify/
│   ├── api/               # API configuration
│   ├── auth/              # Authentication configuration
│   ├── data/              # Database schema (DynamoDB)
│   ├── function/         # Lambda functions
│   └── backend.ts        # Main backend configuration
├── docs/                  # Documentation
├── src/
│   ├── components/       # React components
│   │   ├── features/     # Feature components (RecommendationCard, etc.)
│   │   ├── layout/       # Layout components (Header, etc.)
│   │   └── ui/           # UI primitives (shadcn/ui)
│   ├── pages/            # Page components
│   ├── hooks/            # Custom React hooks
│   ├── services/         # API services
│   ├── lib/              # Utility functions
│   └── contexts/         # React contexts (AuthContext)
├── shared/
│   └── types/            # Shared TypeScript types
└── package.json
```

## Key Features

### AI Bill Reading

- Supports PDF, CSV, image, and text file formats
- Automatically extracts usage data, billing periods, and utility information
- Learns from successful extractions to improve accuracy
- Handles timezone issues and date parsing correctly

### Recommendations

- Generates personalized energy plan recommendations
- Saves recommendations to dashboard for easy access
- Shows customer satisfaction ratings
- Calculates projected savings

### Usage Data Management

- Upload bills or manually enter usage data
- Visualize usage patterns with charts
- Edit and update monthly usage data
- Automatic aggregation and statistics    

## CI/CD

The project uses GitHub Actions for CI/CD:

- **Linting**: Automated code linting on every push/PR
- **Testing**: Automated test execution with Jest
- **Build**: Automated build verification
- **Security**: Security scanning with npm audit and Snyk
- **Deployment**: Automated deployment to AWS Amplify Hosting

## Documentation

See the `docs/` directory for detailed documentation:

- `docs/backend/` - Backend setup and Lambda function documentation
- `docs/setup/` - Setup guides for various services
- `amplify/SECRETS_SETUP.md` - Secrets configuration guide

## Contributing

1. Create a feature branch
2. Make your changes
3. Run linting and tests: `npm run lint && npm test`
4. Ensure all tests pass
5. Submit a pull request

## License

UNLICENSED - Proprietary software

---

**Version**: 0.1.0  
**Last Updated**: December 2024
# CI/CD Pipeline Status
