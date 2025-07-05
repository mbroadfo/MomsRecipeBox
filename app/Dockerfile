FROM public.ecr.aws/lambda/nodejs:18.2025.05.04.04

# Set working directory inside the container
WORKDIR /var/task

# Copy only the app directory content
COPY . .

# Install dependencies
RUN npm ci

# Lambda entry point (will be overridden by docker-compose for local)
CMD [ "local_server.handler" ]
