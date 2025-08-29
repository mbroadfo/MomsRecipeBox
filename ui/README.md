# Mom's Recipe Box UI

## A React + TypeScript + Vite frontend for## UI Components and Features

### Streamlined Header Design

The recipe header provides an efficient, consolidated interface:

- **Left Section**: Back button and Like toggle with status indication
- **Center Section**: Visibility controls with color-coded status indicators
- **Right Section**: Edit/Save/Cancel buttons and owner badge with profile access
- **Title Area**: Spacious area for the recipe title, with in-place editing capability

This consolidated design maximizes usable space while keeping all key functions accessible.

### Favorites (Like) System

The recipe favoriting system uses an optimistic UI approach:

1. User clicks the heart icon → UI immediately updates the liked state
2. A POST request is sent to `/api/recipes/:id/like` with the user ID
3. The response confirms the final state (liked or not)
4. Error handling reverts the optimistic toggle if the API call fails

This approach provides immediate feedback while still ensuring data consistency.

### Image Upload and Display

The image handling system uses several optimizations for a smooth user experience:

1. Images are uploaded via base64 encoding for simplified processing
2. Cache busting ensures immediate image updates without page refreshes
3. A timestamp parameter is added to image URLs to force browser cache invalidation
4. Images are displayed with proper metadata management for S3 compatibility

### Navigation

The application provides consistent navigation:

1. The "Back to List" button always returns users to the recipe list view
2. Clear visual indicators show the current navigation state
3. Intuitive button placement and labeling improves user experienceiewing, and editing recipes.

## Key Features

- Modern two-column layout with responsive design
- In-place recipe editing with a user-friendly interface
- Full editing capabilities for all recipe components (title, ingredients, instructions, etc.)
- Interactive ingredients with checkboxes and shopping list functionality
- Recipe visibility controls (Private, Family, Public)
- Recipe ownership management with user profile integration
- Recipe favoriting with heart icon toggle
- Image upload and management with real-time display updates
- Streamlined header with consolidated action buttons
- Consistent "Back to List" navigation for improved user experience
- Tag management
- Comments system

## Overview

The application renders recipes with a modern, two-column layout (content + image pane) and a sticky action header. The header contains the recipe title, visibility controls, action buttons (Edit/Save/Cancel), back navigation, like controls, and user profile access. It remains visible while the left column scrolls independently.

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
- Visibility: Control who can see your recipes

### Interactive Ingredients System

The ingredients section features a modern, interactive interface:

- **Checkbox Interface**: Each ingredient displays with an animated checkbox instead of a traditional bullet point
- **Selection Management**: Professional button bar with four actions:
  - **Select All**: Check all ingredients at once
  - **Clear All**: Uncheck all selected ingredients
  - **Add Selected to Shopping List**: Add checked items to a shopping list (with visual confirmation)
  - **Go to Shopping List**: Navigation button for future shopping list implementation
- **Visual Feedback**:
  - Checked ingredients show strike-through text styling
  - Animated checkmark appears when an ingredient is selected
  - Toast notifications provide feedback when adding to shopping list
- **Persistence**: Selected ingredients are saved to localStorage per recipe and persist across page refreshes
- **Accessibility**: All interactive elements are keyboard accessible with proper ARIA attributes
- **Responsive Design**: Button bar adapts to screen sizes with horizontal scrolling on mobile devices

This feature enhances the cooking workflow by allowing users to track ingredients while following recipes and prepares for future shopping list functionality.

### Recipe Visibility System

The application provides a comprehensive recipe visibility system:

- **Visibility Badge**: A color-coded badge in the header shows the current visibility status
  - Private (gray): Only visible to the owner
  - Family (blue): Visible to the owner and family members
  - Public (green): Visible to everyone

- **One-Click Visibility Changes**: In edit mode, clicking the visibility badge cycles through available options
  - Private → Family → Public → Private

- **Owner Information**: The owner's ID is displayed in a badge next to the Edit button, which can be clicked to access profile options

- **Default Settings**: New recipes are automatically set to "Private" and assigned to the current user

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

## Additional Interaction Features

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
          IngredientsView.tsx         # Interactive ingredients with checkboxes and shopping list buttons
          IngredientsEditor.tsx       # Ingredients edit mode
          InstructionsView.tsx        # Instructions display mode
          StepsEditor.tsx             # Instructions edit mode
          ReorderableList.tsx         # Drag-and-drop reordering component
          Notes.tsx                   # Recipe notes
          Comments.tsx                # Comments section
          ImagePane.tsx               # Image display and upload
        RecipeDetail.css              # Component-specific styles including interactive ingredient styling
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
