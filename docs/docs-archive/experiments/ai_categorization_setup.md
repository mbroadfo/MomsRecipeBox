# AI Categorization Setup

For the AI-powered ingredient categorization to work, you'll need to add your OpenAI API key to the .env file.

1. Open the app/.env file
2. Add this line (replace with your actual OpenAI API key):

   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. Save the file
4. Restart your backend server

You can get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/) if you don't already have one.

Note: The categorization feature will fall back to keyword matching if the OpenAI API is unavailable or if there's an error with the API call.
