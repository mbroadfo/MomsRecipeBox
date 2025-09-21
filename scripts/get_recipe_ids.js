// MongoDB Query to get all recipe IDs
// Run this in MongoDB Compass or mongosh

// 1. Get all recipe IDs as strings
db.recipes.distinct("_id").map(id => id.toString())

// 2. Count recipes to verify
db.recipes.countDocuments()

// 3. Get recipe IDs in a format easy to compare with the image list above
db.recipes.find({}, {_id: 1}).toArray().map(doc => doc._id.toString()).sort()

/* 
ORPHANED IMAGE ANALYSIS:
Compare the recipe IDs returned by the query above with the image filenames from the PowerShell script.

Any image filename that starts with a 24-character hex string NOT in your recipe list 
is an orphaned image that can be safely deleted.

COMMON ORPHAN CAUSES:
1. Recipes were deleted but images weren't cleaned up
2. Image upload succeeded but recipe creation failed
3. Test recipes that were removed
4. Recipe IDs changed during data migration

TO DELETE ORPHANED IMAGES:
Once you identify the orphaned image filenames, use:
aws s3 rm s3://mrb-recipe-images-dev/FILENAME

BATCH DELETE:
Create a file with orphaned filenames and use:
aws s3api delete-objects --bucket mrb-recipe-images-dev --delete file://delete-list.json
*/