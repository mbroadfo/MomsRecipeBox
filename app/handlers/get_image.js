import AWS from 'aws-sdk';
const s3 = new AWS.S3();

export async function handler(event) {
  const { id } = event.pathParameters;

  const bucketName = process.env.RECIPE_IMAGES_BUCKET;
  const key = `${id}/image`;

  console.debug(`Attempting to fetch image with key: ${key} from bucket: ${bucketName}`);
  try {
    const image = await s3.getObject({
      Bucket: bucketName,
      Key: key,
    }).promise();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': image.ContentType,
      },
      body: image.Body.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error(`Image not found for key: ${key}. Falling back to default image.`);
    console.debug(`Looking for default image with key: default.png in bucket: ${bucketName}`);

    try {
      const defaultImage = await s3.getObject({
        Bucket: bucketName,
        Key: 'default.png',
      }).promise();

      return {
        statusCode: 200,
        headers: {
          'Content-Type': defaultImage.ContentType,
        },
        body: defaultImage.Body.toString('base64'),
        isBase64Encoded: true,
      };
    } catch (defaultError) {
      console.error(`Default image not found: ${defaultError.message}`);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Failed to fetch image.', error: defaultError.message }),
      };
    }
  }
}
