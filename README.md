# MomsRecipeBox

A secure, multi-family recipe sharing platform with a modular architecture: infrastructure (Terraform), backend API (Node.js Lambda-style + MongoDB), modern React/Vite UI, and supporting automation scripts.

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
- `test_favorites.js` – Multi-user favorite (like) toggle & count validation (NEW)

Run:

```powershell
cd app/tests
npm install   # first time
node test_favorites.js
npm test      # runs recipe + image tests
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
| (img)  | PUT/GET/DELETE /recipes/{id}/image | Image management (multipart & base64) |

---

## 🖥 Frontend Highlights

- Sticky header with in-place editable title & heart (like) toggle.
- Optimistic like updates calling new `/recipes/:id/like` endpoint.
- Lightweight instruction headers (`#Heading`) & ingredient group labels (blank name row technique).
- Custom drag & drop reordering without external DnD libs.

---

## 🔒 Upcoming / TODO

- Implement proper authentication (currently using hardcoded "Admin" user).
- Surface `likes_count` & per-user `liked` state in recipe list & detail (UI shows only heart state now).
- Clean removal of deprecated `post_like.js` after full migration.
- Favorites listing endpoint (`GET /users/{id}/favorites`) & filtering.

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

## ✨ Recent Changes Summary

- Implemented favorites model (`favorites` collection + `likes_count`).
- Added `toggle_favorite.js`; routing updated in `lambda.js`.
- Updated `create_recipe.js` to initialize `likes_count`.
- Enhanced `get_recipe.js` to include `likes_count` & placeholder `liked` field.
- Added `test_favorites.js` (multi-user toggle test).
- UI: Heart like button moved into sticky header; removed legacy star rating.
