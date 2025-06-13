const { handler: createRecipeHandler } = require('./create_recipe');
const { handler: listRecipesHandler } = require('./list_recipes');

exports.handler = async (event, context) => {
    console.log(`Received event: ${JSON.stringify(event)}`);

    const method = event.httpMethod;
    const resourcePath = event.resource || event.path;

    try {
        // POST /recipes
        if (method === 'POST' && resourcePath.endsWith('/recipes')) {
            return await createRecipeHandler(event, context);
        }

        // GET /recipes
        if (method === 'GET' && resourcePath.endsWith('/recipes')) {
            return await listRecipesHandler(event, context);
        }

        // 404 default
        return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Not Found' }),
        };
    } catch (err) {
        console.error('Error in index.js handler:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error', error: err.message }),
        };
    }
};
