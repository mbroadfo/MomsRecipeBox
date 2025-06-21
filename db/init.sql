-- Mom's Recipe Box Database Schema
-- Clean slate initialization

DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS recipe_ingredients CASCADE;
DROP TABLE IF EXISTS recipe_sections CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;

-- Main recipes table
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    owner_id TEXT NOT NULL,
    visibility VARCHAR(20) NOT NULL CHECK (visibility IN ('none', 'family', 'public')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    image_url TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Recipe sections (instructions, notes, etc.)
CREATE TABLE recipe_sections (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    section_type VARCHAR(50) NOT NULL, -- e.g., 'Instructions', 'Notes'
    content TEXT,
    position INTEGER NOT NULL
);

-- Recipe ingredients
CREATE TABLE recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity TEXT,
    position INTEGER NOT NULL
);

-- Comments on recipes
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Recipe likes (user can only like a recipe once)
CREATE TABLE likes (
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    PRIMARY KEY (recipe_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_recipes_owner_id ON recipes(owner_id);
CREATE INDEX idx_recipes_visibility ON recipes(visibility);
CREATE INDEX idx_recipes_status ON recipes(status);
CREATE INDEX idx_recipe_sections_recipe_id ON recipe_sections(recipe_id);
CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_comments_recipe_id ON comments(recipe_id);
CREATE INDEX idx_likes_recipe_id ON likes(recipe_id);

-- Display initialization summary
\echo 'Database initialized successfully!'
