/**
 * MongoDB Queries to Analyze Recipe Images
 * 
 * Run these queries in MongoDB Compass, mongo shell, or mongosh
 * Database: moms_recipe_box
 */

// 1. Get all recipe IDs (these should have corresponding images)
db.recipes.find({}, {_id: 1}).limit(10)

// 2. Count total recipes
db.recipes.countDocuments()

// 3. Get recipe IDs as a list (copy this output to compare with S3 filenames)
db.recipes.distinct("_id").map(id => id.toString())

// 4. Check for recipes that might have multiple images
// Look for recipes with image arrays or multiple image fields
db.recipes.find({
  $or: [
    { "images": { $exists: true, $type: "array" } },
    { "image": { $exists: true } },
    { "imageUrl": { $exists: true } },
    { "photo": { $exists: true } },
    { "picture": { $exists: true } }
  ]
}, { _id: 1, images: 1, image: 1, imageUrl: 1, photo: 1, picture: 1 })

// 5. Sample recipes to see their structure
db.recipes.find({}).limit(5)

// 6. Check if there are any deleted recipes (soft deletes)
db.recipes.find({ deleted: true })
db.recipes.find({ active: false })
db.recipes.find({ status: "deleted" })

// 7. Look for recipes with specific image naming patterns
db.recipes.aggregate([
  {
    $project: {
      _id: 1,
      hasImage: { $ne: ["$image", null] },
      hasImages: { $ne: ["$images", null] },
      imageField: "$image",
      imagesField: "$images"
    }
  },
  {
    $match: {
      $or: [
        { hasImage: true },
        { hasImages: true }
      ]
    }
  }
])

/*
EXPECTED S3 IMAGE FILENAME PATTERNS:
- {recipeId}.jpg
- {recipeId}.jpeg  
- {recipeId}.png
- {recipeId}_1.jpg (multiple images)
- {recipeId}_2.jpg
- {recipeId}-thumb.jpg (thumbnails)
- {recipeId}-small.jpg
- {recipeId}-medium.jpg
- {recipeId}-large.jpg

If you have 38 recipes but 68 images, possible explanations:
1. Multiple images per recipe (thumbnails, different sizes)
2. Orphaned images from deleted recipes
3. Images uploaded but recipes never created
4. Test images that don't correspond to recipes
*/