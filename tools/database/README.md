# Database Tools Documentation

This directory contains specialized tools for maintaining the Mom's Recipe Box database. All tools are designed to be run from the project root directory.

## Tools Overview

### Quality Analyzer (`quality-analyzer.js`)
Comprehensive analysis tool that examines every recipe and identifies data quality issues.

**What it checks:**
- Field standardization (steps vs instructions)
- Required field validation (title, ingredients, instructions)
- Data quality (empty fields, missing metadata)
- Content issues (placeholder images, test data)
- Structural problems (grouped ingredients, complex objects)

**Output:**
- Console summary with statistics
- Detailed JSON report in `tools/reports/quality_reports/`
- Issue categorization by severity and auto-fix capability

### Database Cleaner (`database-cleaner.js`)
Automated repair tool that fixes structural and standardization issues.

**What it fixes:**
- Removes duplicate fields (steps when instructions exist)
- Converts legacy fields (steps → instructions)
- Adds missing required fields (owner_id, visibility)
- Removes deprecated fields (status)
- Cleans empty entries
- Standardizes data formats

**Safety features:**
- Dry-run mode (default)
- Detailed change logging
- Before/after value tracking
- Error handling and rollback capability

### Field Analyzer (`field-analyzer.js`)
Simple diagnostic tool for understanding field usage patterns.

**What it shows:**
- Field usage counts across all recipes
- Recipes with duplicate fields
- Field distribution statistics
- Quick health overview

## Usage Examples

```bash
# Analyze database quality
node tools/database/quality-analyzer.js

# Preview cleanup changes
node tools/database/database-cleaner.js

# Apply cleanup fixes
node tools/database/database-cleaner.js --apply

# Remove test recipes too
node tools/database/database-cleaner.js --apply --remove-tests

# Check field usage
node tools/database/field-analyzer.js
```

## Configuration

Tools use these environment variables:
- `MONGODB_DB_NAME` - Target database name
- Connection defaults to `mongodb://admin:supersecret@localhost:27017/`

## Output Structure

```
tools/reports/
├── quality_reports/
│   └── recipe_quality_report_YYYY-MM-DDTHH-MM-SS.json
└── cleanup_reports/
    └── cleanup_report_YYYY-MM-DDTHH-MM-SS.json
```

## Integration Notes

- All tools support the same MongoDB connection format
- Reports include timestamps for version tracking
- Tools are designed to be run independently or in sequence
- Error handling prevents partial database corruption

## Maintenance Schedule

**Recommended frequency:**
- **Weekly:** Run quality analyzer to monitor health
- **Before releases:** Run full cleanup sequence
- **After bulk imports:** Run field analyzer and quality check
- **Monthly:** Review and archive old reports
