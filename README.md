# AI Energy Plan Recommendation Agent

An intelligent solution to assist customers in deregulated energy markets by analyzing usage patterns, preferences, and existing energy plans to recommend the top three optimal energy plans.

## Technology Stack

- **Frontend**: React 18+ with TypeScript, shadcn/ui, Tailwind CSS
- **Backend**: AWS Amplify, AWS Lambda, DynamoDB, S3
- **AI/ML**: OpenAI LLM API
- **Data Visualization**: Recharts, Chart.js
- **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- AWS Account (for Amplify deployment)
- API Keys:
  - OpenAI API key
  - Google Maps API key
  - Energy API keys (EIA, OpenEI, WattBuy, etc.)

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

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. Start development server
```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Check TypeScript types
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ci` - Run tests for CI
- `npm run test:coverage` - Generate test coverage

## Project Structure

```
arbor_ai_energy/
├── .github/
│   └── workflows/          # GitHub Actions workflows
├── planning/               # Planning documents
├── src/
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API services
│   ├── lib/               # Utility functions
│   └── types/             # TypeScript types
├── public/                # Static assets
├── .env.example           # Environment variables template
└── package.json           # Dependencies and scripts
```

## CI/CD

The project uses GitHub Actions for CI/CD:

- **Linting**: Automated code linting on every push/PR
- **Testing**: Automated test execution
- **Build**: Automated build verification
- **Security**: Security scanning with npm audit and Snyk
- **Deployment**: Automated deployment to AWS Amplify

## Documentation

See the `planning/` directory for detailed documentation:

- `COMPLETE_PRD.md` - Complete Product Requirements Document
- `ARCHITECTURE.md` - System architecture
- `IMPLEMENTATION_PLAN.md` - Implementation plan
- `MEMORY_BANK_ARCHITECTURE.md` - Memory bank system design
- `GITHUB_CI_CD.md` - CI/CD setup guide
- `GITHUB_SECRETS_SETUP.md` - GitHub Secrets configuration

## Contributing

1. Create a feature branch
2. Make your changes
3. Run linting and tests
4. Submit a pull request

## License

UNLICENSED - Proprietary software

---

**Version**: 0.1.0  
**Last Updated**: 2025
