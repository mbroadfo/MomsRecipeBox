# 🛡️ Bastion Access Guide (Optional)

This guide explains how to use the optional **Bastion host** for securely accessing the Aurora MySQL database in AWS.

> 💡 **Note:** Most workflows no longer require direct DB access. Use the `init-mrb-db` Lambda for schema setup and testing.

---

## ☁️ What the Bastion Host Provides

* Secure jump-point into the private VPC
* Allows port-forwarded MySQL access via AWS Session Manager

---

## 🔧 Prerequisites

* AWS CLI configured
* AWS Session Manager Plugin installed
* PowerShell (Windows)
* Terraform-deployed infrastructure with `enable_bastion = true`

---

## 🔐 Secrets and Environment Setup

Ensure `.env` or `.env.ps1` includes:

```powershell
$env:MYSQL_USER = "mrb_admin"
$env:MYSQL_PASSWORD = "dev_password"
$env:MYSQL_DATABASE = "mrb_dev"
```

---

## 🚀 Establish Port Forwarding Tunnel

Run this script to generate config and connect:

```powershell
./scripts/GenerateSsmPortForwardConfig.ps1
./scripts/StartDbTunnel.ps1
```

This will:

* Look up the Bastion EC2 instance
* Start an SSM session that tunnels port 3306 to `localhost:3306`

---

## 🧪 Connect Using MySQL Workbench

Use the following credentials:

* **Host:** `localhost`
* **Port:** `3306`
* **User:** `mrb_admin`
* **Password:** from `.env`
* **Database:** `mrb_dev`

---

## 🧹 Disable When Not Needed

To avoid unnecessary costs, disable the Bastion in Terraform:

```hcl
enable_bastion = false
```

---

## 🧾 CloudWatch Logs

The Bastion instance logs to CloudWatch groups such as:

* `/ec2/bastion/cloud-init-output`
* `/ec2/bastion/ssm-agent`
* `/ec2/bastion/custom-debug`
