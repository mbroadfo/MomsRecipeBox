# Mom's Recipe Box - Database Tools

This directory contains tools for maintaining and analyzing the Mom's Recipe Box database. These tools help ensure data quality, consistency, and provide insights into the recipe collection.

## 📁 Directory Structure

```
tools/
├── README.md                    # This documentation
├── database/
│   ├── quality-analyzer.js     # Comprehensive data quality analysis
│   ├── database-cleaner.js     # Automated database cleanup and standardization
│   ├── field-analyzer.js       # Simple field usage analysis
│   └── README.md               # Database tools documentation
└── reports/                    # Analysis reports (git-ignored)
    ├── quality_reports/        # Quality analysis outputs
    └── cleanup_reports/        # Cleanup operation logs
```

## 🛠️ Available Tools

### 1. Database Quality Analyzer
**File:** `database/quality-analyzer.js`

Performs comprehensive analysis of recipe data quality, identifying structural issues, missing fields, and content problems.

**Usage:**
```bash
node tools/database/quality-analyzer.js
```

**Features:**
- Analyzes all recipes for data quality issues
- Categorizes issues by severity (critical, high, medium, low)
- Identifies auto-fixable vs. manual-review issues
- Generates detailed reports with recommendations
- Tracks database health metrics

### 2. Database Cleaner
**File:** `database/database-cleaner.js`

Automatically fixes structural and standardization issues in the database.

**Usage:**
```bash
# Preview changes (dry run)
node tools/database/database-cleaner.js

# Apply fixes
node tools/database/database-cleaner.js --apply

# Apply fixes and remove test recipes
node tools/database/database-cleaner.js --apply --remove-tests
```

**Features:**
- Standardizes field usage (instructions vs steps)
- Adds missing required fields
- Removes deprecated fields
- Cleans up empty entries
- Removes test/development data
- Full dry-run capability

### 3. Field Analyzer
**File:** `database/field-analyzer.js`

Simple tool for analyzing field usage patterns across recipes.

**Usage:**
```bash
node tools/database/field-analyzer.js
```

**Features:**
- Counts field usage across all recipes
- Identifies recipes with duplicate fields
- Shows field distribution statistics

## 📊 Reports

All tools generate reports that are saved to the `tools/reports/` directory. This directory is git-ignored to prevent cluttering the repository with analysis outputs.

### Report Types

1. **Quality Reports** (`quality_reports/`)
   - Detailed analysis of each recipe
   - Issue categorization and severity
   - Recommendations for improvements
   - Database health metrics

2. **Cleanup Reports** (`cleanup_reports/`)
   - Log of all changes made
   - Before/after comparisons
   - Success/failure tracking
   - Rollback information

## 🔄 Recommended Workflow

### Regular Maintenance
1. Run quality analyzer to assess database health
2. Review critical and high-severity issues
3. Run database cleaner to fix auto-fixable issues
4. Manually address remaining content issues

### Before Major Changes
1. Run quality analyzer for baseline metrics
2. Create database backup
3. Apply changes
4. Run quality analyzer again to verify improvements

### After Adding New Recipes
1. Run field analyzer to check for consistency
2. Run quality analyzer if issues are suspected
3. Apply cleanup if needed

## 🚀 Integration

These tools can be integrated into your development workflow:

### NPM Scripts
Add to your `package.json`:
```json
{
  "scripts": {
    "db:analyze": "node tools/database/quality-analyzer.js",
    "db:clean": "node tools/database/database-cleaner.js",
    "db:clean-apply": "node tools/database/database-cleaner.js --apply",
    "db:fields": "node tools/database/field-analyzer.js"
  }
}
```

### CI/CD Integration
- Run quality analyzer in CI to catch issues early
- Set quality thresholds for builds
- Generate reports for code reviews

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

---

*Last updated: September 2025*
