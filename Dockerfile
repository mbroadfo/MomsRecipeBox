FROM public.ecr.aws/lambda/nodejs:18.2025.05.04.04

# Set Lambda Code Point
WORKDIR /var/task

# Copy function code
COPY . .

# Install dependencies
RUN npm ci

# Use Lambda handler by default
CMD [ "index.handler" ]
RUN ls -l /var/task
