const getRecipe = require('./handlers/get_recipe');

exports.handler = async (event) => {
    console.log(`Received event: ${JSON.stringify(event)}`);

    const { path, httpMethod } = event;

    if (httpMethod === 'GET' && path === '/recipes') {
        return await getRecipe(event);
    }

    else if (httpMethod === 'POST' && path === '/recipes') {
        const postRecipe = require('./handlers/post_recipe');
        return await postRecipe.handler(event);
    }

    return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Not found' }),
    };
};
