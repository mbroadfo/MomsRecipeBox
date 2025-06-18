-- Recipe Lifecycle Test
-- This test creates a recipe, modifies it through various states, and then cleans up

\echo '========================================='
\echo 'Starting Recipe Lifecycle Test...'
\echo '========================================='

DO $$
DECLARE
    v_recipe_id INTEGER;
    v_count INTEGER;
BEGIN
    RAISE NOTICE 'Step 1: Creating recipe in DRAFT state...';
    
    -- Create Recipe in DRAFT state
    INSERT INTO recipes (title, visibility, status, owner_id)
    VALUES ('PB&J Pizza', 'family', 'draft', 'auth0|test-user')
    RETURNING id INTO v_recipe_id;
    
    RAISE NOTICE '✓ Created recipe with ID: %', v_recipe_id;

    RAISE NOTICE 'Step 2: Adding recipe sections...';
    
    -- Add Sections
    INSERT INTO recipe_sections (recipe_id, section_type, content, position) VALUES
        (v_recipe_id, 'Instructions', 'Prepare the crust', 1),
        (v_recipe_id, 'Instructions', 'Apply toppings', 2);
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✓ Added % recipe sections', v_count;

    RAISE NOTICE 'Step 3: Adding ingredients...';
    
    -- Add Ingredients
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, position) VALUES
        (v_recipe_id, 'Wonder Bread', '2 slices', 1),
        (v_recipe_id, 'Peanut Butter', '2 tbsp', 2),
        (v_recipe_id, 'Jellybeans', '12 pieces', 3),
        (v_recipe_id, 'Rainbow Sprinkles', '1 tsp', 4);
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✓ Added % ingredients', v_count;

    RAISE NOTICE 'Step 4: Publishing recipe and updating ingredients...';
    
    -- Update Recipe to PUBLISHED and update Ingredient
    UPDATE recipes
    SET title = 'Ultimate PB&J Pizza',
        visibility = 'public',
        status = 'published'
    WHERE id = v_recipe_id;
    
    RAISE NOTICE '✓ Updated recipe to PUBLISHED status';

    UPDATE recipe_ingredients
    SET name = 'Grape Jelly', quantity = '1 tbsp'
    WHERE recipe_id = v_recipe_id AND name = 'Jellybeans';
    
    RAISE NOTICE '✓ Updated ingredient: Jellybeans → Grape Jelly';

    RAISE NOTICE 'Step 5: Adding user interactions...';
    
    -- Add Comment
    INSERT INTO comments (recipe_id, author_id, content)
    VALUES (v_recipe_id, 'auth0|test-user', 'Wow! This sounds disgusting.');
    
    RAISE NOTICE '✓ Added comment';

    -- Add Like
    INSERT INTO likes (recipe_id, user_id)
    VALUES (v_recipe_id, 'auth0|test-user');
    
    RAISE NOTICE '✓ Added like';

    RAISE NOTICE 'Step 6: Verifying data integrity...';
    
    -- Verification Counts
    SELECT COUNT(*) INTO v_count FROM recipe_sections WHERE recipe_id = v_recipe_id;
    RAISE NOTICE '✓ Recipe sections: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM recipe_ingredients WHERE recipe_id = v_recipe_id;
    RAISE NOTICE '✓ Recipe ingredients: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM comments WHERE recipe_id = v_recipe_id;
    RAISE NOTICE '✓ Comments: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM likes WHERE recipe_id = v_recipe_id;
    RAISE NOTICE '✓ Likes: %', v_count;

    RAISE NOTICE 'Step 7: Cleaning up test data...';
    
    -- Cleanup (cascading deletes should handle related records)
    DELETE FROM recipes WHERE id = v_recipe_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    IF v_count > 0 THEN
        RAISE NOTICE '✓ Cleaned up recipe and all related data';
    ELSE
        RAISE WARNING '⚠ No recipe found to clean up';
    END IF;

END;
$$;

\echo '========================================='
\echo '✓ Recipe Lifecycle Test Complete!'
\echo '========================================='