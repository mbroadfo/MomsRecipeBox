# 🔐 Bastion Access for pgAdmin (via AWS Session Manager)

This guide explains how to securely access the RDS PostgreSQL instance using **pgAdmin** with a port-forwarding tunnel via a **bastion host** and **AWS Session Manager**.

---

## 🔧 Prerequisites

- pgAdmin installed locally
- AWS CLI installed and configured
- Session Manager Plugin installed (check: `session-manager-plugin --version`)
- PowerShell (Windows dev environment assumed)
- Terraform deployed infrastructure

---

## 🏗️ Infrastructure Recap

- `bastion` EC2 in public subnet (SSM only, no SSH)
- `mrb-postgres-db` in private subnets
- VPC endpoints for:
  - `ssm`
  - `ssmmessages`
  - `ec2messages`
- Security Groups:
  - `bastion_sg`: allows all egress
  - `rds_sg`: allows port `5432` from `bastion_sg`

---

## 🚀 Steps to Connect

### 1. Start Port Forwarding Tunnel

Ensure the following script exists at `StartDbTunnel.ps1`:

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

## Running Database Tests

Our project includes unit-style tests for the PostgreSQL database using `plpgsql` procedures.

### Prerequisites

- The RDS instance must be running and reachable via the Bastion + SSM tunnel.
- The Bastion must be enabled via Terraform (`enable_bastion = true`).
- The SSM port forwarding tunnel must be active:
  ```powershell
  .\StartDbTunnel.ps1
