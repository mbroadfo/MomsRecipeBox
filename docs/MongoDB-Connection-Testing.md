# MongoDB Connection Mode Testing Plan

## Local MongoDB Mode Testing

1. **Setup**
   - Ensure Docker is running
   - Set mode to local: `.\scripts\Toggle-MongoDbConnection.ps1 -Mode local`
   - Verify `.env` has `MONGODB_MODE=local`

2. **Verify Container Status**
   - Check all containers are running: `docker ps`
   - Verify mongo, mongo-express, and app containers are running
   - Verify MongoDB port 27017 is accessible

3. **Functional Testing**
   - Access app at http://localhost:3000
   - Create a test recipe
   - Upload an image
   - Add a comment
   - Verify recipe is retrieved correctly
   - Verify image is retrieved correctly

4. **Health Check**
   - Access health endpoint: http://localhost:3000/health
   - Verify status is healthy
   - Check detailed health at http://localhost:3000/health/detailed
   - Verify database connection is working

5. **Data Verification**
   - Access MongoDB Express at http://localhost:8081
   - Verify collections exist (recipes, users, etc.)
   - Verify test data is present

6. **Exception Handling**
   - Stop MongoDB container: `docker stop momsrecipebox-mongo`
   - Verify app gracefully handles connection errors
   - Restart MongoDB container: `docker start momsrecipebox-mongo`
   - Verify app recovers connection

## MongoDB Atlas Mode Testing

1. **Setup**
   - Ensure MongoDB Atlas cluster is running
   - Set mode to atlas: `.\scripts\Toggle-MongoDbConnection.ps1 -Mode atlas`
   - Verify `.env` has `MONGODB_MODE=atlas`

2. **Verify Container Status**
   - Check running containers: `docker ps`
   - Verify only the app container is running (no mongo or mongo-express)
   - Verify app container logs for successful Atlas connection

3. **Functional Testing**
   - Access app at http://localhost:3000
   - View existing recipes (migrated from local)
   - Create a new test recipe
   - Upload an image
   - Add a comment
   - Verify recipe is retrieved correctly
   - Verify image is retrieved correctly

4. **Health Check**
   - Access health endpoint: http://localhost:3000/health
   - Verify status is healthy
   - Check detailed health at http://localhost:3000/health/detailed
   - Verify MongoDB Atlas connection is working

5. **Data Verification**
   - Access MongoDB Atlas dashboard
   - Verify collections exist
   - Verify test data is present

6. **Exception Handling**
   - Test network disconnect (simulate by using incorrect credentials)
   - Verify app gracefully handles connection errors
   - Restore correct credentials
   - Verify app recovers connection

## Toggle Testing

1. **Local to Atlas**
   - Start in local mode
   - Create unique test recipe in local
   - Toggle to Atlas mode: `.\scripts\Toggle-MongoDbConnection.ps1`
   - Verify MongoDB connection switched to Atlas
   - Verify app container restarted
   - Verify mongo containers stopped

2. **Atlas to Local**
   - Start in Atlas mode
   - Create unique test recipe in Atlas
   - Toggle to local mode: `.\scripts\Toggle-MongoDbConnection.ps1`
   - Verify MongoDB connection switched to local
   - Verify all containers running
   - Verify app is functional

3. **Data Consistency**
   - Test data migration procedures between local and Atlas
   - Verify recipes, users, and other data transferred correctly
   - Test backup/restore operations between modes