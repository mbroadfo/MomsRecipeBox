import { MongoClient } from 'mongodb';

const uri = 'mongodb://admin:supersecret@localhost:27017/moms_recipe_box_dev?authSource=admin';
const client = new MongoClient(uri);

async function test() {
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected successfully!');
    
    const db = client.db('moms_recipe_box_dev');
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
  } finally {
    await client.close();
  }
}

test();