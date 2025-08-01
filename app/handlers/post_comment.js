import { ObjectId } from 'mongodb';
import { getDb } from '../app.js';

const handler = async (event) => {
  try {
    console.log('DEBUG post_comment event.pathParameters:', event.pathParameters);
    const id = event.pathParameters?.id;
    console.log('DEBUG post_comment extracted id:', id);
    const body = JSON.parse(event.body);
    const db = await getDb();

    const comment = {
      _id: new ObjectId(),
      user_id: body.user_id,
      content: body.content,
      created_at: new Date()
    };

    const result = await db.collection('recipes').updateOne(
      { _id: new ObjectId(id) },
      { $push: { comments: comment }, $set: { updated_at: new Date() } }
    );

    if (result.matchedCount === 0) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Recipe not found' }) };
    }

    return { statusCode: 200, body: JSON.stringify(comment) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
export default handler;
