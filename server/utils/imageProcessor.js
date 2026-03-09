import sharp from 'sharp';
import logger from './logger.js';
import { v2 as cloudinary } from 'cloudinary';

/**
 * Process image before uploading to Cloudinary
 * Resizes to standard size, creates a thumbnail, and converts to WebP.
 */
export const processAndUploadImage = async (fileBuffer, fileName) => {
    try {
        const publicId = `sb_${Date.now()}_${fileName.split('.')[0]}`;

        // 1. Process main image (800x800 limit, WebP)
        const mainImageBuffer = await sharp(fileBuffer)
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

        // 2. Process thumbnail (200x200 crop, WebP)
        const thumbnailBuffer = await sharp(fileBuffer)
            .resize(200, 200, { fit: 'cover' })
            .webp({ quality: 70 })
            .toBuffer();

        // 3. Upload both to Cloudinary
        const [mainResult, thumbResult] = await Promise.all([
            uploadToCloudinary(mainImageBuffer, `${publicId}_main`),
            uploadToCloudinary(thumbnailBuffer, `${publicId}_thumb`),
        ]);

        return {
            url: mainResult.secure_url,
            thumbnailUrl: thumbResult.secure_url,
            publicId: mainResult.public_id,
        };
    } catch (error) {
        logger.error(`Image processing error: ${error.message}`);
        throw error;
    }
};

const uploadToCloudinary = (buffer, publicId) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'singglebee_products',
                public_id: publicId,
                resource_type: 'image',
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};
