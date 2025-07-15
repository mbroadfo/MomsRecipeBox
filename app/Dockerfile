FROM public.ecr.aws/lambda/nodejs:18.2025.05.04.04

WORKDIR /var/task

# Copy only package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies into /var/task/node_modules
RUN npm ci --omit=dev

# Now copy the rest of the app code
COPY . .

# Debug: confirm mysql2 is in the final image
RUN ls -l node_modules/mysql2 && echo "mysql2 found!" || echo "mysql2 NOT found"

CMD [ "index.handler" ]
