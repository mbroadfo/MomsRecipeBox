-- Create tables only if they don't exist
CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    visibility TEXT NOT NULL DEFAULT 'family'
);

CREATE TABLE IF NOT EXISTS recipe_sections (
    id SERIAL PRIMARY KEY,
    recipe_id INT REFERENCES recipes(id),
    title TEXT
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id SERIAL PRIMARY KEY,
    section_id INT REFERENCES recipe_sections(id),
    name TEXT,
    quantity TEXT
);

CREATE TABLE IF NOT EXISTS likes (
    id SERIAL PRIMARY KEY,
    recipe_id INT REFERENCES recipes(id),
    user_id TEXT
);

CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    recipe_id INT REFERENCES recipes(id),
    user_id TEXT,
    content TEXT
);
