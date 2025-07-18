-- Insert recipe and capture the ID using LAST_INSERT_ID
INSERT INTO recipes (owner_id, visibility, status, title, subtitle, description, tags)
VALUES (
    'auth0|test-user',
    'family',
    'published',
    'Creamy Mushroom Soup',
    'Deliciously rich and creamy mushroom soup',
    'Perfect for cold winter nights or an easy thermos lunch!',
    JSON_ARRAY('soup', 'winter', 'comfort food')
);

SET @recipe_id = LAST_INSERT_ID();

-- Insert instructions
INSERT INTO recipe_sections (recipe_id, section_type, content, position) VALUES
    (@recipe_id, 'Instructions', 'Wash the mushrooms and mince the garlic.', 1),
    (@recipe_id, 'Instructions', 'Sauté mushrooms in olive oil with salt and pepper until browned.', 2),
    (@recipe_id, 'Instructions', 'Add garlic and cook for one more minute.', 3),
    (@recipe_id, 'Instructions', 'Add butter and flour, stir until golden.', 4),
    (@recipe_id, 'Instructions', 'Add broth, soy sauce, thyme; simmer until thickened.', 5),
    (@recipe_id, 'Instructions', 'Stir in cream and season to taste. Serve hot.', 6);

-- Insert ingredients
INSERT INTO recipe_ingredients (recipe_id, name, quantity, position) VALUES
    (@recipe_id, 'Baby bella mushrooms', '1 lb', 1),
    (@recipe_id, 'Garlic, minced', '3 cloves', 2),
    (@recipe_id, 'Olive oil', '1 Tbsp', 3),
    (@recipe_id, 'Salt & pepper', '1 pinch', 4),
    (@recipe_id, 'Butter', '4 Tbsp', 5),
    (@recipe_id, 'All-purpose flour', '1/4 cup', 6),
    (@recipe_id, 'Vegetable broth', '3 cups', 7),
    (@recipe_id, 'Soy sauce', '1 tsp', 8),
    (@recipe_id, 'Dried thyme', '1/8 tsp', 9),
    (@recipe_id, 'Heavy cream', '1/2 cup', 10);

-- Insert optional metadata sections
INSERT INTO recipe_sections (recipe_id, section_type, content, position) VALUES
    (@recipe_id, 'Timing', 'Prep: 5 min\nCook: 30 min\nTotal: 35 min', 7),
    (@recipe_id, 'Stats', 'Course: Soup\nCuisine: American\nServings: 4 (1 cup each)\nCost: $6.82 total / $1.71 per serving', 8),
    (@recipe_id, 'Nutrition', 'Calories: 299 kcal\nCarbs: 15g\nProtein: 5g\nFat: 26g\nSodium: 904mg\nFiber: 1g', 9);
