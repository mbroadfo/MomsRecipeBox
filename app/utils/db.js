/**
 * Database utilities for MongoDB connections
 */

import { getDb } from '../app.js';

/**
 * Get a MongoDB collection
 * @param {string} collectionName - The name of the collection to retrieve
 * @returns {Promise<Collection>} A MongoDB collection object
 */
export async function getCollection(collectionName) {
  if (!collectionName) throw new Error('Collection name is required');
  const db = await getDb();
  return db.collection(collectionName);
}
