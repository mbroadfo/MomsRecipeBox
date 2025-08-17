# Mom's Recipe Box UI

A React + TypeScript + Vite frontend for browsing, viewing, and editing recipes.

## Key Features

- Modern two-column layout with responsive design
- In-place recipe editing with a user-friendly interface
- Full editing capabilities for all recipe components (title, ingredients, instructions, etc.)
- Recipe favoriting with heart icon toggle
- Image upload and management
- Tag management
- Comments system

## Overview

The application renders recipes with a modern, two-column layout (content + image pane) and a sticky action header. The header contains the recipe title, Edit/Save/Cancel buttons, back navigation, and like controls. It remains visible while the left column scrolls independently.

### Recipe Editing Features

The in-place editing interface allows modification of:

- Recipe title: Editable heading with clear visual indicators when in edit mode
- Subtitle and metadata: Author and source information
- Tags: Add/remove recipe categorization tags
- Yield and preparation time
- Ingredients: Organized list with support for grouping
- Instructions: Step-by-step directions with support for section headers
- Notes: Additional information or tips
- Image: Upload and manage the recipe's main image

### UI Organization Features

Lightweight content grouping is implemented in the UI:

- **Ingredient group labels**: Leave the ingredient name blank and supply a quantity/value (e.g. "SAUCE"). This row renders as an uppercase section label and persists as an empty name + quantity.
- **Instruction headers**: Prefix a line with `#` (e.g. `#Preparation`). Header lines are styled differently and excluded from step numbering.
- **Drag & drop reordering**: Both ingredients and instruction steps can be reordered via a custom ghost-drag list implementation (`ReorderableList`) without external dependencies.

## Tech Stack

- React 19 (functional components + hooks)
- TypeScript (strict)
- Vite (dev + build)
- Tailwind config present (optional); primary styling via custom CSS

## Getting Started

```bash
# Install dependencies
npm install --prefix ui

# Start development server (default: http://localhost:5173)
npm run dev --prefix ui
```

Ensure the backend/API is running (default: `http://localhost:3000`). Configure a Vite proxy if paths differ.

## Build & Preview

```bash
npm run build --prefix ui   # Type check + bundle
npm run preview --prefix ui # Serve production bundle locally
```

## Recipe Interaction Features

### Favorites (Like) Toggle System

The recipe favoriting system uses an optimistic UI approach:

1. User clicks the heart icon → UI immediately updates the liked state
2. A POST request is sent to `/api/recipes/:id/like` with the user ID
3. The response confirms the final state (liked or not)
4. Error handling reverts the optimistic toggle if the API call fails

This approach provides immediate feedback while still ensuring data consistency.

## Project Structure

The UI codebase follows a modular architecture with clear separation of concerns:

```text
ui/
  src/
    components/
      RecipeDetail.tsx                # Public entry point wrapper
      recipeDetail/
        RecipeDetailContainer.tsx     # Main container component managing state
        hooks/
          useRecipe.ts                # Recipe data fetching and refresh
          useWorkingRecipe.ts         # Editing state management
          useImageUpload.ts           # Image upload functionality
        parts/                        # Modular UI components
          Header.tsx                  # Sticky header with title editor and like button
          Tags.tsx                    # Tags management
          Subtitle.tsx                # Recipe subtitle
          Meta.tsx                    # Author and source info
          YieldTime.tsx               # Servings and preparation time
          IngredientsView.tsx         # Ingredients display mode
          IngredientsEditor.tsx       # Ingredients edit mode
          InstructionsView.tsx        # Instructions display mode
          StepsEditor.tsx             # Instructions edit mode
          ReorderableList.tsx         # Drag-and-drop reordering component
          Notes.tsx                   # Recipe notes
          Comments.tsx                # Comments section
          ImagePane.tsx               # Image display and upload
        RecipeDetail.css              # Component-specific styles
    pages/
      HomePage.tsx                    # Main recipe listing page
```

This structure enables easy maintenance and feature development through component isolation.

## Development Environment

The application is configured to work with a local API server by default:

- Default API URL: `http://localhost:3000`
- Default development server: `http://localhost:5173`

You can configure the API endpoint by adjusting the Vite proxy settings in `vite.config.ts` if your backend runs on a different port or host.

## Key Implementation Details

### Recipe Title Editing

The recipe title uses a specialized editing approach:

- In display mode: Shows the title with a gradient text effect
- In edit mode: Uses a contentEditable h1 element with solid color text and visual editing indicators
- Includes special attributes to prevent password manager interference
- Maintains cursor position for natural text editing

### Accessibility Features

- Heart button includes appropriate `aria-label` reflecting state (e.g., "Like recipe" vs "Unlike recipe")
- ContentEditable elements have proper focus management and keyboard navigation
- Form elements use semantic HTML with appropriate ARIA attributes

### Performance Optimizations

- Optimistic UI updates for immediate user feedback
- Efficient re-rendering through focused state updates
- Lazy-loading of recipe content

### Security Considerations

- Input sanitization for user-provided content
- Protection against HTML injection in contentEditable fields
- Server-side validation for all data submissions

## API Integration

The UI interacts with the following API endpoints:

- `GET /api/recipes/:id` - Fetch recipe details
- `PUT /api/recipes/:id` - Update recipe content
- `PUT /api/recipes/:id/image` - Upload/update recipe image
- `POST /api/recipes/:id/like` - Toggle recipe favorite status
- `POST /api/recipes/:id/comments` - Add comments
- `PUT /api/recipes/:id/comments/:commentId` - Update comments
- `DELETE /api/recipes/:id/comments/:commentId` - Delete comments

## License

Add license details here if required.
