# MomsRecipeBox - Database Tools

## Overview

This directory contains tools for maintaining, analyzing, and ensuring the quality of the MomsRecipeBox database. These tools support ongoing quality assurance, maintenance, and developer workflows.

## Quick Start

```bash
# Analyze database quality
npm run db:analyze

# Preview cleanup changes
npm run db:clean

# Apply database fixes
npm run db:clean-apply
```

For a complete setup guide, see the [Getting Started Guide](../docs/guides/getting_started.md).

## Key Features

- **Quality Analysis**: Comprehensive data quality assessment
- **Automated Cleanup**: Fix common data issues automatically
- **Field Analysis**: Understand data structure and usage patterns
- **Reporting**: Detailed reports on database health
- **Safe Operations**: Preview mode for all changes

## Directory Structure

```text
tools/
├── README.md                  # This documentation
├── database/
│   ├── quality-analyzer.js   # Comprehensive data quality analysis
│   ├── database-cleaner.js   # Automated database cleanup and standardization
│   ├── field-analyzer.js     # Field usage analysis
│   └── README.md             # Detailed database tools documentation
└── reports/                  # Analysis reports (git-ignored)
    ├── quality_reports/      # Quality analysis outputs
    └── cleanup_reports/      # Cleanup operation logs
```

## Available Tools

### 1. Database Quality Analyzer

Performs comprehensive analysis of recipe data quality, identifying structural issues, missing fields, and content problems.

```bash
npm run db:analyze
```

### 2. Database Cleaner

Automatically fixes structural and standardization issues in the database.

```bash
npm run db:clean         # Preview changes
npm run db:clean-apply   # Apply fixes
npm run db:clean-full    # Apply fixes + remove tests
```

### 3. Field Analyzer

Quickly analyzes field usage patterns and structure across all recipes.

```bash
npm run db:fields
```

## Reports

All tools generate reports saved to the `tools/reports/` directory (git-ignored):

- **Quality Reports**: Detailed analysis with issue categorization
- **Cleanup Reports**: Logs of changes with before/after comparisons

## Recommended Workflows

For detailed workflows and best practices, see the [MongoDB Guide](../docs/technical/mongodb_guide.md#database-maintenance).

## Environment Variables

Tools read configuration from environment variables (`.env` file). Required variables:

- `MONGODB_DB_NAME` - Database name
- MongoDB connection details (or uses default local settings)

For more details on MongoDB configuration, see the [Environment Variables Guide](../docs/technical/environment_variables.md).

## Contributing

To contribute to the database tools:

1. Follow existing naming conventions
2. Include comprehensive error handling
3. Support dry-run mode where applicable
4. Generate detailed reports
5. Add documentation to this README

For more information, see the [Contributing Guide](../docs/development/contributing.md).
