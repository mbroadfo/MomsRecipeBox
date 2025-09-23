# Use AWS Lambda Node.js 18 base image for easy migration
FROM public.ecr.aws/lambda/nodejs:18

# Set working directory for Lambda
WORKDIR /var/task

# Copy package.json and install dependencies
COPY app/package*.json ./
RUN npm install --omit=dev

# Copy the application code
COPY app/ . 

# Copy the tools directory for health checks
COPY tools/ ../tools/

# Default command will be overridden in docker-compose based on APP_MODE
CMD [ "lambda.handler" ]
