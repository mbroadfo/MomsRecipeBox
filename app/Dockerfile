# Use official AWS Lambda Node.js 18 base image with Runtime API support
FROM public.ecr.aws/lambda/nodejs:18.2025.05.04.04

# Copy function code
COPY . ./

# Install dependencies
RUN npm install

# Command to run the Lambda function
CMD [ "index.handler" ]
