import React from 'react';
import Hero from '@components/Hero';
import AutoScrollProductBand from '@components/AutoScrollProductBand';
import TestimonialMarquee from '@components/TestimonialMarquee';
import { useProducts } from '@hooks/useProducts';
import { useUIStore } from '@store/index';

const HomePage: React.FC = () => {
  const { products } = useProducts({});
  const { selectedLanguage } = useUIStore();

  return (
    <>
      <Hero onShopNow={() => console.log('Navigate to shop')} />

      {/* Tamil Books Band */}
      <AutoScrollProductBand
        title="Tamil Books"
        products={products.filter((p) => p.language === 'Tamil')}
        onViewAll={() => {
          console.log('View all Tamil books');
        }}
        onProductClick={(product) => console.log('Product clicked:', product)}
        onAddToCart={(product) => console.log('Add to cart:', product)}
        onQuickView={(product) => console.log('Quick view:', product)}
        wishlist={[]}
        toggleWishlist={() => console.log('Toggle wishlist')}
        bgColor="bg-white"
      />

      {/* English Books Band */}
      <AutoScrollProductBand
        title="English Books"
        products={products.filter((p) => p.language === 'English')}
        onViewAll={() => {
          console.log('View all English books');
        }}
        onProductClick={(product) => console.log('Product clicked:', product)}
        onAddToCart={(product) => console.log('Add to cart:', product)}
        onQuickView={(product) => console.log('Quick view:', product)}
        wishlist={[]}
        toggleWishlist={() => console.log('Toggle wishlist')}
        bgColor="bg-brand-light"
        direction="right"
      />

      {/* Testimonials Band */}
      <TestimonialMarquee />
    </>
  );
};

export default HomePage;
