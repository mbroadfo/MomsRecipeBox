# Recipe Detail Image Display Fix

## Commit Message
```
fix: resolve recipe detail image display issues with direct S3 URLs

- Fix ImagePane component to use direct S3 URLs with proper region (us-west-2)
- Update S3 bucket name to correct mrb-recipe-images-dev bucket
- Implement smart extension fallback chain: .png → .jpg → .jpeg → .webp
- Handle existing S3 URLs missing region specification
- Update RecipeCard component for consistency with same S3 URL format
- Remove complex retry logic in favor of simple, reliable fallback mechanism

Resolves issue where recipe detail screens showed default images instead of actual recipe photos.
All recipe images now display correctly in both card view and detail view.
```

## Summary of Changes

### Files Modified:
1. **ui/src/components/recipeDetail/parts/ImagePane.tsx**
   - Updated S3 URL conversion to use correct region and bucket
   - Implemented extension fallback mechanism
   - Added handling for existing S3 URLs with missing region
   - Simplified error handling logic

2. **ui/src/components/RecipeCard.tsx**
   - Updated S3 URLs to use us-west-2 region for consistency
   - Ensured both components use same S3 URL format

### Technical Details:
- **Correct S3 Configuration**: `https://mrb-recipe-images-dev.s3.us-west-2.amazonaws.com`
- **Smart Fallbacks**: Automatically tries different image formats when one fails
- **API URL Conversion**: Converts `/api/recipes/{id}/image` to direct S3 URLs
- **Region Fix**: Handles existing URLs missing region specification

### Impact:
- ✅ Recipe detail images now display correctly for all recipes
- ✅ Improved performance with direct S3 access (no backend proxy)
- ✅ Robust fallback system handles different image formats
- ✅ Consistent image handling across recipe cards and detail views