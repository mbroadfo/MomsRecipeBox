# 🗄️ Database Access Guide: Local and Cloud Modes

This guide covers how to access and work with the MomsRecipeBox PostgreSQL database in both **local development** and **cloud environments**.

---

## 🖥️ Local Database Setup

Use Docker Compose and PowerShell scripts to launch a local PostgreSQL container.

### 🧰 Prerequisites (Local)

* Docker Desktop (Windows)
* PowerShell (with script execution enabled)

### ▶️ Start the Local Database

```powershell
./scripts/Start-MrbDatabase.ps1
```

This will:

* Create a Docker volume
* Start the PostgreSQL container
* Run schema initialization (`init.sql`)
* Execute a full test lifecycle (if present)

### ⏹️ Stop the Local Database

```powershell
./scripts/Stop-MrbDatabase.ps1
```

---

## ☁️ Cloud Database Access (via Bastion Host)

To securely access the RDS PostgreSQL instance, use pgAdmin with a port-forwarding tunnel established through a bastion host and AWS Session Manager.

### 🔧 Prerequisites (Cloud)

* pgAdmin installed locally
* AWS CLI configured
* Session Manager Plugin
* PowerShell (Windows)
* Terraform-deployed infrastructure

### 🏗️ Cloud Infrastructure Recap

* **Bastion** EC2 instance in public subnet (SSM access only)
* **RDS** PostgreSQL instance in private subnets
* VPC Endpoints: `ssm`, `ssmmessages`, `ec2messages`
* Security Groups:

  * `bastion_sg`: outbound traffic
  * `rds_sg`: allows port 5432 from bastion

### 🚀 Start the SSM Tunnel

```powershell
./StartDbTunnel.ps1
```

Script content:

```powershell
# StartDbTunnel.ps1

$instanceId = (aws ec2 describe-instances `
  --filters "Name=tag:Name,Values=bastion" "Name=instance-state-name,Values=running" `
  --query "Reservations[*].Instances[*].InstanceId" `
  --output text).Trim()

Write-Output "Bastion instance ID: $instanceId"

$env:AWS_SSM_PLUGIN = "C:\Program Files\Amazon\SessionManagerPlugin\bin\SessionManagerPlugin.exe"

aws ssm start-session `
  --target $instanceId `
  --document-name "AWS-StartPortForwardingSessionToRemoteHost" `
  --parameters file://ssm-port-forward.json
```

### 📥 Connect Using pgAdmin

* **Host:** `localhost`
* **Port:** `5432`
* **Username:** `mrb_admin`
* **Password:** `db_password`
* **Database:** `mrb_dev`

---

## 🧪 Running Database Tests

Database tests are defined as `plpgsql` procedures under `db/tests/`.

```powershell
./scripts/run_tests.ps1
```

This script will:

* Upload and install the test function
* Run `CALL test_recipe_lifecycle();`
* Output results and clean up test data

### ✅ Cloud Mode Requirements

* RDS instance running
* Bastion and tunnel active:

```powershell
./StartDbTunnel.ps1
```

---

## ⚙️ Bastion Toggle in Terraform

Enable bastion infrastructure only when needed:

```hcl
enable_bastion = true  # Set false to save costs
```

---

## 📝 CloudWatch Logs

Bastion log groups have a 7-day retention period, configurable via Terraform.
