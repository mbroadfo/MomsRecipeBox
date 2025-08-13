# Mom's Recipe Box UI

A React + TypeScript + Vite frontend for browsing, viewing, and editing recipes.

## Overview

The application renders recipes with a modern, two‑column layout (content + image pane) and a sticky action header (title + Edit/Save/Cancel plus back + like controls) that remains visible while the left column scrolls independently. In‑place editing covers title, metadata, tags, yield/time, ingredients (single flat list with implicit section labels), instructions (with lightweight headers), notes, and image upload. Lightweight grouping is achieved purely in the UI:

- Ingredient group labels: leave the ingredient name blank and supply a quantity/value (e.g. "SAUCE"). That row renders as an uppercase section label and is persisted as an empty name + quantity so round‑trips cleanly.
- Instruction headers: prefix a line with `#` (e.g. `#Preparation`). Header lines are styled, excluded from step numbering, and persisted verbatim so reordering & edits remain stable.
- Drag & drop reordering for ingredients and instruction steps via a custom ghost‑drag list (`ReorderableList`) without external DnD libraries.

No backend schema changes were required; headers and labels are encoded within the existing flat arrays.

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

Ensure the backend/API (or proxy) serves routes under `/api/*` expected by data hooks.

## Build & Preview

```bash
npm run build --prefix ui   # Type check + bundle
npm run preview --prefix ui # Serve production bundle locally
```

## Project Structure (UI)

```text
ui/
  src/
    components/
      RecipeDetail.tsx                # Public entry (wrapper)
      recipeDetail/
        RecipeDetailContainer.tsx     # Orchestrator
        hooks/
          useRecipe.ts                # Fetch + refresh
          useWorkingRecipe.ts         # Normalization + editable state
          useImageUpload.ts           # Image upload flow
        parts/                        # Presentational units
          Header.tsx
          Tags.tsx
          Subtitle.tsx
          Meta.tsx
          YieldTime.tsx
          IngredientsView.tsx
          IngredientsEditor.tsx
          InstructionsView.tsx
          StepsEditor.tsx             # Flat steps + hash headers + drag
          ReorderableList.tsx         # Generic vertical ghost DnD
          Notes.tsx
          Comments.tsx
          ImagePane.tsx
        RecipeDetail.css              # Imports shared styles
      RecipeDetail.css                # Global recipe detail styles
    pages/
      HomePage.tsx
    main.tsx / App.tsx               # App bootstrap & routing
```

## Environment & API

The UI assumes an API providing (illustrative):

- `GET /api/recipes/:id`
- `PUT /api/recipes/:id` (partial document update)
- `PUT /api/recipes/:id/image` (image upload returning key)

No environment variables are required by default; configure proxy or CORS at the dev server or reverse proxy layer if API is remote.

## Canonical Working Recipe (Frontend)

```ts
interface WorkingRecipe {
  title: string;
  subtitle?: string;
  author?: string;
  source?: string;
  tags: string[];
  yield?: string;
  time: { total?: string; prep?: string; cook?: string; [k: string]: any };
  ingredients: { group?: string; items: { name: string; quantity?: string }[] }[];
  steps: string[];           // Flattened instructions
  notes?: string;
  extraSections: { type: string; content: string; position?: number }[];
  image_url?: string;
  original: any;             // Raw recipe reference
}
```

The normalization layer absorbs backend variations (`instructions`, `steps`, or a `sections` entry) into `steps`.

## Data Flow

1. `useRecipe(id)` fetches raw JSON and exposes refresh.
2. `useWorkingRecipe(raw, locked)` produces a mutable WorkingRecipe and mutation helpers.
3. Edits modify only the working copy until saved.
4. `buildSavePayload(working)` produces a payload aligned with existing API fields.

## Recipe Detail Architecture

- Sticky header: houses title (contentEditable), action buttons, back navigation, and like heart; content scrolls beneath with internal top padding so nothing hides.
- Ingredient list: single normalized array; implicit group headers rendered when `name` is empty and `quantity` populated.
- Instructions: simple string array; lines starting with `#` treated as headers (must have non‑empty text after `#`). Headers are skipped in numbering.
- Drag & drop: `ReorderableList` supplies positional reordering for both ingredients and steps.

## Editing Workflow

1. Enter edit mode → working state instantiated.
2. Modify flat ingredients list (add, delete, reorder, create header rows via blank name).
3. Modify steps; add headers by typing `#Header` in a step row; reorder freely.
4. Save issues PUT (partial update). Cancel discards unsaved edits.

## Instruction Headers (Lightweight UI Semantics)

| Action | How |
|--------|-----|
| Add header | Create / edit a step, start with `#` followed by text (e.g. `#The Day Of`) |
| Remove header styling | Delete the leading `#` |
| Reorder | Drag like any other step; numbering auto‑recalculates excluding headers |

All lines (including headers) persist in the same `steps` array; backend remains unaware of header semantics.

## Image Upload Flow

1. File -> base64.
2. `PUT /api/recipes/:id/image` with `{ imageBase64, contentType }` returns a key.
3. Compute new `image_url` from existing base path + key.
4. `PUT /api/recipes/:id` with `{ image_url }`.
5. Local state updates to reflect new image.

## Home Page & Navigation

The Home page (`pages/HomePage.tsx`) provides:

- Responsive header with logo, title, tagline, user avatar menu
- Collapsible left drawer (auto-open on desktop) for filters & sorting
- Main content area rendering a recipe grid (`RecipeList`)
- Navigation to detail page via React Router (`/recipe/:id`)

### Filtering

Filter radio set (UI placeholders; logic can be replaced with real user context):

- all (default)
- mine (stub: id prefix heuristic)
- families (stub)
- favorites (stub)

### Sorting

Options exposed (placeholder until dates available):

- newest (default)
- popular (by comment count)
- favorites (by favorites/likes count)
- az (alphabetical)
- updated (reserved)

### Recipe Grid

`RecipeList` fetches `/api/recipes` and tolerates several payload shapes: plain array, `{ items: [] }`, or `{ recipes: [] }`. It normalizes into an internal array before filtering and sorting. Grid column count is configurable with `maxColumns` (default 5). Card layout fixed height for visual consistency.

### Recipe Cards

`RecipeCard` renders:

- Image (fallback to bundled default)
- Title (2-line clamp)
- Simple favorite/like and comment counts (supports number or array forms)
- Click handler routing to detail view using underlying `_id`

Image fallback logic ensures broken URLs revert to the local default asset.

## Component Responsibility Summary

| Area | Component(s) | Responsibility |
|------|--------------|----------------|
| Data Fetch (list) | RecipeList | Load & basic transform of recipe listing |
| Data Fetch (detail) | useRecipe | Retrieve single recipe JSON |
| Normalization | useWorkingRecipe | Produce consistent working model |
| Editing State | useWorkingRecipe + container | Hold mutable edits, patch helpers |
| Image Upload | useImageUpload + ImagePane | File selection & update image_url |
| Layout Orchestration | RecipeDetailContainer | Compose parts, save/cancel logic |
| Ingredients | IngredientsEditor / IngredientsView | Flat list + implicit headers |
| Instructions | StepsEditor / InstructionsView | Hash header detection + display |
| Drag & Drop infra | ReorderableList | Generic vertical list reordering |
| Metadata | Header, Subtitle, Meta, YieldTime, Tags | Structured fields editing/display + like control |
| Notes | Notes | View/edit notes field |
| Comments | Comments | Render comment list |
| Navigation | HomePage, App (Routes) | High-level routing & layout |

## Styling Approach (Global vs Component)

- Global CSS for Recipe Detail to ensure consistent typography & spacing across parts.
- Tailwind utility classes used sparingly on Home + list components for rapid layout.
- Inline styles for small, scoped adjustments (intentional, can be refactored to CSS modules if desired).

## Error Handling & Resilience

- List fetch gracefully handles unknown shapes (defaults to empty list).
- Detail fetch shows simple error message; can be upgraded with retry/backoff.
- Image upload surfacing error message near image pane.

## Performance Considerations

- Minimal renders: heavy lifting in hooks; parts largely pure.
- Flat instructions array ensures simple diffing.
- No large global state library; local state + fetch per view.

## Extensibility Points

| Extension | Hook / Area | Notes |
|-----------|-------------|-------|
| Persist instruction headers | useWorkingRecipe/buildSavePayload | Emit structured sections if backend extended |
| Add user-based filters | RecipeList/HomePage | Replace placeholder filters |
| Add pagination or infinite scroll | RecipeList | Add query params & intersection observer |
| Add search | RecipeList | Debounced text input -> backend query |
| Persist like state | New hook + backend field | Mirror image upload pattern |
| Add custom sections (Nutrition, Equipment) | New parts + normalization | Use `extraSections` |

## Accessibility Notes

- Interactive controls are button or input elements (keyboard focusable).
- Additional ARIA labels applied where icons are used alone.
- Planned improvements: focus ring styling, live region announcements for add/remove actions, skip links.

## Security & Input Handling

- Inputs not currently sanitized client-side (assumes trusted authors). For broader deployment, enforce validation before PUT.
- Image upload restricted by accept attribute; backend should validate content type and size.

## Deployment Thoughts

- Static assets built via Vite can be served from CDN or behind reverse proxy.
- Ensure API base path alignment (e.g., configure Vite dev server proxy if API not same origin).

## Logging & Diagnostics

- Minimal console logging (RecipeCard click). Replace with structured logging or instrumentation if required.
- Consider adding a global error boundary for UI-level failures.

## Testing Suggestions

| Test Type | Target | Example |
|-----------|--------|---------|
| Unit | Hooks | normalize -> expected WorkingRecipe |
| Component | IngredientsEditor | Add/remove item updates DOM & state |
| Integration | RecipeDetailContainer | Edit + Save triggers PUT with expected payload |
| E2E | Main flows | Visit home, open recipe, edit, save |

(Testing harness not yet included.)

## License

Add license details here if required.
