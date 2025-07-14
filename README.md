# MomsRecipeBox

A secure, multi-family recipe sharing platform with flexible deployment options. This repository contains infrastructure, database, and automation scripts to support both local and cloud development environments.

---

## 📦 Architecture Overview

| Tier         | Local Dev            | Cloud Deployment        |
| ------------ | -------------------- | ----------------------- |
| Database     | Docker Compose       | RDS via Terraform & SSM |
| App Backend  | (TBD: Node/.NET)     | AWS Lambda (TBD)        |
| Web Frontend | (TBD: React/Vite)    | S3 + CloudFront (TBD)   |
| AI Assistant | (Future Integration) | (Future Integration)    |

---

## ⚡ Quick Start: Local Development

Use Docker Compose and PowerShell to launch a fully-functional local database environment.

### Start the Local Database

```powershell
.\Start-MrbDatabase.ps1
```

### Run Full Lifecycle Test

```powershell
.\Reset-MrbDatabase.ps1 -Force
```

This will:

* Stop and reset the Docker container
* Recreate persistent volumes
* Load the schema and sample data
* Run the full recipe lifecycle test script

---

## 📂 Repo Structure

```text
/db
  init.sql                  -- Schema definition
  tests/
    test_recipe_lifecycle.sql -- Functional test case
  README.md                 -- Bastion + cloud connection instructions
infra/
  terraform/                -- Cloud infra setup (RDS, Bastion)
scripts/
  Start-MrbDatabase.ps1     -- Local DB start
  Stop-MrbDatabase.ps1      -- Local DB stop
  Reset-MrbDatabase.ps1     -- Local DB reset and test
```

---

## ☁️ Cloud Mode (Optional)

The `/db/README.md` contains full instructions for using Bastion + Session Manager to connect securely to an RDS instance.

Use Terraform variables to enable or disable cloud resources as needed.

---

## 📍 Next Steps

* Build App Tier APIs
* Begin frontend prototyping
* Plan AI/ML integration for smart recipe tagging or suggestions
