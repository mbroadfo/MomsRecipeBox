import { MongoClient } from 'mongodb';
import { getSecret } from '../app/utils/secrets_manager.js';

process.env.AWS_PROFILE = 'mrb-api';

async function checkOwnership() {
  try {
    const mongoUri = await getSecret('MONGODB_ATLAS_URI');
    
    if (!mongoUri) {
      console.error('❌ Failed to retrieve MongoDB Atlas URI');
      return;
    }
    
    const client = new MongoClient(mongoUri);
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas\n');
    
    const db = client.db('moms_recipe_box_dev');
    
    // Get ownership distribution
    console.log('📊 Recipe Ownership Distribution:');
    const ownershipStats = await db.collection('recipes').aggregate([
      {
        $group: {
          _id: '$owner_id',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();
    
    ownershipStats.forEach(stat => {
      console.log(`  ${stat._id || 'NULL'}: ${stat.count} recipes`);
    });
    
    // Get visibility distribution
    console.log('\n👁️  Recipe Visibility Distribution:');
    const visibilityStats = await db.collection('recipes').aggregate([
      {
        $group: {
          _id: '$visibility',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();
    
    visibilityStats.forEach(stat => {
      console.log(`  ${stat._id || 'NULL'}: ${stat.count} recipes`);
    });
    
    // Get combined stats
    console.log('\n🔍 Combined Owner + Visibility:');
    const combinedStats = await db.collection('recipes').aggregate([
      {
        $group: {
          _id: {
            owner: '$owner_id',
            visibility: '$visibility'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();
    
    combinedStats.forEach(stat => {
      console.log(`  Owner: ${stat._id.owner || 'NULL'}, Visibility: ${stat._id.visibility || 'NULL'} → ${stat.count} recipes`);
    });
    
    await client.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkOwnership();
