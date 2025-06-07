-- In schema: test
CREATE OR REPLACE PROCEDURE test.test_recipe_lifecycle()
LANGUAGE plpgsql
AS $$
DECLARE
    v_recipe_id UUID;
    v_user_id UUID := gen_random_uuid();
    v_family_id UUID := gen_random_uuid();
    v_comment_id UUID;
BEGIN
    -- Setup user and family
    INSERT INTO families (id, name) VALUES (v_family_id, 'Test Kitchen');
    INSERT INTO users (id, family_id, name, email) VALUES (v_user_id, v_family_id, 'Chef Testy', 'testy@example.com');

    -- Create Recipe
    INSERT INTO recipes (title, visibility, author_id)
    VALUES ('PB&J Pizza', 'Family Only', v_user_id)
    RETURNING id INTO v_recipe_id;

    -- Add Sections and Ingredients
    INSERT INTO recipe_sections (recipe_id, title, "order") VALUES (v_recipe_id, 'Crust', 1);
    INSERT INTO recipe_sections (recipe_id, title, "order") VALUES (v_recipe_id, 'Toppings', 2);

    INSERT INTO recipe_ingredients (recipe_id, section_order, name, quantity, unit) VALUES
        (v_recipe_id, 1, 'Wonder Bread', 2, 'slices'),
        (v_recipe_id, 1, 'Cream Cheese', 1, 'tbsp'),
        (v_recipe_id, 2, 'Peanut Butter', 2, 'tbsp'),
        (v_recipe_id, 2, 'Jellybeans', 12, 'pieces'),
        (v_recipe_id, 2, 'Rainbow Sprinkles', 1, 'tsp');

    -- Update Recipe Title and Ingredient
    UPDATE recipes SET title = 'Ultimate PB&J Pizza', visibility = 'All' WHERE id = v_recipe_id;
    UPDATE recipe_ingredients SET name = 'Grape Jelly', quantity = 1, unit = 'tbsp'
    WHERE name = 'Jellybeans' AND recipe_id = v_recipe_id;

    -- Interactions
    INSERT INTO users (id, family_id, name, email) VALUES (gen_random_uuid(), v_family_id, 'Taste Tester', 'taster@example.com');
    INSERT INTO comments (recipe_id, author_id, content) VALUES (v_recipe_id, v_user_id, 'Wow! This sounds disgusting.') RETURNING id INTO v_comment_id;
    INSERT INTO comments (recipe_id, author_id, content) VALUES (v_recipe_id, v_user_id, 'But also amazing.');
    UPDATE comments SET content = 'Actually, I love it now.' WHERE id = v_comment_id;
    DELETE FROM comments WHERE content LIKE 'But also amazing%';

    INSERT INTO likes (recipe_id, user_id) VALUES (v_recipe_id, v_user_id);
    DELETE FROM likes WHERE recipe_id = v_recipe_id AND user_id = v_user_id;

    -- Verifications (optional debug output)
    RAISE NOTICE 'Recipe: %', (SELECT row_to_json(r) FROM recipes r WHERE id = v_recipe_id);
    RAISE NOTICE 'Ingredients: %', (SELECT json_agg(ri) FROM recipe_ingredients ri WHERE recipe_id = v_recipe_id);
    RAISE NOTICE 'Comments: %', (SELECT json_agg(c) FROM comments c WHERE recipe_id = v_recipe_id);

    -- Cleanup
    DELETE FROM recipes WHERE id = v_recipe_id;
    DELETE FROM users WHERE id = v_user_id;
    DELETE FROM families WHERE id = v_family_id;

    RAISE NOTICE 'Test complete: all data cleaned.';
END;
$$;
