# Use AWS Lambda Node.js 18 base image for easy migration
FROM public.ecr.aws/lambda/nodejs:18

# Set working directory for Lambda
WORKDIR /var/task

# Install AWS CLI and jq for runtime secret retrieval
RUN yum update -y && yum install -y aws-cli jq

# Copy package.json and install dependencies
COPY app/package*.json ./
RUN npm install --omit=dev
# Reinstall sharp specifically for Linux platform
RUN npm install --platform=linux --arch=x64 sharp

# Copy only the app directory (not entire project)
COPY app/ ./app/
COPY config/ ./config/

# Default command will be overridden in docker-compose based on APP_MODE
CMD [ "app/lambda.handler" ]
