# Use AWS Lambda Node.js 18 base image for easy migration
FROM public.ecr.aws/lambda/nodejs:18

# Set working directory for Lambda
WORKDIR /var/task

# Install AWS CLI and jq for runtime secret retrieval
RUN yum update -y && yum install -y aws-cli jq

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy the application code
COPY . . 

# Default command will be overridden in docker-compose based on APP_MODE
CMD [ "lambda.handler" ]
