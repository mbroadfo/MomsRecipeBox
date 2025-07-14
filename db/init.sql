-- Mom's Recipe Box Database Schema for MySQL
-- Clean slate initialization

DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS likes;
DROP TABLE IF EXISTS recipe_ingredients;
DROP TABLE IF EXISTS recipe_sections;
DROP TABLE IF EXISTS recipes;

-- Main recipes table
CREATE TABLE recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id VARCHAR(255) NOT NULL,
    visibility ENUM('none', 'family', 'public') NOT NULL,
    status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    image_url TEXT,
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipe sections (instructions, notes, etc.)
CREATE TABLE recipe_sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    section_type VARCHAR(50) NOT NULL,
    content TEXT,
    position INT NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- Recipe ingredients
CREATE TABLE recipe_ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    name TEXT NOT NULL,
    quantity TEXT,
    position INT NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- Comments on recipes
CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    author_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- Recipe likes (user can only like a recipe once)
CREATE TABLE likes (
    recipe_id INT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    PRIMARY KEY (recipe_id, user_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_recipes_owner_id ON recipes(owner_id);
CREATE INDEX idx_recipes_visibility ON recipes(visibility);
CREATE INDEX idx_recipes_status ON recipes(status);
CREATE INDEX idx_recipe_sections_recipe_id ON recipe_sections(recipe_id);
CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_comments_recipe_id ON comments(recipe_id);
CREATE INDEX idx_likes_recipe_id ON likes(recipe_id);
