-- Recipe Lifecycle Test
-- This test creates a recipe, modifies it through various states, and then cleans up

SELECT '=========================================' AS '';
SELECT 'Starting Recipe Lifecycle Test...' AS '';
SELECT '=========================================' AS '';

-- Step 1: Create Recipe in DRAFT state
SELECT 'Step 1: Creating recipe in DRAFT state...' AS '';

INSERT INTO recipes (title, visibility, status, owner_id)
VALUES ('PB&J Pizza', 'family', 'draft', 'auth0|test-user');

SET @recipe_id = LAST_INSERT_ID();
SELECT CONCAT('✓ Created recipe with ID: ', @recipe_id) AS '';

-- Step 2: Add Sections
SELECT 'Step 2: Adding recipe sections...' AS '';

INSERT INTO recipe_sections (recipe_id, section_type, content, position) VALUES
    (@recipe_id, 'Instructions', 'Prepare the crust', 1),
    (@recipe_id, 'Instructions', 'Apply toppings', 2);

SELECT ROW_COUNT() AS '✓ Added recipe sections';

-- Step 3: Add Ingredients
SELECT 'Step 3: Adding ingredients...' AS '';

INSERT INTO recipe_ingredients (recipe_id, name, quantity, position) VALUES
    (@recipe_id, 'Wonder Bread', '2 slices', 1),
    (@recipe_id, 'Peanut Butter', '2 tbsp', 2),
    (@recipe_id, 'Jellybeans', '12 pieces', 3),
    (@recipe_id, 'Rainbow Sprinkles', '1 tsp', 4);

SELECT ROW_COUNT() AS '✓ Added ingredients';

-- Step 4: Publish Recipe and Update Ingredient
SELECT 'Step 4: Publishing recipe and updating ingredients...' AS '';

UPDATE recipes
SET title = 'Ultimate PB&J Pizza',
    visibility = 'public',
    status = 'published'
WHERE id = @recipe_id;

SELECT '✓ Updated recipe to PUBLISHED status' AS '';

UPDATE recipe_ingredients
SET name = 'Grape Jelly', quantity = '1 tbsp'
WHERE recipe_id = @recipe_id AND name = 'Jellybeans';

SELECT '✓ Updated ingredient: Jellybeans → Grape Jelly' AS '';

-- Step 5: Add Interactions
SELECT 'Step 5: Adding user interactions...' AS '';

INSERT INTO comments (recipe_id, author_id, content)
VALUES (@recipe_id, 'auth0|test-user', 'Wow! This sounds disgusting.');

INSERT INTO likes (recipe_id, user_id)
VALUES (@recipe_id, 'auth0|test-user');

SELECT '✓ Added comment and like' AS '';

-- Step 6: Verify Counts
SELECT 'Step 6: Verifying data integrity...' AS '';

SELECT COUNT(*) AS '✓ Recipe sections' FROM recipe_sections WHERE recipe_id = @recipe_id;
SELECT COUNT(*) AS '✓ Recipe ingredients' FROM recipe_ingredients WHERE recipe_id = @recipe_id;
SELECT COUNT(*) AS '✓ Comments' FROM comments WHERE recipe_id = @recipe_id;
SELECT COUNT(*) AS '✓ Likes' FROM likes WHERE recipe_id = @recipe_id;

-- Step 7: Cleanup
SELECT 'Step 7: Cleaning up test data...' AS '';

DELETE FROM recipes WHERE id = @recipe_id;

IF ROW_COUNT() > 0 THEN
  SELECT '✓ Cleaned up recipe and all related data' AS '';
ELSE
  SELECT '⚠ No recipe found to clean up' AS '';
END IF;

SELECT '=========================================' AS '';
SELECT '✓ Recipe Lifecycle Test Complete!' AS '';
SELECT '=========================================' AS '';
