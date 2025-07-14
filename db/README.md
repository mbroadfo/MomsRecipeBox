# 🗄️ MomsRecipeBox Database Guide — Aurora MySQL (Cloud-Only)

This guide details how to interact with the **Aurora MySQL** backend used across all environments for MomsRecipeBox. There is no local MySQL container — everything runs in AWS.

---

## ☁️ Aurora MySQL: Cloud-Only Architecture

- All development, staging, and production environments use a Terraform-managed Aurora MySQL cluster.
- Database initialization and seeding are handled by a Lambda function (`init-mrb-db`).
- Secrets are securely retrieved from AWS Secrets Manager.

---

## 🚀 Automated Initialization via Lambda

The `init-mrb-db` Lambda function performs:

- 🔧 Schema setup via `init.sql`
- ✅ Health check using SQL test scripts (e.g., `test_creamy_mushroom_soup.sql`)
- 🍽️ Seeding of built-in recipes from JSON files under `db/recipes/`

### 🔁 When does it run?

Terraform will trigger the Lambda during `apply` if the following flag is set:

```hcl
initialize_db = true
