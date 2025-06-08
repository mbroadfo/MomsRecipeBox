CREATE OR REPLACE PROCEDURE test_recipe_lifecycle()
LANGUAGE plpgsql
AS $$
DECLARE
    v_recipe_id INTEGER;
BEGIN
    -- Create Recipe in DRAFT state
    INSERT INTO recipes (title, visibility, status, owner_id)
    VALUES ('PB&J Pizza', 'family', 'draft', 'auth0|test-user')
    RETURNING id INTO v_recipe_id;

    -- Add Sections
    INSERT INTO recipe_sections (recipe_id, section_type, content, position) VALUES
        (v_recipe_id, 'Instructions', 'Prepare the crust', 1),
        (v_recipe_id, 'Instructions', 'Apply toppings', 2);

    -- Add Ingredients
    INSERT INTO recipe_ingredients (recipe_id, name, quantity, position) VALUES
        (v_recipe_id, 'Wonder Bread', '2 slices', 1),
        (v_recipe_id, 'Peanut Butter', '2 tbsp', 2),
        (v_recipe_id, 'Jellybeans', '12 pieces', 3),
        (v_recipe_id, 'Rainbow Sprinkles', '1 tsp', 4);

    -- Update Recipe to PUBLISHED and update Ingredient
    UPDATE recipes
    SET title = 'Ultimate PB&J Pizza',
        visibility = 'public',
        status = 'published'
    WHERE id = v_recipe_id;

    UPDATE recipe_ingredients
    SET name = 'Grape Jelly', quantity = '1 tbsp'
    WHERE recipe_id = v_recipe_id AND name = 'Jellybeans';

    -- Add Comment
    INSERT INTO comments (recipe_id, author_id, content)
    VALUES (v_recipe_id, 'auth0|test-user', 'Wow! This sounds disgusting.');

    -- Add Like
    INSERT INTO likes (recipe_id, user_id)
    VALUES (v_recipe_id, 'auth0|test-user');

    -- Verification (Raise Notices)
    RAISE NOTICE 'Recipe: %', (SELECT row_to_json(r) FROM recipes r WHERE id = v_recipe_id);
    RAISE NOTICE 'Sections: %', (SELECT json_agg(s) FROM recipe_sections s WHERE recipe_id = v_recipe_id);
    RAISE NOTICE 'Ingredients: %', (SELECT json_agg(i) FROM recipe_ingredients i WHERE recipe_id = v_recipe_id);
    RAISE NOTICE 'Comments: %', (SELECT json_agg(c) FROM comments c WHERE recipe_id = v_recipe_id);
    RAISE NOTICE 'Likes: %', (SELECT json_agg(l) FROM likes l WHERE recipe_id = v_recipe_id);

    -- Cleanup
    DELETE FROM recipes WHERE id = v_recipe_id;

    RAISE NOTICE 'Test complete: all data cleaned.';
END;
$$;
