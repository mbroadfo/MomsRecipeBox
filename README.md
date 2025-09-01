# MomsRecipeBox

A secure, multi-family recipe sharing platform with a modular architecture: infrastru| POST   | /ai/chat                    | Chat with AI to create or modify recipes  |
| POST   | /ai/extract                  | Extract structured recipe data from URL   |
| POST   | /ai/create-recipe            | Create recipe directly from AI conversation  |ure (Terraform), backend A## 🔒 Upcoming / TODO

- Add additional shopping list features like recipe suggestions and historical tracking
- Enhance the Node.js Lambda-style + MongoDB backend with more features
- Continue improving the modern React/Vite UI and supporting automation scripts

---

## 📦 Architecture Overview

| Tier         | Local Development                      | Cloud Deployment (Infra/Terraform)        |
| ------------ | -------------------------------------- | ----------------------------------------- |
| Database     | MongoDB (Docker Compose)               | Aurora / (Future: DocumentDB or Atlas)    |
| App Backend  | Node.js 18 (Lambda-style in container) | AWS Lambda (container image) + API GW     |
| Web Frontend | React 19 + Vite (dev server)           | S3 (static hosting) + CloudFront          |
| Images       | Local FS / S3 mock (future)            | S3 bucket (recipe images)                 |
| Favorites    | MongoDB `favorites` collection         | Managed DB (same)                         |

---

## ⭐ New: Favorites (Likes) Model

Recent changes introduced a scalable favorites system:

- Separate `favorites` collection with documents: `{ _id, recipeId: ObjectId, userId: string, createdAt }`.
- Denormalized `likes_count` integer on each `recipes` document (created at 0, atomically $inc on toggle).
- Endpoint: `POST /recipes/:id/like` now handled by `toggle_favorite.js` returning `{ liked, likes }`.
- Old embedded `likes` array & handler `post_like.js` are deprecated (left temporarily for reference).
- `get_recipe.js` now injects `likes_count` (and placeholder `liked: false` until auth context added).

Benefits: O(1) toggle, indexable queries (e.g., user favorites), race-safe up/down counts, avoids unbounded array growth in recipe documents.

---

## ⚡ Quick Start (Local)

```powershell
# Start MongoDB + API container
docker compose up -d

# (Optional) rebuild after backend code changes
docker compose build --no-cache app; docker compose up -d app
```

API exposed at `http://localhost:3000`.

---

## 🗂 Repo Structure (High-Level)

```text
/infra        Terraform IaC (RDS/Aurora, S3, Lambdas, etc.)
/db           Seed scripts & JSON recipe fixtures (MongoDB)
/app          Backend API (handlers, lambda-style router, tests)
/ui           React/Vite frontend (editing & viewing recipes)
/scripts      PowerShell helper scripts / automation
```

---

## 🧪 Testing

Backend end-to-end tests live in `app/tests` and use native `fetch` + `assert`:

- `test_recipes.js` – CRUD & comment lifecycle
- `test_images.js` – Image upload/update/delete lifecycle
- `test_favorites.js` – Multi-user favorite (like) toggle & count validation
- `test_shopping_list.js` – Shopping list operations & validation (NEW)

Run:

```powershell
cd app/tests
npm install   # first time
node test_shopping_list.js  # Run just shopping list tests
npm test      # runs all tests
```

---

## 🔌 Key Backend Endpoints (Excerpt)

| Method | Route                       | Description                                |
| ------ | --------------------------- | ------------------------------------------ |
| GET    | /recipes                    | List recipes                               |
| POST   | /recipes                    | Create recipe (`likes_count` starts at 0)  |
| GET    | /recipes/{id}               | Get recipe (includes `likes_count`)        |
| POST   | /recipes/{id}/like          | Toggle favorite (returns `{ liked, likes }`)|
| PUT    | /recipes/{id}               | Update recipe                              |
| DELETE | /recipes/{id}               | Delete recipe                              |
| POST   | /recipes/{id}/comments      | Add comment                                |
| PUT    | /comments/{id}              | Update comment                             |
| DELETE | /comments/{id}              | Delete comment                             |
| GET    | /recipes/{id}/image         | Get recipe image (with cache control)      |
| PUT    | /recipes/{id}/image         | Upload/update image (multipart & base64) with proper S3 metadata |
| DELETE | /recipes/{id}/image         | Delete recipe image                        |
| POST   | /recipes/{id}/copy-image    | Copy image between recipe IDs              |
| GET    | /shopping-list              | Get user's shopping list                   |
| POST   | /shopping-list/add          | Add items to shopping list                 |
| PUT    | /shopping-list/item/{id}    | Update shopping list item                  |
| DELETE | /shopping-list/item/{id}    | Delete shopping list item                  |
| POST   | /shopping-list/clear        | Clear shopping list or mark all as checked |
| POST   | /ai/chat                    | Chat with AI to create or modify recipes  |
| POST   | /ai/extract                 | Extract structured recipe data from URL   |

---

## 🖥 Frontend Highlights

- Consistent header shared across all pages with modern styling.
- Sticky header and toolbar for easy access to navigation and filtering while scrolling.
- Segmented toolbar for filtering and sorting recipes, replacing the traditional sidebar.
- "Back to List" navigation that consistently returns to the recipe list.
- Optimistic like updates calling new `/recipes/:id/like` endpoint.
- Real-time image updates with automatic cache busting for instant visibility after upload.
- Lightweight instruction headers (`#Heading`) & ingredient group labels (blank name row technique).
- Custom drag & drop reordering without external DnD libs.

---

## 🎨 Modern UI Enhancements

Recent UI improvements create a more intuitive and efficient user experience:

- **Consistent Header**: Standardized header design across all pages with logo, title, and user avatar
- **Sticky Navigation**: Header and toolbar remain visible when scrolling for easy access to navigation
- **Segmented Toolbar**: Replaced traditional sidebar with a streamlined toolbar containing:
  - Recipe filtering options (All, My Recipes, My Family's, My Favorites)
  - Custom sorting options (Newest, Most Popular, Most Favorited, A-Z)
  - Quick access buttons for Add Recipe and Shopping List
- **Responsive Toolbar**: Adapts to different screen sizes with appropriate layout changes
- **Improved Font Handling**: Consistent typography with proper scaling across the application
- **Visual Hierarchy**: Clear separation between navigation elements and content
- **Smooth Transitions**: Subtle animations for interactive elements

## 🛒 Interactive Ingredients & Shopping List

New ingredient functionality enhances the recipe detail view:

- **Checkboxes**: Replaced bullet points with interactive checkboxes for each ingredient
- **State Persistence**: Checked ingredient states are saved to localStorage and persist across page refreshes
- **Professional Button Bar**: Four-button control panel for ingredient management:
  - **Select All**: Quickly check all ingredients in the recipe
  - **Clear All**: Uncheck all ingredients at once
  - **Add Selected to Shopping List**: Add checked ingredients to shopping list
  - **Go to Shopping List**: Navigate to shopping list page
- **Visual Feedback**: Checked ingredients show with strike-through text and animated checkmarks
- **Responsive Design**: Button bar adapts to all screen sizes with horizontal scrolling on mobile

The shopping list feature is fully implemented with an enhanced user interface:

- **Per-user Storage**: Shopping lists are stored per user with MongoDB
- **Recipe Context**: Each item maintains a link to its source recipe
- **Item Status**: Track whether items have been checked off
- **Bulk Operations**: Add multiple items at once, clear all, or clear purchased items
- **Field Compatibility**: Support for both naming conventions (`ingredient`/`name`, `recipe_id`/`recipeId`) ensuring frontend/backend compatibility
- **Data Normalization**: Automatic field mapping to ensure items display correctly regardless of how they were stored

### Shopping List UI Enhancements

The shopping list interface now features:

- **Dual View Modes**: Toggle between organizing items "By Recipe" or "By Category"
- **AI-Powered Categorization**: Intelligent grouping of items into grocery store categories
- **Clear All Button**: Always visible at the top for easy access
- **Purchased Items Section**: Items checked off appear in a dedicated "Purchased Items" section below unpurchased items
- **Clear Purchased Button**: Dedicated button above purchased items to remove only checked items
- **Collapsible Groups**: Expandable/collapsible recipe and category groups for better organization
- **Responsive Design**: Optimized layout for both desktop and mobile devices
- **Simplified Item Management**: Clean interface with checkbox toggles for purchased state

This feature creates a more interactive cooking experience with shopping list functionality that syncs across devices and provides an efficient shopping experience.

## 🧠 AI Recipe Assistant

The application now features an AI-powered recipe assistant that helps users create recipes:

- **Chat Interface**: Natural language conversation with AI to build recipes from scratch
- **URL Extraction**: Paste a recipe URL to automatically extract ingredients, instructions, and metadata
- **Image Extraction**: Automatically downloads and associates recipe images from websites with intelligent image selection
- **Streamlined UI Position**: Chat interface positioned below the image for better user experience
- **Structured Output**: AI parses conversation into structured recipe format ready for the form
- **Interactive Refinement**: Users can refine recipe details through conversation
- **Seamless Integration**: Works within the Add Recipe flow with toggle visibility
- **Smart Recognition**: Automatically detects and extracts recipe components from text
- **Context Aware**: Maintains conversation history for refining recipe details
- **Full Recipe Support**: Creates all aspects including title, description, ingredients, instructions, and metadata
- **One-Click Creation**: Create recipes directly from the chat interface without manual form entry
- **Ingredient-Based Suggestions**: Suggest recipes based on available ingredients
- **Automatic Categorization**: Intelligently categorizes ingredients for shopping lists
- **Robust Error Handling**: Graceful handling of API rate limits and temporary service disruptions

The AI Recipe Assistant provides an intuitive way to quickly add recipes to the system either by:

1. Extracting recipe data automatically from URLs with image detection and processing
2. Processing copy/pasted content directly from recipe websites
3. Creating recipes from scratch through natural language conversation
4. Suggesting recipes based on available ingredients
5. Refining existing recipes with AI-powered suggestions
6. Direct creation without form-filling through conversation
7. Automatic image extraction, download, and association with new recipes

This feature significantly streamlines the recipe creation process and makes it more accessible to all users, reducing the effort required to add new recipes by up to 90%. The improved UI positioning of the chat interface below the image creates a more intuitive workflow for recipe creation.

---

## 🔒 Upcoming / TODO

- Derive `userId` for favorites from Auth0 token (currently passed explicitly in tests / demo)
- Surface `likes_count` & per-user `liked` state in recipe list & detail (UI shows only heart state now)
- Clean removal of deprecated `post_like.js` after full migration
- Favorites listing endpoint (`GET /users/{id}/favorites`) & filtering
- Add more robust image format handling and resizing options
- Improve image metadata handling in database
- Standardize field naming conventions between frontend and backend

---

## ☁️ Cloud Mode

Terraform modules (in `infra/`) provision AWS resources (Aurora, S3, Lambda, etc.). Adjust variables in `Terraform.tfvars`. Bastion / Session Manager support for secure DB connectivity (see infra README details).

---

## 🛠 Contributing

1. Add or modify handlers under `/app/handlers` (return `{ statusCode, body }`).
2. Update `docs/swagger.yaml` (OpenAPI spec) for new/changed endpoints.
3. Add tests in `/app/tests` (name `test_*.js`).
4. Reflect data model changes here and in tier-specific READMEs.

---

## 📄 License

(Add project license here.)

---

## ✨ Key Features

- **Recipe Management**: Full CRUD operations with a rich editing interface.
- **AI Recipe Creator**: Intelligent assistant to build recipes from URLs or user prompts.
- **Image Handling**: Upload, retrieve, update, and delete images with instant feedback.
- **Favorites/Likes**: Toggle favorite status with optimistic UI updates and proper database storage.
- **Interactive Ingredients**: Checkboxes for ingredients with shopping list functionality.
- **Shopping List**: Enhanced shopping list with recipe/category organization, AI categorization, and purchased items tracking.
- **Comments**: Add, update, delete, and retrieve comments on recipes.
- **Modern UI**: Consistent header, sticky navigation elements, and segmented toolbar for filtering recipes.
- **Navigation**: Consistent "Back to List" navigation throughout the application.
- **Responsive Design**: Works across desktop and mobile devices with appropriate layouts and fixed elements.
- **Real-time UI Updates**: Immediate visual feedback for all user actions including image uploads.
