import AWS from 'aws-sdk';
const s3 = new AWS.S3();

export async function handler(event) {
  const { id } = event.pathParameters;
  const body = JSON.parse(event.body);
  const { imageBase64, contentType } = body;

  const buffer = Buffer.from(imageBase64, 'base64');
  const bucketName = process.env.RECIPE_IMAGES_BUCKET;
  const key = `${id}/image`;

  try {
    await s3.putObject({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Image uploaded successfully!' }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to upload image.', error: error.message }),
    };
  }
}
