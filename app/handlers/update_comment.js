import { ObjectId } from 'mongodb';
import { getDb } from '../app.js';

const handler = async (event) => {
  try {
    console.log('DEBUG update_comment event.pathParameters:', event.pathParameters);
    const { comment_id } = event.pathParameters;
    console.log('DEBUG update_comment extracted comment_id:', comment_id);
    const body = JSON.parse(event.body);
    const db = await getDb();

    const result = await db.collection('recipes').updateOne(
      { "comments._id": new ObjectId(comment_id) },
      { $set: { "comments.$.content": body.content, "comments.$.updated_at": new Date() } }
    );

    if (result.matchedCount === 0) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Comment not found' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'Comment updated' }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

export default handler;
