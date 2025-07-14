# 🗄️ Database Access Guide: Cloud-Only Aurora MySQL

This guide explains how to access and work with the MomsRecipeBox database using **Aurora MySQL**, now the exclusive backend for all environments.

---

## ☁️ Cloud Database Setup (Aurora MySQL)

All development, testing, and deployment use an Aurora MySQL cluster managed through Terraform. There is no local MySQL container.

---

## 📥 Connecting to the Cloud Database

Use the `init-mrb-db` Lambda function to seed and test the database, or connect manually via MySQL Workbench.

### 🔧 Requirements

* MySQL Workbench or another MySQL-compatible client
* `.env` and `.env.ps1` with credentials
* AWS credentials and Terraform-deployed infrastructure

### 🚀 Initialize the Database via Lambda

The `init-mrb-db` Lambda:
- Initializes the schema (`init.sql`)
- Runs health checks (e.g., `test_creamy_mushroom_soup.sql`)
- Seeds with sample recipes (via `seed-recipes.cjs`)

This is triggered automatically by Terraform when `initialize_db = true`.

---

## 🧪 Running Tests

Database tests are defined as SQL scripts under `db/tests/` and invoked by the `init-mrb-db` Lambda.

To run manually:

```powershell
./scripts/run_tests.ps1
```

Ensure:
- Aurora cluster is deployed
- Secrets are up-to-date
- Lambda has VPC access and correct IAM roles

---

## 📝 Environment Variables

Stored in `.env.ps1` for PowerShell and `.env` for CLI and deployment tooling:

```powershell
$env:MYSQL_USER = "mrb_admin"
$env:MYSQL_PASSWORD = "dev_password"
$env:MYSQL_DATABASE = "mrb_dev"
$env:MYSQL_ROOT_PASSWORD = "dev_password"
```

---

## 📚 Bastion Access (Optional)

Direct database connections (e.g., from MySQL Workbench) are not required for typical workflows.
For manual access, see `bastion/README.md`.
