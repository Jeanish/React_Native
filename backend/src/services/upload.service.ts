import { v2 as cloudinary } from 'cloudinary';
import { Request } from 'express';
import multer from 'multer';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 */
export const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder: string = 'salon-app'
): Promise<{ url: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 800, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      }
    );

    // Convert buffer to stream and pipe to Cloudinary
    const bufferStream = new Readable();
    bufferStream.push(file.buffer);
    bufferStream.push(null);
    bufferStream.pipe(uploadStream);
  });
};

/**
 * Delete image from Cloudinary
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

/**
 * Upload multiple images to Cloudinary
 */
export const uploadMultipleToCloudinary = async (
  files: Express.Multer.File[],
  folder: string = 'salon-app'
): Promise<Array<{ url: string; publicId: string }>> => {
  const uploadPromises = files.map((file) => uploadToCloudinary(file, folder));
  return Promise.all(uploadPromises);
};

/**
 * Multer configuration for memory storage
 */
export const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB default
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/jpg').split(',');
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
    }
  },
});

export default {
  uploadToCloudinary,
  deleteFromCloudinary,
  uploadMultipleToCloudinary,
  multerUpload,
};
