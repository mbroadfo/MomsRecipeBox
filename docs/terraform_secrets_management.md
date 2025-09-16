# Managing Terraform Secrets for MongoDB Atlas

This document outlines the secure management of MongoDB Atlas credentials and other secrets for Terraform.

## Security Guidelines

1. **NEVER commit secrets to Git**
   - All `.tfvars` files are added to `.gitignore`
   - Use the provided scripts to generate these files securely

2. **Protect local secrets**
   - Restrict access to your local `mongodb_atlas.tfvars` file
   - Periodically rotate credentials

3. **Use secure credential storage**
   - For production: AWS Secrets Manager / Parameter Store
   - For development: Password manager or secure vault

## Available Scripts

### For Development

Use the `Create-TfVarsFile.ps1` script to securely create your tfvars file:

```powershell
.\scripts\Create-TfVarsFile.ps1
```

This script will:

- Prompt for your MongoDB Atlas credentials
- Detect your current IP address for the access list
- Create the tfvars file with the appropriate format

### For Production / CI/CD

Use the `Get-MongoAtlasSecrets.ps1` script to retrieve secrets from AWS:

```powershell
.\scripts\Get-MongoAtlasSecrets.ps1
```

## Terraform State Security

The Terraform state file also contains sensitive values. We manage this by:

1. Using local state during development (included in `.gitignore`)
2. Using remote state with encryption for production/shared environments

## Key Rotation

When rotating MongoDB Atlas API keys:

1. Create new API keys in the MongoDB Atlas console
2. Run the appropriate script to update your tfvars file
3. Run `terraform apply` to update your configuration

## Emergency Access Control

If credentials are compromised:

1. Immediately revoke the affected API keys in MongoDB Atlas
2. Rotate any database user passwords
3. Update IP access lists to restrict access

For assistance, contact the infrastructure team.
