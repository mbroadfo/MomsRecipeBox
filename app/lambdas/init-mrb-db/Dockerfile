# Use the AWS Lambda Node.js 20 base image
FROM public.ecr.aws/lambda/nodejs:20

# Set the working directory inside the container
WORKDIR /var/task

# Copy only the Lambda-specific files
COPY app/lambdas/init-mrb-db/package*.json ./
COPY app/lambdas/init-mrb-db/index.js ./

# Install dependencies
RUN npm install --omit=dev

# Copy the seed script and SQL files from the repo structure
COPY db/init.sql ./init.sql
COPY db/tests/test_creamy_mushroom_soup.sql ./test_creamy_mushroom_soup.sql
COPY app/lambdas/init-mrb-db/seed-recipes.cjs ./seed-recipes.cjs
COPY db/recipes ./db/recipes

# Set the CMD to your handler
CMD [ "index.handler" ]
