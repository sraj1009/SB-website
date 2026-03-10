import React, { useState, useRef, useEffect } from 'react';

interface ImageOptimizerProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpg' | 'png';
}

export const ImageOptimizer: React.FC<ImageOptimizerProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  loading = 'lazy',
  priority = false,
  placeholder = 'blur',
  blurDataURL,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  quality = 75,
  format = 'webp'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Generate optimized image URL
  const getOptimizedImageUrl = (originalSrc: string) => {
    // If using a CDN service like Cloudinary, Imgix, or Vercel
    if (originalSrc.includes('cloudinary') || originalSrc.includes('imgix')) {
      return `${originalSrc}?w=${width}&h=${height}&q=${quality}&f=${format}&auto=format`;
    }
    
    // For Vercel Image Optimization
    if (originalSrc.startsWith('/')) {
      return `/_next/image?url=${encodeURIComponent(originalSrc)}&w=${width}&h=${height}&q=${quality}`;
    }
    
    return originalSrc;
  };

  // Generate blur placeholder
  const generateBlurPlaceholder = () => {
    if (blurDataURL) return blurDataURL;
    
    // Generate a simple blur placeholder
    const canvas = document.createElement('canvas');
    canvas.width = width || 100;
    canvas.height = height || 100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, width || 100, height || 100);
    }
    return canvas.toDataURL();
  };

  const optimizedSrc = getOptimizedImageUrl(src);
  const blurSrc = placeholder === 'blur' ? generateBlurPlaceholder() : undefined;

  useEffect(() => {
    if (priority && imgRef.current) {
      // Preload priority images
      const img = new Image();
      img.src = optimizedSrc;
      img.onload = () => setIsLoaded(true);
    }
  }, [optimizedSrc, priority]);

  const handleError = () => {
    setError(true);
    console.error(`Failed to load image: ${src}`);
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  if (error) {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        style={{ width: width || '100%', height: height || 'auto' }}
      >
        <span className="text-gray-500 text-sm">Image not available</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Blur placeholder */}
      {placeholder === 'blur' && !isLoaded && (
        <div 
          className="absolute inset-0 blur-sm"
          style={{
            backgroundImage: `url(${blurSrc})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(20px)',
            transform: 'scale(1.1)'
          }}
        />
      )}
      
      {/* Main image */}
      <img
        ref={imgRef}
        src={optimizedSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : loading}
        sizes={sizes}
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        style={{
          objectFit: 'cover',
          width: width || '100%',
          height: height || 'auto'
        }}
      />
      
      {/* Loading skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  );
};

// Product image component with specific optimizations
export const ProductImage: React.FC<{
  product: {
    id: string;
    title: string;
    image: string;
  };
  size?: 'small' | 'medium' | 'large';
  className?: string;
}> = ({ product, size = 'medium', className = '' }) => {
  const sizeMap = {
    small: { width: 80, height: 80 },
    medium: { width: 200, height: 200 },
    large: { width: 400, height: 400 }
  };

  const { width, height } = sizeMap[size];

  return (
    <ImageOptimizer
      src={product.image}
      alt={product.title}
      width={width}
      height={height}
      className={`rounded-lg ${className}`}
      priority={size === 'large'}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
    />
  );
};

// Hero image component with full optimization
export const HeroImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className = '' }) => {
  return (
    <ImageOptimizer
      src={src}
      alt={alt}
      width={1200}
      height={600}
      className={className}
      priority={true}
      loading="eager"
      sizes="100vw"
      quality={85}
      placeholder="blur"
    />
  );
};

export default ImageOptimizer;
