import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_ATLAS_URI || 'mongodb+srv://mrbapp:${MONGODB_PASSWORD}@momsrecipebox-cluster.vohcix5.mongodb.net/moms_recipe_box?retryWrites=true&w=majority';

async function queryAtlas() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('moms_recipe_box_dev');
    const recipes = await db.collection('recipes').find({}, {
      projection: { _id: 1, title: 1, owner_id: 1, visibility: 1 }
    }).toArray();
    
    console.log('Direct Atlas Query Results:');
    console.log('Total recipes found:', recipes.length);
    console.log('');
    
    recipes.forEach((recipe, index) => {
      console.log(`Recipe ${index + 1}:`);
      console.log('  _id:', recipe._id);
      console.log('  title:', recipe.title);
      console.log('  owner_id:', recipe.owner_id);
      console.log('  visibility:', recipe.visibility);
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

queryAtlas();