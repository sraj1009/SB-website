import type { Meta, StoryObj } from '@storybook/react';
import { ProductCard } from './ProductCard';
import { fn } from '@storybook/test';

const meta: Meta<typeof ProductCard> = {
  title: 'Components/ProductCard',
  component: ProductCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'ProductCard component displays product information with interactive actions like add to cart, wishlist, and quick view.',
      },
    },
    a11y: {
      checks: {
        'aria-name': true,
        'aria-inputs-name': true,
        'color-contrast': true,
        'keyboard-navigation': true,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    product: {
      description: 'Product data to display',
      control: 'object',
    },
    onAddToCart: {
      description: 'Callback when add to cart is clicked',
      action: 'addToCart',
    },
    onQuickView: {
      description: 'Callback when quick view is clicked',
      action: 'quickView',
    },
    onToggleWishlist: {
      description: 'Callback when wishlist is toggled',
      action: 'toggleWishlist',
    },
    isLoading: {
      description: 'Loading state',
      control: 'boolean',
    },
    isInWishlist: {
      description: 'Whether product is in wishlist',
      control: 'boolean',
    },
    viewMode: {
      description: 'Display mode',
      control: 'select',
      options: ['grid', 'list'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Sample product data
const sampleProduct = {
  id: 1,
  name: 'Tamil Alphabet Book',
  price: 299.99,
  originalPrice: 399.99,
  description: 'Learn Tamil alphabets with colorful illustrations',
  category: 'BOOKS',
  language: 'Tamil',
  images: ['/product1.jpg'],
  rating: 4.5,
  reviews: 128,
  inStock: true,
  isNew: true,
  isOnSale: true,
  tags: ['educational', 'tamil', 'children'],
};

export const Default: Story = {
  args: {
    product: sampleProduct,
    onAddToCart: fn(),
    onQuickView: fn(),
    onToggleWishlist: fn(),
    isLoading: false,
    isInWishlist: false,
    viewMode: 'grid',
  },
};

export const InWishlist: Story = {
  args: {
    ...Default.args,
    isInWishlist: true,
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    isLoading: true,
  },
};

export const OutOfStock: Story = {
  args: {
    ...Default.args,
    product: {
      ...sampleProduct,
      inStock: false,
    },
  },
};

export const OnSale: Story = {
  args: {
    ...Default.args,
    product: {
      ...sampleProduct,
      isOnSale: true,
      originalPrice: 399.99,
      price: 299.99,
    },
  },
};

export const NewProduct: Story = {
  args: {
    ...Default.args,
    product: {
      ...sampleProduct,
      isNew: true,
    },
  },
};

export const HighRated: Story = {
  args: {
    ...Default.args,
    product: {
      ...sampleProduct,
      rating: 4.8,
      reviews: 256,
    },
  },
};

export const NoReviews: Story = {
  args: {
    ...Default.args,
    product: {
      ...sampleProduct,
      rating: 0,
      reviews: 0,
    },
  },
};

export const LongTitle: Story = {
  args: {
    ...Default.args,
    product: {
      ...sampleProduct,
      name: 'Advanced Tamil Grammar Book with Comprehensive Exercises and Cultural Context for Young Learners',
    },
  },
};

export const ListMode: Story = {
  args: {
    ...Default.args,
    viewMode: 'list',
  },
};

export const MultipleTags: Story = {
  args: {
    ...Default.args,
    product: {
      ...sampleProduct,
      tags: ['educational', 'tamil', 'children', 'beginner', 'colorful', 'interactive'],
    },
  },
};

// Responsive stories for different screen sizes
export const Mobile: Story = {
  ...Default.args,
  parameters: {
    viewport: {
      defaultViewport: 'iphone12',
    },
  },
};

export const Tablet: Story = {
  ...Default.args,
  parameters: {
    viewport: {
      defaultViewport: 'ipad',
    },
  },
};

export const Desktop: Story = {
  ...Default.args,
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
  },
};

// Dark mode stories
export const DarkMode: Story = {
  ...Default.args,
  parameters: {
    backgrounds: {
      default: 'dark',
    },
  },
};

// Accessibility stories
export const HighContrast: Story = {
  ...Default.args,
  parameters: {
    backgrounds: {
      default: 'high contrast',
    },
  },
};

// Interaction tests
export const Interaction: Story = {
  ...Default.args,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    
    // Test add to cart button
    const addToCartButton = canvas.getByRole('button', { name: /add to cart/i });
    await userEvent.click(addToCartButton);
    await expect(args.onAddToCart).toHaveBeenCalled();
    
    // Test wishlist toggle
    const wishlistButton = canvas.getByRole('button', { name: /wishlist/i });
    await userEvent.click(wishlistButton);
    await expect(args.onToggleWishlist).toHaveBeenCalled();
    
    // Test quick view
    const quickViewButton = canvas.getByRole('button', { name: /quick view/i });
    await userEvent.click(quickViewButton);
    await expect(args.onQuickView).toHaveBeenCalled();
  },
};

// Visual regression tests
export const VisualRegression: Story = {
  ...Default.args,
  parameters: {
    chromatic: {
      disable: false,
      modes: {
        light: { theme: 'light' },
        dark: { theme: 'dark' },
        mobile: { viewport: 'iphone12' },
        tablet: { viewport: 'ipad' },
      },
    },
  },
};

// Component variations for design system
export const DesignSystem: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', padding: '2rem' }}>
      {/* Default state */}
      <ProductCard
        product={sampleProduct}
        onAddToCart={fn()}
        onQuickView={fn()}
        onToggleWishlist={fn()}
      />
      
      {/* Hover state simulation */}
      <div style={{ transform: 'scale(1.05)', transition: 'transform 0.2s' }}>
        <ProductCard
          product={sampleProduct}
          onAddToCart={fn()}
          onQuickView={fn()}
          onToggleWishlist={fn()}
        />
      </div>
      
      {/* Focus state simulation */}
      <div style={{ outline: '2px solid #4299e1', outlineOffset: '2px' }}>
        <ProductCard
          product={sampleProduct}
          onAddToCart={fn()}
          onQuickView={fn()}
          onToggleWishlist={fn()}
        />
      </div>
    </div>
  ),
};
