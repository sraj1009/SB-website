import React, { useState } from 'react';
import { 
  Palette, 
  Type, 
  MousePointer, 
  Square, 
  Circle, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  Moon, 
  Sun,
  Copy,
  Download,
  ChevronRight,
  ChevronLeft,
  Menu,
  XCircle,
  CheckCircle,
  AlertCircle,
  Info,
  Loader2,
  Heart,
  Star,
  ShoppingCart,
  User,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import BeeIcon from './BeeIcon';

// TypeScript interface definitions for design system
interface DesignToken {
  name: string;
  value: string;
  description: string;
  category: 'color' | 'typography' | 'spacing' | 'border-radius' | 'shadow' | 'breakpoint';
}

interface ComponentVariant {
  name: string;
  props: Record<string, any>;
  className: string;
  description: string;
}

interface ComponentDocumentation {
  name: string;
  category: string;
  description: string;
  variants: ComponentVariant[];
  accessibility: {
    contrastRatio?: string;
    ariaLabels?: string[];
    keyboardNavigation?: boolean;
  };
  tailwindClasses: string[];
}

const DesignSystemDocumentation: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeSection, setActiveSection] = useState('colors');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Design tokens
  const designTokens: DesignToken[] = [
    // Colors
    { name: 'primary-500', value: '#FFA500', description: 'Honey Gold - Primary brand color', category: 'color' },
    { name: 'primary-600', value: '#F59E0B', description: 'Darker honey gold', category: 'color' },
    { name: 'primary-400', value: '#FCD34D', description: 'Lighter honey gold', category: 'color' },
    { name: 'cream', value: '#FFF8E7', description: 'Cream background', category: 'color' },
    { name: 'green-600', value: '#2D5016', description: 'Forest Green - Secondary accent', category: 'color' },
    { name: 'gray-900', value: '#1F2937', description: 'Charcoal - Text color', category: 'color' },
    { name: 'white', value: '#FFFFFF', description: 'Pure white', category: 'color' },
    
    // Typography
    { name: 'text-4xl', value: '48px', description: 'H1 - Display headings', category: 'typography' },
    { name: 'text-3xl', value: '36px', description: 'H2 - Large headings', category: 'typography' },
    { name: 'text-2xl', value: '24px', description: 'H3 - Medium headings', category: 'typography' },
    { name: 'text-base', value: '16px', description: 'Body text', category: 'typography' },
    { name: 'text-sm', value: '14px', description: 'Small text', category: 'typography' },
    { name: 'font-black', value: '900', description: 'Black font weight', category: 'typography' },
    { name: 'font-bold', value: '700', description: 'Bold font weight', category: 'typography' },
    { name: 'font-medium', value: '500', description: 'Medium font weight', category: 'typography' },
    
    // Spacing (8pt grid system)
    { name: 'p-1', value: '4px', description: '0.5rem - Base unit', category: 'spacing' },
    { name: 'p-2', value: '8px', description: '1rem - Base unit', category: 'spacing' },
    { name: 'p-3', value: '12px', description: '1.5rem', category: 'spacing' },
    { name: 'p-4', value: '16px', description: '2rem', category: 'spacing' },
    { name: 'p-6', value: '24px', description: '3rem', category: 'spacing' },
    { name: 'p-8', value: '32px', description: '4rem', category: 'spacing' },
    { name: 'p-12', value: '48px', description: '6rem', category: 'spacing' },
    { name: 'p-16', value: '64px', description: '8rem', category: 'spacing' },
    
    // Border radius
    { name: 'rounded-sm', value: '4px', description: 'Small radius', category: 'border-radius' },
    { name: 'rounded', value: '8px', description: 'Medium radius', category: 'border-radius' },
    { name: 'rounded-lg', value: '12px', description: 'Large radius', category: 'border-radius' },
    { name: 'rounded-xl', value: '16px', description: 'Extra large radius', category: 'border-radius' },
    { name: 'rounded-2xl', value: '24px', description: '2x large radius', category: 'border-radius' },
    { name: 'rounded-3xl', value: '32px', description: '3x large radius', category: 'border-radius' },
    { name: 'rounded-full', value: '9999px', description: 'Full circle', category: 'border-radius' },
    
    // Shadows
    { name: 'shadow-sm', value: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', description: 'Small shadow', category: 'shadow' },
    { name: 'shadow', value: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', description: 'Default shadow', category: 'shadow' },
    { name: 'shadow-md', value: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', description: 'Medium shadow', category: 'shadow' },
    { name: 'shadow-lg', value: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', description: 'Large shadow', category: 'shadow' },
    { name: 'shadow-xl', value: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', description: 'Extra large shadow', category: 'shadow' },
    { name: 'shadow-2xl', value: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', description: '2x large shadow', category: 'shadow' },
    
    // Breakpoints
    { name: 'sm', value: '640px', description: 'Small screens', category: 'breakpoint' },
    { name: 'md', value: '768px', description: 'Medium screens', category: 'breakpoint' },
    { name: 'lg', value: '1024px', description: 'Large screens', category: 'breakpoint' },
    { name: 'xl', value: '1280px', description: 'Extra large screens', category: 'breakpoint' },
    { name: '2xl', value: '1536px', description: '2x large screens', category: 'breakpoint' },
  ];

  // Component documentation
  const components: ComponentDocumentation[] = [
    {
      name: 'Button',
      category: 'interactive',
      description: 'Interactive button with multiple variants and states',
      variants: [
        { name: 'Primary', props: { children: 'Primary Button' }, className: 'bg-amber-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-600 transition-colors', description: 'Main action button' },
        { name: 'Secondary', props: { children: 'Secondary' }, className: 'bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors', description: 'Secondary action' },
        { name: 'Tertiary', props: { children: 'Tertiary' }, className: 'bg-gray-200 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors', description: 'Tertiary action' },
        { name: 'Ghost', props: { children: 'Ghost' }, className: 'border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors', description: 'Minimal button' },
      ],
      accessibility: {
        contrastRatio: '4.5:1',
        ariaLabels: ['button label'],
        keyboardNavigation: true
      },
      tailwindClasses: ['bg-amber-500', 'text-white', 'px-6', 'py-3', 'rounded-lg', 'font-semibold', 'hover:bg-amber-600', 'transition-colors']
    },
    {
      name: 'Input',
      category: 'forms',
      description: 'Form input field with validation states',
      variants: [
        { name: 'Default', props: { placeholder: 'Enter text...' }, className: 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent', description: 'Standard input' },
        { name: 'Error', props: { placeholder: 'Error state' }, className: 'w-full px-4 py-2 border border-red-500 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent', description: 'Error state' },
        { name: 'Success', props: { placeholder: 'Success state' }, className: 'w-full px-4 py-2 border border-green-500 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent', description: 'Success state' },
      ],
      accessibility: {
        contrastRatio: '4.5:1',
        ariaLabels: ['input label', 'error message'],
        keyboardNavigation: true
      },
      tailwindClasses: ['w-full', 'px-4', 'py-2', 'border', 'border-gray-300', 'rounded-lg', 'focus:ring-2', 'focus:ring-amber-500', 'focus:border-transparent']
    },
    {
      name: 'Card',
      category: 'layout',
      description: 'Container component for content grouping',
      variants: [
        { name: 'Product Card', props: { title: 'Product', price: '$29.99' }, className: 'bg-white rounded-xl shadow-lg p-6 border border-gray-200', description: 'Product display card' },
        { name: 'Feature Card', props: { title: 'Feature', description: 'Description' }, className: 'bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200', description: 'Feature highlight' },
        { name: 'Testimonial Card', props: { quote: 'Great product!', author: 'Customer' }, className: 'bg-white rounded-xl shadow-md p-6 border border-gray-100', description: 'Customer testimonial' },
      ],
      accessibility: {
        contrastRatio: '4.5:1',
        ariaLabels: ['card title', 'card content'],
        keyboardNavigation: false
      },
      tailwindClasses: ['bg-white', 'rounded-xl', 'shadow-lg', 'p-6', 'border', 'border-gray-200']
    },
    {
      name: 'Alert',
      category: 'feedback',
      description: 'Feedback messages for user actions',
      variants: [
        { name: 'Success', props: { message: 'Operation successful!' }, className: 'bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2', description: 'Success message' },
        { name: 'Error', props: { message: 'Something went wrong!' }, className: 'bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2', description: 'Error message' },
        { name: 'Warning', props: { message: 'Please review!' }, className: 'bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg flex items-center gap-2', description: 'Warning message' },
        { name: 'Info', props: { message: 'Information!' }, className: 'bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex items-center gap-2', description: 'Information message' },
      ],
      accessibility: {
        contrastRatio: '4.5:1',
        ariaLabels: ['alert message', 'alert type'],
        keyboardNavigation: true
      },
      tailwindClasses: ['bg-green-50', 'border', 'border-green-200', 'text-green-800', 'px-4', 'py-3', 'rounded-lg', 'flex', 'items-center', 'gap-2']
    },
    {
      name: 'Modal',
      category: 'feedback',
      description: 'Overlay dialog for important interactions',
      variants: [
        { name: 'Default', props: { title: 'Modal Title', children: 'Modal content' }, className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4', description: 'Standard modal overlay' },
        { name: 'Content', props: { title: 'Title', children: 'Content' }, className: 'bg-white rounded-2xl shadow-2xl max-w-md w-full p-6', description: 'Modal content container' },
      ],
      accessibility: {
        contrastRatio: '4.5:1',
        ariaLabels: ['modal title', 'close button'],
        keyboardNavigation: true
      },
      tailwindClasses: ['fixed', 'inset-0', 'bg-black', 'bg-opacity-50', 'flex', 'items-center', 'justify-center', 'p-4']
    },
    {
      name: 'Loading',
      category: 'feedback',
      description: 'Loading indicators for async operations',
      variants: [
        { name: 'Spinner', props: {}, className: 'animate-spin w-6 h-6 text-amber-500', description: 'Rotating spinner' },
        { name: 'Dots', props: {}, className: 'flex gap-2', description: 'Animated dots' },
        { name: 'Skeleton', props: {}, className: 'animate-pulse bg-gray-200 rounded h-4 w-full', description: 'Skeleton placeholder' },
      ],
      accessibility: {
        ariaLabels: ['loading indicator'],
        keyboardNavigation: false
      },
      tailwindClasses: ['animate-spin', 'w-6', 'h-6', 'text-amber-500']
    }
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const sections = [
    { id: 'colors', name: 'Color Palette', icon: Palette },
    { id: 'typography', name: 'Typography', icon: Type },
    { id: 'components', name: 'Components', icon: Square },
    { id: 'tokens', name: 'Design Tokens', icon: Circle },
  ];

  const filteredTokens = designTokens.filter(token => 
    activeSection === 'colors' ? token.category === 'color' :
    activeSection === 'typography' ? token.category === 'typography' :
    activeSection === 'tokens' ? !['color', 'typography'].includes(token.category) :
    []
  );

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} relative overflow-hidden`}>
      {/* 8pt Grid Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px', // 8pt grid = 4px * 8 = 32px
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/90 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-500 rounded-lg flex items-center justify-center">
                <BeeIcon size={24} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold">SINGGLEBEE Design System</h1>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              {/* Export Buttons */}
              <button
                onClick={() => copyToClipboard(window.location.href)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Copy link"
              >
                <Copy className="w-5 h-5" />
              </button>
              <button
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Export design tokens"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="sticky top-16 z-40 backdrop-blur-lg bg-white/90 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`py-4 px-2 border-b-2 transition-colors flex items-center gap-2 ${
                    activeSection === section.id
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{section.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Colors Section */}
        {activeSection === 'colors' && (
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Color Palette</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Our brand colors are inspired by honey and nature, creating a warm and inviting experience
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredTokens.map((token) => (
                <div key={token.name} className="group">
                  <div
                    className="h-32 rounded-xl shadow-lg mb-4 relative overflow-hidden"
                    style={{ backgroundColor: token.value }}
                  >
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200" />
                    <button
                      onClick={() => copyToClipboard(token.value)}
                      className="absolute top-2 right-2 p-2 bg-white/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <h3 className="font-semibold">{token.name}</h3>
                    <p className="text-sm text-gray-600">{token.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{token.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Typography Section */}
        {activeSection === 'typography' && (
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Typography Scale</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Consistent typography hierarchy using Inter font family
              </p>
            </div>

            <div className="space-y-8 max-w-4xl mx-auto">
              {filteredTokens.map((token) => (
                <div key={token.name} className="flex items-center justify-between p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                  <div>
                    <h3 className="font-semibold mb-2">{token.name}</h3>
                    <p className="text-sm text-gray-600">{token.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{token.description}</p>
                  </div>
                  <div className={token.name} style={{ fontSize: token.value }}>
                    The quick brown fox jumps over the lazy dog
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Components Section */}
        {activeSection === 'components' && (
          <div className="space-y-12">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">UI Components</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Reusable components with consistent styling and accessibility
              </p>
            </div>

            {components.map((component) => (
              <div key={component.name} className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-2xl font-bold mb-2">{component.name}</h3>
                  <p className="text-gray-600 mb-6">{component.description}</p>
                  
                  {/* Component Variants */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    {component.variants.map((variant) => (
                      <div key={variant.name} className="space-y-2">
                        <h4 className="font-semibold text-sm">{variant.name}</h4>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className={variant.className}>
                            {variant.name === 'Button' && variant.props.children}
                            {variant.name === 'Input' && <input {...variant.props} className={variant.className} />}
                            {variant.name === 'Alert' && (
                              <div className={variant.className}>
                                <AlertCircle className="w-5 h-5" />
                                <span>{variant.props.message}</span>
                              </div>
                            )}
                            {variant.name === 'Card' && (
                              <div className={variant.className}>
                                <h4 className="font-semibold">{variant.props.title}</h4>
                                {variant.props.price && <p className="text-amber-600">{variant.props.price}</p>}
                                {variant.props.description && <p className="text-gray-600">{variant.props.description}</p>}
                                {variant.props.quote && (
                                  <blockquote className="italic text-gray-700">"{variant.props.quote}"</blockquote>
                                )}
                                {variant.props.author && <p className="text-sm text-gray-500">- {variant.props.author}</p>}
                              </div>
                            )}
                            {variant.name === 'Modal' && (
                              <div className="relative">
                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                                  <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                                    <h4 className="text-lg font-semibold mb-2">{variant.props.title}</h4>
                                    <p className="text-gray-600">{variant.props.children}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            {variant.name === 'Loading' && (
                              <div className="flex items-center gap-4">
                                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                                <div className="flex gap-1">
                                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" />
                                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce delay-100" />
                                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce delay-200" />
                                </div>
                                <div className="w-full h-4 bg-gray-200 rounded animate-pulse" />
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">{variant.description}</p>
                      </div>
                    ))}
                  </div>

                  {/* Component Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Accessibility</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Contrast Ratio: {component.accessibility.contrastRatio}</li>
                        <li>• Keyboard Navigation: {component.accessibility.keyboardNavigation ? 'Yes' : 'No'}</li>
                        <li>• ARIA Labels: {component.accessibility.ariaLabels?.join(', ')}</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Tailwind Classes</h4>
                      <div className="flex flex-wrap gap-1">
                        {component.tailwindClasses.slice(0, 6).map((className) => (
                          <span key={className} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {className}
                          </span>
                        ))}
                        {component.tailwindClasses.length > 6 && (
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            +{component.tailwindClasses.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Design Tokens Section */}
        {activeSection === 'tokens' && (
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Design Tokens</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Systematic design values for consistency across the platform
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-xl shadow-sm border border-gray-200">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left p-4 font-semibold">Token</th>
                    <th className="text-left p-4 font-semibold">Value</th>
                    <th className="text-left p-4 font-semibold">Category</th>
                    <th className="text-left p-4 font-semibold">Description</th>
                    <th className="text-left p-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTokens.map((token) => (
                    <tr key={token.name} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{token.name}</code>
                      </td>
                      <td className="p-4">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{token.value}</code>
                      </td>
                      <td className="p-4">
                        <span className="text-sm bg-amber-100 text-amber-800 px-2 py-1 rounded">
                          {token.category}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-600">{token.description}</td>
                      <td className="p-4">
                        <button
                          onClick={() => copyToClipboard(token.value)}
                          className="text-amber-600 hover:text-amber-700"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center text-gray-600">
            <p className="mb-2">SINGGLEBEE Design System v1.0</p>
            <p className="text-sm">Built with React, TypeScript, and Tailwind CSS</p>
          </div>
        </div>
      </footer>

      {/* Copy Notification */}
      {copiedToken && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>Copied: {copiedToken}</span>
        </div>
      )}
    </div>
  );
};

export default DesignSystemDocumentation;
