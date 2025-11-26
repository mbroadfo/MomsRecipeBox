# Data Quality Standards

## Overview

This document defines the data quality standards for Mom's Recipe Box recipes and explains how data quality is measured and reported.

## Quality Criteria

### 🚨 Critical Issues (Must Fix)

Recipes with these issues are considered **unusable** and must be corrected immediately:

1. **Missing Title** - Recipe cannot be identified or found
2. **Missing Ingredients** - Recipe cannot be cooked without ingredients list
3. **Missing Instructions** - Recipe has no cooking guidance

**Impact**: Recipes with critical issues are excluded from "clean recipe" count.

### ⚠️ High Priority Issues (Should Fix Soon)

Recipes with these issues have structural problems that significantly impact usability:

1. **Empty Ingredients Array** - Field exists but contains no ingredients
2. **Empty Instructions Array** - Field exists but contains no cooking steps

**Impact**: Contributes to overall quality score reduction.

### 🟡 Medium Priority Issues (Nice to Have)

Recipes missing helpful but non-essential information:

1. **Missing Time Information** - No prep time, cook time, or total time
2. **Missing Yield Information** - No serving size or portion count

**Impact**: Reduces recipe utility but doesn't prevent usage.

### 🔵 Low Priority Issues (Enhancement)

Recipes missing optional metadata that enhances discoverability:

1. **Missing Description** - No recipe overview or summary
2. **Missing Optional Metadata** - Tags, categories, dietary information

**Impact**: Minimal - primarily affects search and organization.

## Quality Scoring

### Clean Recipe Definition

A "clean" recipe is one that has:

- ✅ Title present

- ✅ Ingredients present (and non-empty if array)

- ✅ Instructions present (and non-empty if array)

### Data Quality Percentage

```text
Data Quality % = (Clean Recipes / Total Recipes) × 100
```

### Quality Grades

- **A Grade** (90-100%): Excellent data quality - maintain current standards

- **B Grade** (80-89%): Good quality - focus on completing optional fields

- **C Grade** (70-79%): Acceptable quality - address high priority issues

- **D Grade** (60-69%): Poor quality - immediate action needed

- **F Grade** (< 60%): Critical quality problems - urgent remediation required

## Health Check Thresholds

The system automatically monitors data quality with these thresholds:

```javascript
{
  minCleanPercentage: 50%,      // Minimum acceptable clean recipe percentage
  maxCriticalIssues: 0,         // No recipes with critical issues allowed
  maxHighIssues: 5              // Maximum 5 recipes with high priority issues
}

```

If data quality falls below these thresholds, the health check will report a warning or error status.

## Real vs. Artifact Quality Issues

### Real Quality Issues

These represent actual problems in the data:

- **Missing required fields**: Recipes truly missing title, ingredients, or instructions

- **Empty arrays**: Data structures present but unpopulated

- **Incomplete metadata**: Time, yield, or description not provided by user

### Implementation Artifacts

These are NOT quality issues but data model variations:

- **Different data structure versions**: Old vs. new recipe formats

- **Optional fields**: Description, tags, and metadata are intentionally optional

- **User preferences**: Some users may choose not to provide optional information

## Data Quality Dashboard

### Location

Admin Panel → Data Quality (`/admin/data-quality`)

### Features

1. **Overall Health Status** - Database connection and health
2. **Quality Score Card** - Letter grade and percentage display
3. **Recipe Statistics**:
   - Total recipes in database
   - Clean recipes count
   - Recipes needing attention
4. **Quality Criteria Reference** - Detailed breakdown of all quality checks
5. **Recommendations** - Actionable advice based on current quality level

### Refresh Behavior

- Data quality analysis runs automatically on Lambda cold start

- Manual refresh available via "Refresh Data Quality Analysis" button

- Analysis typically adds ~2-5 seconds to health check duration

## Monitoring & Alerts

### Automatic Health Checks

- Runs on every Lambda cold start

- Results available in CloudWatch Logs (`/aws/lambda/mrb-app-api`)

- Admin System Status endpoint exposes current quality metrics

### Recommended Actions by Quality Level

#### Quality < 70% (Critical)

1. Identify recipes with missing critical fields
2. Contact recipe owners for completion
3. Consider bulk import/migration tools
4. Review data entry workflows

#### Quality 70-89% (Good)

1. Focus on completing time and yield information
2. Encourage recipe descriptions
3. Review high priority issues
4. Maintain current data entry standards

#### Quality 90%+ (Excellent)

1. Maintain current standards
2. Focus on optional metadata enhancement
3. Document best practices
4. Use as model for new recipes

## Technical Implementation

### Data Quality Checker Class

Located in: `app/health/database-health.js`

```javascript
class RecipeDataQualityChecker {
  static async analyzeBasicQuality(db) {
    // Returns: {
    //   totalRecipes: number,
    //   cleanRecipes: number,
    //   cleanPercentage: number,
    //   issues: { critical, high, medium, low },
    //   summary: string,
    //   analysisTimeMs: number
    // }
  }
}

```

### Admin API Endpoint

Located in: `app/admin/admin_handlers/system_status.js`

```javascript
async function getDatabaseHealth() {
  // Performs fresh health check with quality analysis
  // Returns stats: {
  //   totalRecipes,
  //   cleanRecipes,
  //   dataQualityPercentage,
  //   environment,
  //   dbName,
  //   lastChecked
  // }
}

```

### Frontend Component

Located in: `ui/src/pages/DataQualityPage.tsx`

React component displaying comprehensive data quality dashboard with:

- Real-time quality metrics

- Visual grade display (A-F)

- Recipe statistics breakdown

- Quality criteria reference

- Context-sensitive recommendations

## Future Enhancements

### Potential Additions

1. **Recipe-Level Quality Reports** - Drill down to individual recipes with issues
2. **Quality Trends** - Track quality improvements over time
3. **Bulk Fix Tools** - Admin tools to fix common issues across multiple recipes
4. **Quality Badges** - Display quality indicators on recipe detail pages
5. **User Notifications** - Alert recipe owners about quality issues
6. **AI-Assisted Completion** - Use AI to suggest missing information
7. **Import Validation** - Check quality during recipe import/migration

### Monitoring Improvements

1. **Historical Tracking** - Store quality metrics over time
2. **Alert Integration** - CloudWatch alarms for quality degradation
3. **Quality Reports** - Scheduled email reports for admins
4. **Comparative Analytics** - Compare quality across user segments

## Related Documentation

- [Health Check System](../app/health/README.md)

- [System Status Admin Handler](../app/admin/admin_handlers/system_status.js)

- [Admin Panel Guide](./user/admin-panel.md)

- [Database Health Monitoring](./technical/database-health.md)

## Change Log

- **2025-01-XX**: Initial data quality standards documentation

- **2025-01-XX**: Data Quality Dashboard implemented and deployed
