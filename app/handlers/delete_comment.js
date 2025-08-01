import { ObjectId } from 'mongodb';
import { getDb } from '../mongoClient.js';

const handler = async (event) => {
  try {
    const { comment_id } = event.pathParameters;
    const db = await getDb();

    const result = await db.collection('recipes').updateOne(
      { "comments._id": new ObjectId(comment_id) },
      { $pull: { comments: { _id: new ObjectId(comment_id) } } }
    );

    if (result.matchedCount === 0) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Comment not found' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'Comment deleted' }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

export default handler;
