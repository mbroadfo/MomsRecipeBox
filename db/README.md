# 🔐 Bastion Access for pgAdmin (via AWS Session Manager)

This guide explains how to securely access the RDS PostgreSQL instance using **pgAdmin** with a port-forwarding tunnel via a **bastion host** and **AWS Session Manager**.

---

## 🔧 Prerequisites

- pgAdmin installed locally  
- AWS CLI installed and configured  
- Session Manager Plugin installed  
  _Check:_ `session-manager-plugin --version`  
- PowerShell (Windows dev environment assumed)  
- Terraform-deployed infrastructure  

---

## 🏗️ Infrastructure Recap
 
- `bastion` EC2 instance in public subnet (SSM only — no SSH)  
- `mrb-postgres-db` RDS instance in private subnets  
- VPC endpoints for:  
  - `ssm`  
  - `ssmmessages`  
  - `ec2messages`  
- Security Groups:  
  - `bastion_sg`: allows all outbound traffic  
  - `rds_sg`: allows port `5432` from `bastion_sg`  

---

## 🚀 Steps to Connect

### 1️⃣ Start Port Forwarding Tunnel

Ensure this script exists at `StartDbTunnel.ps1`:

```powershell
# StartDbTunnel.ps1

# Fetch Bastion instance ID
$instanceId = (aws ec2 describe-instances `
  --filters "Name=tag:Name,Values=bastion" "Name=instance-state-name,Values=running" `
  --query "Reservations[*].Instances[*].InstanceId" `
  --output text).Trim()

Write-Output "Bastion instance ID: $instanceId"

# Ensure Session Manager plugin is registered
$env:AWS_SSM_PLUGIN = "C:\Program Files\Amazon\SessionManagerPlugin\bin\SessionManagerPlugin.exe"

# Start port forwarding session
aws ssm start-session `
  --target $instanceId `
  --document-name "AWS-StartPortForwardingSessionToRemoteHost" `
  --parameters file://ssm-port-forward.json
```

### 2️⃣ Connect pgAdmin

In pgAdmin:

- **Host:** `localhost`  
- **Port:** `5432`  
- **Username:** `mrb_admin` _(from Terraform output)_  
- **Password:** `db_password` _(from Terraform output)_  
- **Database:** `mrb_dev`  

Once the tunnel is running, you can connect normally.

---

## 🧪 Running Database Tests

Database unit tests are defined in `db/tests/` as `plpgsql` procedures.

Run tests using the provided PowerShell helper:

```powershell
.\run_tests.ps1
```

This will:

- Load and install the test procedure  
- Execute `CALL test_recipe_lifecycle();`  
- Display test output and automatically clean up all test data  

### ✅ Prerequisites

- RDS instance must be running  
- Bastion must be enabled (`enable_bastion = true`)  
- SSM tunnel must be active:  
  ```powershell
  .\StartDbTunnel.ps1
  ```

---

## ⚙️ Bastion Mode Toggle

The Bastion EC2 instance, VPC endpoints, and related infrastructure are deployed only when needed.

Controlled via Terraform:

```hcl
enable_bastion = true  # Enable when accessing the database via SSM
# Set to false when not needed to save AWS costs
```

---

## 📝 CloudWatch Logs Retention

Bastion-related CloudWatch log groups have a 7-day retention policy to manage costs.

This is controlled via Terraform (`aws_cloudwatch_log_group` resources).
