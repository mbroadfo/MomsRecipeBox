-- SQL Init Script for Mom's Recipe Box Schema and Seed Data

-- Drop tables if they exist (for idempotent dev use)
DROP TABLE IF EXISTS comments, likes, recipe_sections, recipe_ingredients, recipes CASCADE;

-- Create recipes table
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    owner_id TEXT NOT NULL,
    visibility TEXT CHECK (visibility IN ('none', 'family', 'all')) DEFAULT 'none',
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    image_url TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Recipe sections (instructions, before you begin, etc.)
CREATE TABLE recipe_sections (
    id SERIAL PRIMARY KEY,
    recipe_id INT REFERENCES recipes(id) ON DELETE CASCADE,
    section_type TEXT NOT NULL,
    content TEXT NOT NULL,
    position INT NOT NULL
);

-- Ingredients (structured)
CREATE TABLE recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INT REFERENCES recipes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity TEXT,
    position INT NOT NULL
);

-- Likes
CREATE TABLE likes (
    id SERIAL PRIMARY KEY,
    recipe_id INT REFERENCES recipes(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    liked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Comments
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    recipe_id INT REFERENCES recipes(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    comment TEXT NOT NULL,
    commented_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert a test recipe
INSERT INTO recipes (owner_id, visibility, title, subtitle, description, image_url, tags)
VALUES (
    'auth0|user123', 'family', 'Zarzuela (Spanish Seafood Stew)', 'A rich, classic Catalan dish',
    'Teeming with mussels, squid, shrimp, and cod, this stew balances tomato, saffron, and wine.',
    'https://example.com/image.jpg', ARRAY['Spanish', 'Seafood', 'Stew']
) RETURNING id;

-- Note: Additional INSERTs for sections and ingredients would follow here
