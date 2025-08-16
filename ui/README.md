# Mom's Recipe Box UI

A React + TypeScript + Vite frontend for browsing, viewing, and editing recipes.

## Recent Updates (Favorites Integration)

- Replaced legacy star rating component with a single heart (like) toggle.
- Heart button relocated to sticky header next to navigation; accessible label + dynamic text (Like/Liked).
- Backend integration now hits `POST /recipes/:id/like` (favorites model) and performs optimistic UI update.
- `liked` initial state derives from backend `recipe.liked` (currently placeholder until auth-driven value provided).
- Future: Display `likes_count` in header or card meta once per-user like state is fully exposed on list endpoints.

## Overview

The application renders recipes with a modern, two‑column layout (content + image pane) and a sticky action header (title + Edit/Save/Cancel plus back + like controls) that remains visible while the left column scrolls independently. In‑place editing covers title, metadata, tags, yield/time, ingredients (single flat list with implicit section labels), instructions (with lightweight headers), notes, and image upload. Lightweight grouping is achieved purely in the UI:

- Ingredient group labels: leave the ingredient name blank and supply a quantity/value (e.g. "SAUCE"). That row renders as an uppercase section label and is persisted as an empty name + quantity so round‑trips cleanly.
- Instruction headers: prefix a line with `#` (e.g. `#Preparation`). Header lines are styled, excluded from step numbering, and persisted verbatim so reordering & edits remain stable.
- Drag & drop reordering for ingredients and instruction steps via a custom ghost‑drag list (`ReorderableList`) without external DnD libraries.

No backend schema changes were required for headers or group labels; semantics are encoded in flat arrays.

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

## Favorites (Like) Toggle Flow

1. User clicks heart → UI flips local `liked` state immediately (optimistic).
2. POST `/api/recipes/:id/like` with `{ user_id }` (temporary until auth integrated).
3. Response `{ liked, likes }` reconciles final state (rollback on failure).
4. Optional future enhancement: update local `likes_count` display when added.

Error handling: If the API call fails, the optimistic toggle is reverted and error logged.

## Project Structure (UI)

```text
ui/
  src/
    components/
      RecipeDetail.tsx                # Public entry (wrapper)
      recipeDetail/
        RecipeDetailContainer.tsx     # Orchestrator (heart toggle + optimistic update)
        hooks/
          useRecipe.ts                # Fetch + refresh
          useWorkingRecipe.ts         # Normalization + editable state
          useImageUpload.ts           # Image upload flow
        parts/                        # Presentational units
          Header.tsx                  # Sticky header + like heart
          Tags.tsx
          Subtitle.tsx
          Meta.tsx
          YieldTime.tsx
          IngredientsView.tsx
          IngredientsEditor.tsx
          InstructionsView.tsx
          StepsEditor.tsx
          ReorderableList.tsx
          Notes.tsx
          Comments.tsx
          ImagePane.tsx
        RecipeDetail.css
    pages/
      HomePage.tsx
```

## Environment & API

Illustrative endpoints consumed:

- `GET /api/recipes/:id`
- `PUT /api/recipes/:id`
- `PUT /api/recipes/:id/image`
- `POST /api/recipes/:id/like` (favorites)

## Accessibility / UX Notes

- Heart button includes `aria-label` reflecting state (e.g., "Like recipe" vs "Unlike recipe").
- ContentEditable title retains keyboard focus; ensure custom key handling avoids accidental form submissions.

## Extensibility (Upcoming)

| Feature | Path |
|---------|------|
| Show likes count | Header / RecipeCard adjustments |
| Filter by favorites | HomePage filter set + backend list param |
| Auth-driven liked state | `useRecipe` augment with user context |
| Undo toast on failures | Global notification system |

## Testing Suggestions

- Unit: Heart toggle optimistic logic (simulate success & failure).
- Integration: RecipeDetailContainer end-to-end (mock fetch responses).
- Visual: Snapshot tests for header states (liked / unliked / editing).

## Performance

- Optimistic UI avoids extra fetch round-trip before updating heart state.
- Minimal rerenders: heart state isolated in container.

## Security Considerations

- Until auth integration, `user_id` is a placeholder; do not rely on UI-provided IDs in production.
- Sanitize user-edited fields server-side before persistence (title, notes, etc.).

## License

Add license details here if required.
