# MongoDB Atlas Migration Guide

## Updating Connection Strings

After provisioning your MongoDB Atlas cluster with Terraform, you'll need to update your application's connection strings.

### 1. Get Your Connection String

Run the following command in the project root:

```powershell
cd .\infra
terraform output mongodb_srv_address
```

### 2. Update Local Development Environment

The application now uses AWS Secrets Manager for MongoDB Atlas credentials. Instead of storing sensitive Atlas connection information in the `.env` file, we keep only local MongoDB configuration there:

```env
# Local MongoDB Configuration (for development only)
MONGODB_LOCAL_ROOT_USER=admin
MONGODB_LOCAL_ROOT_PASSWORD=supersecret
MONGODB_DB_NAME=moms_recipe_box_dev
MONGODB_LOCAL_URI=mongodb://admin:supersecret@mongo:27017/moms_recipe_box_dev?authSource=admin
MONGODB_MODE=local  # Set to 'atlas' to use MongoDB Atlas
```

MongoDB Atlas connection information is securely retrieved from AWS Secrets Manager at runtime.

To update AWS Secrets Manager with your Atlas connection string:

```powershell
aws secretsmanager update-secret --secret-id moms-recipe-secrets-dev --secret-string "{\"MONGODB_URI\":\"
```

Replace:

- `<PASSWORD>` with the value of `mongodb_atlas_password` from your `mongodb_atlas.tfvars` file
- `<CLUSTER_NAME>` with the output from the terraform command

### 3. Update AWS Lambda Environment (if applicable)

If you're using AWS Lambda, update the environment variables in your Lambda function:

```terraform
resource "aws_lambda_function" "app_lambda" {
  # ...existing configuration...
  
  environment {
    variables = {
      MONGODB_URI = "
      MONGODB_DB_NAME = "momsrecipebox"
      # ...other environment variables...
    }
  }
}
```

### 4. Test the Connection

Test that your application can connect to MongoDB Atlas:

```powershell
# Start your local application
.\scripts\restart_app.ps1
```

### Troubleshooting

1. **Connection Failures**:
   - Verify your IP is allowed in the MongoDB Atlas IP Access List
   - Check that the username and password are correct
   - Ensure the cluster is fully provisioned (can take 5-10 minutes)

2. **Timeouts**:
   - Check network connectivity
   - Verify VPC settings if using AWS Lambda

3. **Authentication Errors**:
   - Verify the database user permissions
   - Check that you're using the correct authentication database (admin)

## Migrating Your Data

To migrate your existing data from local MongoDB to Atlas:

```powershell
# Export from local MongoDB (adjust as needed)
mongodump --host localhost:27017 --username admin --password "your-password" --db moms_recipe_box_dev --out ./mongodb_export

# Import to MongoDB Atlas
mongorestore --uri "
```

## Next Steps

1. Update your backup Lambda functions to point to the new MongoDB Atlas cluster
2. Configure monitoring and alerts in the MongoDB Atlas console
3. Set up the admin dashboard to show MongoDB Atlas status
