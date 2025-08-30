docker-compose stop app
docker-compose build --no-cache app
docker-compose up -d app

# Print environment variables inside the container for debugging
Write-Host "Checking environment variables in the container:"
docker-compose exec app node -e "console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY)"
