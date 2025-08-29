# AI-Powered Shopping List Categorization

## Feature Overview

Mom's Recipe Box includes an AI-powered ingredient categorization system that organizes shopping list items by grocery store aisle, making shopping trips more efficient. The system uses OpenAI's API to intelligently categorize ingredients based on where they would be found in a typical grocery store.

## Technical Implementation

### Backend (Node.js)

The backend implementation (`app/handlers/categorize_ingredients.js`) provides an API endpoint that:

1. Accepts a list of ingredient names via POST request
2. Calls the OpenAI API with a customized prompt for grocery categorization
3. Processes the response to ensure all ingredients are categorized
4. Includes a fallback mechanism using keyword matching if the API call fails
5. Returns a structured response with categories and metadata

### Frontend (React)

The frontend implementation uses React hooks (`useIngredientCategories.tsx`) to:

1. Defer API calls until the user explicitly switches to category view
2. Cache categorization results to avoid redundant API calls
3. Provide loading indicators during categorization
4. Handle errors gracefully with fallback to local categorization
5. Display an AI badge when AI categorization is used

### Performance Optimizations

1. **Lazy Loading**: API calls are only made when switching to the category view
2. **Caching**: Results are stored and reused for the same set of ingredients
3. **Efficient Rendering**: Category data is memoized to prevent unnecessary re-renders
4. **Incremental Updates**: The system avoids re-categorizing ingredients that haven't changed

## Configuration

Configuration requires an OpenAI API key in the `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

## User Experience

From the user perspective:

1. User accesses the shopping list page (no API calls made initially)
2. User clicks "By Category" view
3. Loading indicator appears while categorization happens
4. Ingredients are displayed organized by grocery store aisle
5. An "AI" badge indicates AI-powered organization

## Testing

Two test scripts are available to verify functionality:

1. `test_categorization.js`: Tests successful AI categorization
2. `test_categorization_fallback.js`: Tests the fallback mechanism

## Future Enhancements

Potential enhancements include:

1. User feedback mechanism to improve categorization
2. Custom category creation and ordering
3. Storing categorization results in the database to reduce API calls
4. Batch processing for very large shopping lists
