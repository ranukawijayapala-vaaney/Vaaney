import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!;
const bucket = storage.bucket(bucketId);

const filePath = 'attached_assets/stock_images/commercial_printing__6744a903.jpg';
const destination = 'public/banners/printing-press.jpg';

async function uploadFile() {
  try {
    await bucket.upload(filePath, {
      destination: destination,
      metadata: {
        contentType: 'image/jpeg',
      },
    });
    console.log(`File uploaded to ${destination}`);
    console.log(`Public URL: https://storage.googleapis.com/${bucketId}/${destination}`);
  } catch (error) {
    console.error('Upload failed:', error);
    process.exit(1);
  }
}

uploadFile();
