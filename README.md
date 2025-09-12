# MomsRecipeBox

A secure, multi-family recipe sharing platform with a modular architecture: infrastructure (Terraform), backend API (Node.js + MongoDB), and modern React frontend with comprehensive admin monitoring.

## 🎛️ Enhanced Admin Dashboard

**New Feature**: Comprehensive admin dashboard with real-time monitoring of AI services and infrastructure components:

- **AI Services Monitoring**: Real-time status of 5 AI providers (OpenAI, Google Gemini, Anthropic, Groq, DeepSeek) with performance metrics
- **Infrastructure Monitoring**: 8-service comprehensive monitoring including MongoDB, S3, API Gateway, Lambda, Backup System, Terraform state, Security/SSL, and Performance/CDN  
- **Compact Design**: Ultra-efficient layout with 30px element heights for maximum information density
- **Real-time Testing**: Individual service testing capabilities with instant status updates
- **Smart Metrics**: Real API data integration with "Coming Soon!" placeholders for pending metrics

### Admin API Endpoints

| Method | Endpoint                        | Description                               |
| ------ | ------------------------------- | ----------------------------------------- |
| GET    | /admin/system-status            | Comprehensive infrastructure monitoring   |
| GET    | /admin/ai-services-status       | AI provider status and performance       |
| GET    | /admin/users                    | User management and statistics           |
| POST   | /admin/users/invite             | Invite new users to the platform        |
| DELETE | /admin/users/:id                | Remove users from the platform          |

---

## 🤖 AI Recipe Assistant

The platform now includes a sophisticated AI-powered recipe assistant that can help you create, modify, and extract recipes:

| Method | Endpoint                        | Description                               |
| ------ | ------------------------------- | ----------------------------------------- |

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

## 🛡️ Database Backup & Restore

Your family recipes and user data are now protected with a comprehensive backup and restore system:

### Quick Backup Operations

```powershell
# Create a backup
.\scripts\backup\backup-simple.ps1 -Operation backup

# Check backup status
.\scripts\backup\backup-simple.ps1 -Operation status

# Restore from backup (requires confirmation)
.\scripts\backup\restore-simple.ps1 -BackupPath ".\backups\backup_2025-09-09_09-07-12"

# Force restore without confirmation (use carefully!)
.\scripts\backup\restore-simple.ps1 -BackupPath ".\backups\backup_2025-09-09_09-07-12" -Force
```

### Backup Strategy

- **What's Backed Up**: All collections (recipes, favorites, comments, shopping_lists, users)
- **Backup Format**: MongoDB BSON dumps with metadata
- **Storage Location**: `.\backups\` directory
- **Retention**: Manual management (delete old backups as needed)

### Advanced Backup Features

For enterprise-grade backup management, see the comprehensive backup system in `scripts\backup\`:

- **Scheduled Backups**: Automated daily/incremental backups
- **Compressed Archives**: Space-efficient storage
- **Integrity Verification**: Automatic backup validation
- **Cloud Sync**: Optional cloud storage integration
- **Disaster Recovery**: Complete restoration procedures

**Quick Start Guide**: `scripts\backup\QUICKSTART.md`  
**Full Documentation**: `scripts\backup\README.md`

### Emergency Recovery

1. **List available backups**: `.\scripts\backup\backup-simple.ps1 -Operation status`
2. **Stop the application**: `docker compose down`
3. **Restore database**: `.\scripts\backup\restore-simple.ps1 -BackupPath "PATH_TO_BACKUP" -Force`
4. **Restart application**: `docker compose up -d`

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

## 🏥 Health Monitoring & Data Quality

The application includes a comprehensive health monitoring system with embedded data quality analysis:

### Health Check System

- **🚀 Startup Health Checks**: Automatic quality analysis during application startup
- **📊 Data Quality Integration**: Real-time monitoring of recipe data quality metrics
- **🌐 HTTP Health Endpoints**: REST API endpoints for external monitoring
- **⚙️ Configurable Thresholds**: Customizable health criteria and quality standards
- **🚨 Graceful Degradation**: Continues operation with warnings when possible

### Health Endpoints

| Endpoint | Purpose | Use Case |
|----------|---------|----------|
| `/health` | Basic status | Load balancer health checks |
| `/health/detailed` | Full component breakdown | Troubleshooting and monitoring |
| `/health/history` | Health check history | Trend analysis |
| `/health/live` | Liveness probe | Container orchestration |
| `/health/ready` | Readiness probe | Traffic routing decisions |

### Database Tools

Comprehensive database management tools for maintaining data quality:

```powershell
# Analyze database quality
npm run db:analyze

# Analyze field usage patterns  
npm run db:fields

# Clean database (apply auto-fixes)
npm run db:clean-apply

# Preview cleanup changes
npm run db:clean-preview
```

### Database Tools Features

- **📊 Quality Analysis**: Comprehensive analysis of recipe data quality with detailed reporting
- **🔧 Auto-Cleanup**: Automatic fixing of common data quality issues (standardization, formatting, etc.)
- **📈 Field Analysis**: Analysis of field usage patterns and data distribution
- **⚠️ Issue Detection**: Identification of critical, high, medium, and low priority data issues
- **🛡️ Safe Operations**: Preview mode for reviewing changes before applying
- **📝 Detailed Reporting**: Comprehensive reports with actionable recommendations

The health system provides enterprise-grade monitoring capabilities and ensures data quality is maintained as the application scales.

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

The application now features a powerful AI-powered recipe assistant with **multiple provider support** for reliability and flexibility:

- **Multi-Provider Architecture**: Supports OpenAI, Google Gemini, Groq, Anthropic Claude, and DeepSeek APIs with automatic fallback
- **Centralized Recipe Instructions**: All providers use identical system messages for consistent recipe formatting
- **Auto Provider Selection**: Intelligent provider selection based on API key availability and rate limiting
- **Chat Interface**: Natural language conversation with AI to build recipes from scratch
- **URL Extraction**: Paste a recipe URL to automatically extract ingredients, instructions, and metadata
- **Image Extraction**: Automatically downloads and associates recipe images from websites with intelligent image selection
- **Streamlined UI Position**: Chat interface positioned below the image for better user experience
- **Structured Output**: AI parses conversation into structured recipe format ready for the form
- **Interactive Refinement**: Users can refine recipe details through conversation
- **Seamless Integration**: Works within the Add Recipe flow with toggle visibility
- **Smart Recognition**: Automatically detects and extracts recipe components from text
- **Context Aware**: Maintains conversation history for refining recipe details
- **Full Recipe Support**: Creates all aspects including title, subtitle, description, ingredients, instructions, notes, tags, and nutrition
- **One-Click Creation**: Create recipes directly from the chat interface without manual form entry
- **Ingredient-Based Suggestions**: Suggest recipes based on available ingredients
- **Automatic Categorization**: Intelligently categorizes ingredients for shopping lists
- **Robust Error Handling**: Graceful handling of API rate limits and temporary service disruptions

### AI Provider Architecture

The system features a modular AI provider architecture with:

- **Provider Factory**: Centralized management of multiple AI providers with automatic selection
- **Base Provider Class**: Shared functionality and standardized recipe formatting across all providers
- **Rate Limit Management**: Intelligent tracking of provider rate limits with automatic fallback
- **Unified API**: Consistent interface regardless of which AI provider is actually used
- **Environment-Based Selection**: Providers are enabled based on available API keys

### Supported AI Providers

| Provider | Model | Features | Status |
|----------|-------|----------|--------|
| **Google Gemini** | gemini-1.5-flash | Primary provider, excellent at recipe extraction | ✅ Active |
| **OpenAI** | gpt-3.5-turbo | Reliable fallback, good conversation flow | ✅ Active |
| **Groq** | llama-3.1-8b-instant | Fast responses, good for quick extractions | ✅ Active |
| **Anthropic Claude** | claude-3-haiku-20240307 | High-quality responses, good reasoning | ✅ Active |
| **DeepSeek** | deepseek-chat | Cost-effective option, good performance | ✅ Active |

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
