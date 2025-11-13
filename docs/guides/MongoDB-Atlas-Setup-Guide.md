# MongoDB Atlas Project Setup Guide

Complete guide for setting up new MongoDB Atlas projects, clusters, and databases with proper security practices and credential management.

## 🎯 Overview

This guide covers:

- Creating new Atlas projects within existing organizations
- Setting up clusters and databases
- Generating and managing API keys (public/private key pairs)
- Finding organization and project IDs
- Secure credential management patterns
- Best practices for admin user management

## 📋 Prerequisites

- Access to MongoDB Atlas organization
- Organization admin or project creator permissions
- AWS account (for Secrets Manager integration)
- Understanding of connection string formats

## 🏗️ Step 1: Create New Atlas Project

### 1.1 Access Organization

1. **Log into MongoDB Atlas**: Navigate to [cloud.mongodb.com](https://cloud.mongodb.com)
2. **Select Organization**: Click the organization dropdown (top-left)
3. **Verify Organization**: Ensure you're in the correct organization

### 1.2 Create Project

1. **New Project**: Click "New Project" button (top-right)
2. **Project Name**: Enter descriptive project name (e.g., `MyApp-Production`, `MyApp-Development`)
3. **Add Members** (Optional): Add team members with appropriate roles
4. **Create Project**: Click "Create Project"

### 1.3 Find Project ID

**After project creation:**

1. **Project Settings**: Go to "Project Settings" in left sidebar
2. **General Tab**: Find "Project ID" in the General section
3. **Copy Project ID**: Save this for API access and Terraform

```text
Example Project ID: 507f1f77bcf86cd799439011
```

## 🔑 Step 2: Generate API Keys (Public/Private Key Pair)

### 2.1 Organization-Level API Keys (Recommended)

**For managing multiple projects:**

1. **Organization Settings**: Click organization name → "Organization Settings"
2. **Access Manager**: Go to "Access Manager" tab
3. **API Keys**: Select "API Keys" sub-tab
4. **Create API Key**: Click "Create API Key"

**Key Configuration:**

```text
Description: MyApp-Infrastructure-Keys
Permissions: Organization Project Creator
            Organization Read Only
            (Add others as needed)
```

1. **Generate**: Click "Next" → Copy both public and private keys
2. **Add IP Access**: Add your deployment IP addresses or `0.0.0.0/0` for initial setup
3. **Done**: Save keys securely (private key shown only once!)

### 2.2 Project-Level API Keys (Alternative)

**For single project management:**

1. **Project Settings**: In your project, go to "Project Settings"
2. **Access Manager**: Click "Access Manager" tab
3. **API Keys**: Select "API Keys" sub-tab
4. **Create API Key**: Follow same process as above

**Project-Level Permissions:**

```text
Project Data Access Admin
Project Read Only
Project Charts Admin (if using Charts)
```

### 2.3 Find Organization ID

1. **Organization Settings**: Organization name → "Organization Settings"
2. **General Tab**: Find "Organization ID"
3. **Copy Organization ID**: Save for API access

```text
Example Organization ID: 5a0a1e7e0f2912c554080adc
```

## 🗄️ Step 3: Create Cluster and Database

### 3.1 Create Cluster

1. **Database**: Go to "Database" in left sidebar
2. **Create**: Click "Create" button
3. **Cluster Configuration**:

```yaml
# Recommended Settings
Cluster Type: Serverless (for development) or Dedicated (for production)
Cloud Provider: AWS (matches your infrastructure)
Region: us-west-2 (or your preferred region)
Cluster Name: MyApp-cluster (descriptive name)
```

1. **Security Settings**: Configure during setup or skip for now
2. **Create Cluster**: Wait for cluster provisioning (2-10 minutes)

### 3.2 Database Access (Admin User)

**Create admin user:**

1. **Database Access**: Go to "Database Access" in left sidebar
2. **Add New Database User**: Click button
3. **User Configuration**:

```yaml
Authentication Method: Password
Username: admin (or myapp-admin)
Password: [Generate strong password - 32+ characters]
Database User Privileges: Atlas admin
Restrict Access: No restrictions (for admin user)
```

1. **Add User**: Save configuration

**🔒 Critical Security Practice:**

- **Never hardcode passwords** in code or configuration files
- **Use AWS Secrets Manager** for production credential storage
- **Generate strong passwords** (32+ characters, mixed case, numbers, symbols)
- **Rotate credentials regularly** (every 90 days minimum)

### 3.3 Network Access

1. **Network Access**: Go to "Network Access" in left sidebar
2. **Add IP Address**: Click "Add IP Address"

**Development Setup:**

```text
IP Address: 0.0.0.0/0 (Allow from anywhere)
Comment: Development - All IPs
```

**Production Setup:**

```text
IP Address: [Your server IPs]
Comment: Production servers only
```

### 3.4 Create Database

1. **Collections**: Go to "Database" → Browse Collections
2. **Create Database**: Click "Create Database"
3. **Database Configuration**:

```yaml
Database Name: myapp (or your app name)
Collection Name: users (or initial collection)
```

## 🔐 Step 4: Connection String and Credentials

### 4.1 Get Connection String

1. **Database**: Go to "Database" in left sidebar
2. **Connect**: Click "Connect" on your cluster
3. **Connect Application**: Select this option
4. **Driver**: Choose "Node.js" and latest version
5. **Connection String**: Copy the connection string

```javascript
// Example Connection String
mongodb+srv://admin:<password>@myapp-cluster.abc123.mongodb.net/?retryWrites=true&w=majority
```

### 4.2 Secure Credential Management

**🚫 Never Do This:**

```javascript
// ❌ NEVER hardcode credentials
const mongoUri = "mongodb+srv://admin:mypassword123@cluster.mongodb.net/myapp";
```

**✅ AWS Secrets Manager Pattern (Recommended):**

```javascript
// ✅ Secure credential retrieval
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

async function getMongoUri() {
  const client = new SecretsManagerClient({ region: "us-west-2" });
  const command = new GetSecretValueCommand({
    SecretId: "MyApp/MongoDB/Atlas"
  });
  
  const response = await client.send(command);
  const secrets = JSON.parse(response.SecretString);
  return secrets.MONGODB_ATLAS_URI;
}
```

**Create AWS Secret:**

```json
{
  "MONGODB_ATLAS_URI": "mongodb+srv://admin:ACTUAL_PASSWORD@cluster.mongodb.net/myapp",
  "MONGODB_ATLAS_USERNAME": "admin",
  "MONGODB_ATLAS_PASSWORD": "ACTUAL_PASSWORD",
  "MONGODB_DATABASE_NAME": "myapp"
}
```

## 📊 Step 5: Terraform Integration (Advanced)

### 5.1 Provider Configuration

```hcl
# terraform/main.tf
terraform {
  required_providers {
    mongodbatlas = {
      source = "mongodb/mongodbatlas"
      version = "~> 1.0"
    }
  }
}

provider "mongodbatlas" {
  public_key  = var.mongodb_atlas_public_key
  private_key = var.mongodb_atlas_private_key
}
```

### 5.2 Variables

```hcl
# terraform/variables.tf
variable "mongodb_atlas_public_key" {
  description = "MongoDB Atlas API public key"
  type        = string
  sensitive   = true
}

variable "mongodb_atlas_private_key" {
  description = "MongoDB Atlas API private key"  
  type        = string
  sensitive   = true
}

variable "mongodb_atlas_org_id" {
  description = "MongoDB Atlas Organization ID"
  type        = string
}
```

### 5.3 Project Resource

```hcl
# terraform/mongodb.tf
resource "mongodbatlas_project" "main" {
  name   = "MyApp-Production"
  org_id = var.mongodb_atlas_org_id
}

resource "mongodbatlas_cluster" "main" {
  project_id = mongodbatlas_project.main.id
  name       = "myapp-cluster"
  
  provider_name               = "AWS"
  backing_provider_name      = "AWS"
  provider_region_name       = "US_WEST_2"
  provider_instance_size_name = "M10"
  
  cluster_type = "REPLICASET"
  replication_specs {
    num_shards = 1
    regions_config {
      region_name     = "US_WEST_2"
      electable_nodes = 3
      priority        = 7
      read_only_nodes = 0
    }
  }
}
```

## 🔍 Step 6: Key Information Reference

### 6.1 Important IDs and Keys

Keep these secure and accessible:

```yaml
# Organization Information
Organization ID: [Found in Organization Settings → General]
Organization Name: [Your organization name]

# Project Information
Project ID: [Found in Project Settings → General]
Project Name: [Your project name]

# API Keys
Public Key: [Generated in Access Manager → API Keys]
Private Key: [Generated in Access Manager → API Keys - SAVE IMMEDIATELY]

# Connection Information
Cluster Name: [Your cluster name]
Database Name: [Your database name]
Connection String: [From Database → Connect]
```

### 6.2 Security Checklist

- [ ] API keys generated and stored securely
- [ ] Private key saved immediately (not shown again!)
- [ ] Network access configured appropriately
- [ ] Database user created with strong password
- [ ] Connection string obtained
- [ ] Credentials stored in AWS Secrets Manager (not code)
- [ ] IP access list configured for your environment
- [ ] Organization and Project IDs documented

## 🚨 Security Best Practices

### Admin User Management

**Single Admin User Pattern:**

```yaml
Username: admin (or organization-specific name)
Password: Generated 32+ character password
Privileges: Atlas admin (full access)
Storage: AWS Secrets Manager only
Rotation: Every 90 days minimum
```

**Multi-User Pattern (Recommended for teams):**

```yaml
Admin User: For infrastructure and maintenance
App User: For application connections (limited privileges)
Backup User: For backup operations only
Read-Only User: For monitoring and analytics
```

### Credential Rotation

**Monthly Rotation Process:**

1. Generate new password in Atlas
2. Update AWS Secrets Manager
3. Deploy applications with new credentials
4. Verify connectivity
5. Remove old credentials

### Monitoring and Alerts

**Set up Atlas alerts for:**

- Connection failures
- High CPU/memory usage
- Disk space warnings
- Security events (failed logins)
- Backup failures

## 📚 Additional Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Atlas API Reference](https://docs.atlas.mongodb.com/reference/api/)
- [Terraform MongoDB Atlas Provider](https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs)
- [AWS Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)

## 🔧 Troubleshooting

### Common Issues

**Connection Failures:**

- Verify IP whitelist includes your source IP
- Check username/password accuracy
- Ensure cluster is running (not paused)
- Validate connection string format

**API Key Issues:**

- Verify public/private key pair accuracy
- Check API key permissions for required operations
- Ensure IP access list includes API caller IP
- Confirm organization/project ID accuracy

**Authentication Errors:**

- Verify database user exists and has correct privileges
- Check password accuracy (no special character encoding issues)
- Ensure user has access to specified database
- Confirm authentication database is correct (usually admin)

---

**Created**: November 11, 2025
**Version**: 1.0
**Author**: MomsRecipeBox Development Team
