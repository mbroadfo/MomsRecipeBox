<!--
  This README merges the content of the previous tools/README.md and tools/INTEGRATION_GUIDE.md.
  It provides a single source of truth for all database tooling, integration, usage, and best practices.
-->

# Mom's Recipe Box - Database Tools & Integration Guide

This directory contains tools for maintaining, analyzing, and ensuring the quality of the Mom's Recipe Box database. These tools are a permanent part of the application infrastructure and support ongoing quality assurance, maintenance, and developer workflows.

## 📁 Directory Structure

```text
tools/
├── README.md                    # This documentation
├── database/
│   ├── quality-analyzer.js     # Comprehensive data quality analysis
│   ├── database-cleaner.js     # Automated database cleanup and standardization
│   ├── field-analyzer.js       # Field usage analysis
│   └── README.md               # Database tools documentation
└── reports/                    # Analysis reports (git-ignored)
  ├── quality_reports/        # Quality analysis outputs
  └── cleanup_reports/        # Cleanup operation logs
```

## 🛠️ Available Tools

### 1. Database Quality Analyzer (`quality-analyzer.js`)

Performs comprehensive analysis of recipe data quality, identifying structural issues, missing fields, and content problems.

**Usage:**

```bash
npm run db:analyze
# or
node tools/database/quality-analyzer.js
```

**Features:**

- Field standardization analysis (steps vs instructions)
- Required field validation (title, ingredients, instructions)
- Data quality assessment (empty fields, missing metadata)
- Content issues detection (placeholder images, test data)
- Structural problem identification (grouped ingredients)
- Severity categorization (critical, high, medium, low)
- Auto-fix capability identification
- Detailed JSON reporting

### 2. Database Cleaner (`database-cleaner.js`)

Automatically fixes structural and standardization issues in the database.

**Usage:**

```bash
npm run db:clean         # Preview changes
npm run db:clean-apply   # Apply fixes
npm run db:clean-full    # Apply fixes + remove tests
# or
node tools/database/database-cleaner.js [--apply] [--remove-tests]
```

**Features:**

- Duplicate field removal (steps when instructions exist)
- Legacy field conversion (steps → instructions)
- Missing field addition (owner_id, visibility)
- Deprecated field removal (status)
- Content cleanup (empty entries, grouped structures)
- Test data removal
- Dry-run safety mode
- Comprehensive change logging

### 3. Field Analyzer (`field-analyzer.js`)

Quickly analyzes field usage patterns and structure across all recipes.

**Usage:**

```bash
npm run db:fields
# or
node tools/database/field-analyzer.js
```

**Features:**

- Field usage counting and distribution
- Duplicate field identification
- Core field completeness assessment
- Quick health check indicators
- Field example values

## 📊 Reports

All tools generate reports that are saved to the `tools/reports/` directory. This directory is git-ignored to prevent cluttering the repository with analysis outputs.

### Report Types

1. **Quality Reports** (`quality_reports/`)

- Detailed analysis of each recipe
- Issue categorization and severity
- Recommendations for improvements
- Database health metrics

1. **Cleanup Reports** (`cleanup_reports/`)

- Log of all changes made
- Before/after comparisons
- Success/failure tracking
- Rollback information

## 🔄 Recommended Workflows

### Regular Maintenance (Weekly)

```bash
npm run db:analyze        # Check database health
npm run db:fields         # Quick field distribution check
```

### Before Major Changes

```bash
npm run db:analyze        # Baseline assessment
# Make changes...
npm run db:analyze        # Verify improvements
```

### After Bulk Data Import

```bash
npm run db:fields         # Check for structural issues
npm run db:clean          # Preview cleanup
npm run db:clean-apply    # Apply fixes
npm run db:analyze        # Verify quality
```

### Database Cleanup Process

```bash
npm run db:analyze        # Identify issues
npm run db:clean          # Preview fixes
npm run db:clean-apply    # Apply standardization
npm run db:analyze        # Verify improvements
```

## 📋 Best Practices

1. **Always run dry-run first** - Preview changes before applying
2. **Backup before cleanup** - Create database backups before major changes
3. **Review reports** - Don't just look at summaries, review detailed findings
4. **Regular monitoring** - Run quality checks periodically
5. **Document decisions** - Keep notes on why certain issues were left unfixed

## 🔧 Configuration

Tools read configuration from:

- Environment variables (`.env` file)
- Database connection settings
- Default values for missing configurations

Required environment variables:

- `MONGODB_DB_NAME` - Database name
- MongoDB connection details (or uses default local settings)

### Default Settings

- **MongoDB URI:** `mongodb://admin:supersecret@localhost:27017/`
- **Default Owner:** `admin_user`
- **Default Visibility:** `family`
- **Report Directory:** `tools/reports/`

## 📝 Contributing

When adding new tools:

1. Follow the existing naming convention
2. Include comprehensive error handling
3. Support dry-run mode where applicable
4. Generate detailed reports
5. Add documentation to this README

## 🐛 Troubleshooting

### Common Issues

**Connection Errors:**

- Verify MongoDB is running
- Check connection string and credentials
- Ensure database exists

**Permission Errors:**

- Check file system permissions for report directory
- Verify MongoDB user permissions

**Out of Memory:**

- For large databases, tools may need memory optimization
- Consider processing in batches for very large collections

### Getting Help

1. Check tool-specific documentation in `database/README.md`
2. Review error messages and logs
3. Verify environment configuration
4. Check MongoDB connectivity

## 🔄 Integration Benefits

1. **Permanent Infrastructure:** Tools are now part of the codebase
2. **Version Control:** Tools evolve with the application
3. **Documentation:** Comprehensive guides for maintenance
4. **Automation Ready:** Can be integrated into CI/CD pipelines
5. **Developer Friendly:** NPM scripts for easy access
6. **Report Management:** Organized, git-ignored output

## 🚀 Future Enhancements

### Possible Improvements

- **Scheduled Analysis:** Automated quality checks
- **Threshold Alerts:** Quality degradation warnings
- **Bulk Operations:** Batch processing for large datasets
- **Integration APIs:** Programmatic access to tools
- **Dashboard:** Visual quality metrics
- **CI/CD Integration:** Automated quality gates

---
