import AWS from 'aws-sdk';
const s3 = new AWS.S3();

export async function handler(event) {
  const { id } = event.pathParameters;

  const bucketName = process.env.RECIPE_IMAGES_BUCKET;
  const key = `${id}/image`;

  try {
    await s3.deleteObject({
      Bucket: bucketName,
      Key: key,
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Image deleted successfully!' }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to delete image.', error: error.message }),
    };
  }
}
