import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/environment.js';

const enabled =
  config.CLOUDINARY_CLOUD_NAME &&
  config.CLOUDINARY_API_KEY &&
  config.CLOUDINARY_API_SECRET;

if (enabled) {
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET
  });
} else {
  console.warn('[Cloudinary] Missing configuration. Falling back to base64 storage.');
}

const isDataUri = (value = '') => typeof value === 'string' && value.startsWith('data:');
const isHttpUrl = (value = '') => /^https?:\/\//i.test(value);

export const uploadBase64Image = async (base64, folderSuffix = '') => {
  if (!enabled) return { secure_url: base64 };
  if (!isDataUri(base64)) return { secure_url: base64 };

  const folder = [config.CLOUDINARY_FOLDER, folderSuffix]
    .filter(Boolean)
    .join('/');

  const result = await cloudinary.uploader.upload(base64, {
    folder,
    resource_type: 'image'
  });
  return result;
};

export const uploadImageIfNeeded = async (value, folderSuffix = '') => {
  if (!value || typeof value !== 'string') return null;

  if (isHttpUrl(value) && !isDataUri(value)) {
    return value;
  }

  const uploaded = await uploadBase64Image(value, folderSuffix);
  return uploaded?.secure_url || null;
};

export const uploadManyImages = async (values = [], folderSuffix = '') => {
  const uploads = await Promise.all(
    values.map(async (value) => {
      try {
        return await uploadImageIfNeeded(value, folderSuffix);
      } catch (error) {
        console.error('[Cloudinary] Failed to upload image', error?.message);
        return null;
      }
    })
  );
  return uploads.filter(Boolean);
};


