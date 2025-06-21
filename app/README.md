# MomsRecipeBox - API Handlers README

This directory contains all the Lambda-style route handlers for the MomsRecipeBox API. Each file corresponds to a single HTTP endpoint and is responsible for request validation, core business logic invocation, and response formatting.

## Directory Purpose

The `app/handlers` folder isolates each route into its own self-contained file. This aligns with the serverless philosophy (think: AWS Lambda functions) and enables modular, testable, and easily composable logic.

## Handler Structure

Each handler follows this basic pattern:

```js
export async function handler(event) {
  // Extract query parameters or body
  // Validate input
  // Call database logic (via lib or direct query)
  // Return HTTP-style object with statusCode and body
}
```

## Handlers Overview

| File Name           | Method | Route           | Description                       |
| ------------------- | ------ | --------------- | --------------------------------- |
| `get_recipes.js`    | GET    | /recipes        | Lists recipes with pagination     |
| `get_recipe.js`     | GET    | /recipe?id=...  | Fetches full recipe by ID         |
| `post_recipe.js`    | POST   | /recipes        | Creates a new recipe              |
| `update_recipe.js`  | PUT    | /recipe?id=...  | Updates an existing recipe        |
| `delete_recipe.js`  | DELETE | /recipe?id=...  | Deletes a recipe and its children |
| `post_comment.js`   | POST   | /recipe/comment | Adds a comment to a recipe        |
| `update_comment.js` | PUT    | /recipe/comment | Updates an existing comment       |
| `delete_comment.js` | DELETE | /recipe/comment | Deletes a comment by ID           |
| `post_like.js`      | POST   | /recipe/like    | Toggles like/unlike for a user    |

## Design Principles

* **Single Responsibility:** Each file handles only one route and method.
* **Statelessness:** No global state is used. Handlers rely solely on the `event` object.
* **Consistency:** Common patterns for error handling, logging, and responses.
* **Scalability:** Easily extendable with new handlers following the same conventions.

## Tips for Developers

* Use `lib/db.js` for direct SQL execution.
* Ensure your handler returns a JSON object with `statusCode` and `body` (stringified).
* Keep logic readable and defer complexity to helpers/libraries if possible.
* Run `Post-TestRecipe.ps1` after changes to validate API behavior.

---

For questions or to contribute a new handler, contact the MomsRecipeBox dev team or refer to `swagger.yaml` in the `/docs` folder for endpoint definitions.
