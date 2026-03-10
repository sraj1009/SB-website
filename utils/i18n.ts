// 🌐 Internationalization (i18n) for SINGGLEBEE

import React, { createContext, useContext, useState, useEffect } from 'react';

// Language types
export type Language = 'en' | 'ta' | 'hi';

// Translation interface
interface Translation {
  [key: string]: string | Translation;
}

// Translation data
const translations: Record<Language, Translation> = {
  en: {
    // Navigation
    nav: {
      home: 'Home',
      products: 'Products',
      about: 'About',
      contact: 'Contact',
      login: 'Login',
      register: 'Register',
      cart: 'Cart',
      profile: 'Profile',
      logout: 'Logout'
    },
    // Common
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      price: 'Price',
      quantity: 'Quantity',
      total: 'Total',
      submit: 'Submit',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      close: 'Close',
      ok: 'OK',
      yes: 'Yes',
      no: 'No'
    },
    // Product
    product: {
      title: 'Title',
      description: 'Description',
      category: 'Category',
      ageGroup: 'Age Group',
      language: 'Language',
      inStock: 'In Stock',
      outOfStock: 'Out of Stock',
      addToCart: 'Add to Cart',
      buyNow: 'Buy Now',
      reviews: 'Reviews',
      rating: 'Rating',
      specifications: 'Specifications',
      shipping: 'Shipping',
      returns: 'Returns'
    },
    // Categories
    categories: {
      books: 'Books',
      poems: 'Poems',
      rhymes: 'Rhymes',
      stories: 'Stories',
      educational: 'Educational',
      toys: 'Toys',
      supplies: 'Supplies',
      flashcards: 'Flash Cards'
    },
    // Age Groups
    ageGroups: {
      '0-2': '0-2 years',
      '3-5': '3-5 years',
      '6-8': '6-8 years',
      '9-12': '9-12 years',
      '13+': '13+ years'
    },
    // Cart
    cart: {
      title: 'Shopping Cart',
      empty: 'Your cart is empty',
      itemAdded: 'Item added to cart',
      itemRemoved: 'Item removed from cart',
      checkout: 'Checkout',
      subtotal: 'Subtotal',
      tax: 'Tax',
      shipping: 'Shipping',
      discount: 'Discount',
      grandTotal: 'Grand Total',
      continueShopping: 'Continue Shopping',
      proceedToPayment: 'Proceed to Payment'
    },
    // Checkout
    checkout: {
      title: 'Checkout',
      shippingAddress: 'Shipping Address',
      billingAddress: 'Billing Address',
      paymentMethod: 'Payment Method',
      orderSummary: 'Order Summary',
      placeOrder: 'Place Order',
      processing: 'Processing...',
      success: 'Order placed successfully!',
      failed: 'Order failed. Please try again.'
    },
    // User
    user: {
      profile: 'Profile',
      orders: 'Orders',
      wishlist: 'Wishlist',
      settings: 'Settings',
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      city: 'City',
      state: 'State',
      pincode: 'Pincode',
      country: 'Country',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      updateProfile: 'Update Profile',
      changePassword: 'Change Password'
    },
    // Auth
    auth: {
      login: 'Login',
      register: 'Register',
      forgotPassword: 'Forgot Password?',
      resetPassword: 'Reset Password',
      createAccount: 'Create Account',
      alreadyHaveAccount: 'Already have an account?',
      dontHaveAccount: "Don't have an account?",
      welcomeBack: 'Welcome Back!',
      createNewAccount: 'Create New Account',
      loginSuccess: 'Login successful!',
      registerSuccess: 'Registration successful!',
      logoutSuccess: 'Logout successful!'
    },
    // Search
    search: {
      placeholder: 'Search for books, poems, rhymes, stories...',
      noResults: 'No results found',
      suggestions: 'Suggestions',
      trending: 'Trending',
      recent: 'Recent',
      filters: 'Filters',
      clearFilters: 'Clear Filters',
      sortBy: 'Sort By',
      relevance: 'Relevance',
      priceLowToHigh: 'Price: Low to High',
      priceHighToLow: 'Price: High to Low',
      newest: 'Newest',
      oldest: 'Oldest',
      rating: 'Rating',
      popular: 'Popular'
    },
    // Error messages
    errors: {
      networkError: 'Network error. Please check your connection.',
      serverError: 'Server error. Please try again later.',
      notFound: 'Page not found.',
      unauthorized: 'Unauthorized access.',
      validationError: 'Please check your input.',
      cartError: 'Failed to update cart.',
      paymentError: 'Payment failed. Please try again.',
      generalError: 'Something went wrong. Please try again.'
    },
    // Success messages
    success: {
      itemAdded: 'Item added to cart successfully!',
      orderPlaced: 'Order placed successfully!',
      profileUpdated: 'Profile updated successfully!',
      passwordChanged: 'Password changed successfully!',
      reviewSubmitted: 'Review submitted successfully!'
    },
    // Footer
    footer: {
      about: 'About Us',
      contact: 'Contact Us',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      refund: 'Refund Policy',
      shipping: 'Shipping Info',
      faq: 'FAQ',
      social: 'Follow Us',
      newsletter: 'Subscribe to our newsletter',
      copyright: '© 2024 SINGGLEBEE. All rights reserved.'
    }
  },
  ta: {
    // Navigation
    nav: {
      home: 'முகப்பு',
      products: 'தயாரிப்புகள்',
      about: 'எங்களைப் பற்றி',
      contact: 'தொடர்பு',
      login: 'உள்நுழைய',
      register: 'பதிவு',
      cart: 'வண்டி',
      profile: 'சுயவிவரம்',
      logout: 'வெளியேறு'
    },
    // Common
    common: {
      loading: 'ஏற்றுமதி...',
      error: 'பிழை',
      success: 'வெற்றி',
      save: 'சேமி',
      cancel: 'ரத்து',
      delete: 'நீக்கு',
      edit: 'தொகு',
      view: 'காட்டு',
      search: 'தேடு',
      filter: 'வடிகட்டு',
      sort: 'வரிசை',
      price: 'விலை',
      quantity: 'அளவு',
      total: 'மொத்தம்',
      submit: 'சமர்ப்பு',
      back: 'பின்',
      next: 'அடுத்து',
      previous: 'முந்தைய',
      close: 'மூடு',
      ok: 'சரி',
      yes: 'ஆம்',
      no: 'இல்லை'
    },
    // Product
    product: {
      title: 'தலைப்பொடி',
      description: 'விளக்கம்',
      category: 'வகை',
      ageGroup: 'வயது குழு',
      language: 'மொழி',
      inStock: 'பண்டத்தில் உள்ளது',
      outOfStock: 'பண்டத்தில் இல்லை',
      addToCart: 'வண்டியில் சேர்',
      buyNow: 'இப்போதே வாங்கு',
      reviews: 'விமர்சனங்கள்',
      rating: 'மதிப்பீடு',
      specifications: 'விவரக்குறிப்புகள்',
      shipping: 'ஷிப்பிங்',
      returns: 'திருப்பங்கள்'
    },
    // Categories
    categories: {
      books: 'புத்தகங்கள்',
      poems: 'கவிதைகள்',
      rhymes: 'அச்சுகள்',
      stories: 'கதைகள்',
      educational: 'கல்வி',
      toys: 'பொம்மைகள்',
      supplies: 'பொருட்கள்',
      flashcards: 'பிளாஷ் கார்டுகள்'
    },
    // Age Groups
    ageGroups: {
      '0-2': '0-2 ஆண்டுகள்',
      '3-5': '3-5 ஆண்டுகள்',
      '6-8': '6-8 ஆண்டுகள்',
      '9-12': '9-12 ஆண்டுகள்',
      '13+': '13+ ஆண்டுகள்'
    },
    // Cart
    cart: {
      title: 'ஷாப்பிங் வண்டி',
      empty: 'உங்கள் வண்டி காலியாக உள்ளது',
      itemAdded: 'பொருள் வண்டியில் சேர்க்கப்பட்டது',
      itemRemoved: 'பொருள் வண்டியிலிருந்து அகற்றப்பட்டது',
      checkout: 'செக்கவுட்',
      subtotal: 'துணை மொத்தம்',
      tax: 'வரி',
      shipping: 'ஷிப்பிங்',
      discount: 'தள்ளுபடி',
      grandTotal: 'மொத்த தொகை',
      continueShopping: 'ஷாப்பிங் தொடரு',
      proceedToPayment: 'கட்டணத்திற்குச் செல்'
    },
    // Checkout
    checkout: {
      title: 'செக்கவுட்',
      shippingAddress: 'ஷிப்பிங் முகவரி',
      billingAddress: 'பில்லிங் முகவரி',
      paymentMethod: 'கட்டண முறை',
      orderSummary: 'ஆர்டர் சுருக்கம்',
      placeOrder: 'ஆர்டர் வை',
      processing: 'செயலாக்கம்...',
      success: 'ஆர்டர் வெற்றிகரமாக வைக்கப்பட்டது!',
      failed: 'ஆர்டர் தோல்வியடைந்தது. மீண்டும் முயற்சி செய்யவும்.'
    },
    // User
    user: {
      profile: 'சுயவிவரம்',
      orders: 'ஆர்டர்கள்',
      wishlist: 'விருப்பப்பட்டியல்',
      settings: 'அமைப்புகள்',
      firstName: 'முதல் பெயர்',
      lastName: 'கடைசி பெயர்',
      email: 'மின்னஞ்சல்',
      phone: 'தொலைபேசி',
      address: 'முகவரி',
      city: 'நகரம்',
      state: 'மாநிலம்',
      pincode: 'அஞ்சல் குறியீடு',
      country: 'நாடு',
      password: 'கடவுச்சொல்',
      confirmPassword: 'கடவுச்சொல்லை உறுதிப்படுத்து',
      updateProfile: 'சுயவிவரத்தை புதுப்பி',
      changePassword: 'கடவுச்சொல்லை மாற்று'
    },
    // Auth
    auth: {
      login: 'உள்நுழைய',
      register: 'பதிவு',
      forgotPassword: 'கடவுச்சொல்லை மறந்தாலா?',
      resetPassword: 'கடவுச்சொல்லை மீட்டமை',
      createAccount: 'கணக்கை உருவாக்கு',
      alreadyHaveAccount: 'ஏற்கனவே கணக்கை உள்ளதா?',
      dontHaveAccount: 'கணக்கை இல்லையா?',
      welcomeBack: 'மீண்டும் வருக!',
      createNewAccount: 'புதிய கணக்கை உருவாக்கு',
      loginSuccess: 'உள்நுழைவு வெற்றிகரமாக!',
      registerSuccess: 'பதிவு வெற்றிகரமாக!',
      logoutSuccess: 'வெளியேற்றம் வெற்றிகரமாக!'
    },
    // Search
    search: {
      placeholder: 'புத்தகங்கள், கவிதைகள், அச்சுகள், கதைகளுக்குத் தேடு...',
      noResults: 'முடிவுகள் இல்லை',
      suggestions: 'பரிந்துரைக்கள்',
      trending: 'பிரபலமானவை',
      recent: 'அண்மையிலானவை',
      filters: 'வடிகட்டிகள்',
      clearFilters: 'வடிகட்டிகளை அழி',
      sortBy: 'இவ்வாறு வரிசை',
      relevance: 'தொடர்பு',
      priceLowToHigh: 'விலை: குறைவாக உயர்வாக',
      priceHighToLow: 'விலை: உயர்வாக குறைவாக',
      newest: 'புதியது',
      oldest: 'பழையது',
      rating: 'மதிப்பீடு',
      popular: 'பிரபலமானது'
    },
    // Error messages
    errors: {
      networkError: 'நெட்வொர்க் பிழை. உங்கள் இணைப்பைச் சரிபார்க்கவும்.',
      serverError: 'சர்வர் பிழை. பிறகு மீண்டும் முயற்சி செய்யவும்.',
      notFound: 'பக்கம் காணவில்லை.',
      unauthorized: 'அங்கீகரிக்கப்படாத அணுகல்.',
      validationError: 'உங்கள் உள்ளீட்டைச் சரிபார்க்கவும்.',
      cartError: 'வண்டியைப் புதுப்பிக்கத் தவறிவிட்டது.',
      paymentError: 'கட்டணம் தோல்வியடைந்தது. மீண்டும் முயற்சி செய்யவும்.',
      generalError: 'ஏதோ தவறு நேர்ந்தது. மீண்டும் முயற்சி செய்யவும்.'
    },
    // Success messages
    success: {
      itemAdded: 'பொருள் வண்டியில் வெற்றிகரமாகச் சேர்க்கப்பட்டது!',
      orderPlaced: 'ஆர்டர் வெற்றிகரமாக வைக்கப்பட்டது!',
      profileUpdated: 'சுயவிவரம் வெற்றிகரமாகப் புதுப்பிக்கப்பட்டது!',
      passwordChanged: 'கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது!',
      reviewSubmitted: 'விமர்சனம் வெற்றிகரமாகச் சமர்ப்பிக்கப்பட்டது!'
    },
    // Footer
    footer: {
      about: 'எங்களைப் பற்றி',
      contact: 'எங்களைத் தொடர்பு கொள்ள',
      privacy: 'தனியுரிமைக் கொள்கை',
      terms: 'சேவை விதிமுறைகள்',
      refund: 'திருப்பக் கொள்கை',
      shipping: 'ஷிப்பிங் தகவல்',
      faq: 'அடிக்கடை',
      social: 'எங்களைப் பின்தொடரவும்',
      newsletter: 'எங்கள் செய்தியைப் பதிவு செய்யுங்கள்',
      copyright: '© 2024 சிங்கிள்பீ. அனைத்த உரிமைகளும் பாதுகாக்கப்பட்டவை.'
    }
  },
  hi: {
    // Navigation
    nav: {
      home: 'होम',
      products: 'उत्पाद',
      about: 'हमारे बारे में',
      contact: 'संपर्क',
      login: 'लॉगिन',
      register: 'रजिस्टर',
      cart: 'कार्ट',
      profile: 'प्रोफाइल',
      logout: 'लॉगआउट'
    },
    // Common
    common: {
      loading: 'लोड हो रहा है...',
      error: 'त्रुटि',
      success: 'सफलता',
      save: 'सेव करें',
      cancel: 'रद्द करें',
      delete: 'हटाएं',
      edit: 'संपादित करें',
      view: 'देखें',
      search: 'खोजें',
      filter: 'फिल्टर',
      sort: 'सॉर्ट',
      price: 'मूल्य',
      quantity: 'मात्रा',
      total: 'कुल',
      submit: 'जमा करें',
      back: 'पीछे',
      next: 'अगला',
      previous: 'पिछला',
      close: 'बंद',
      ok: 'ठीक',
      yes: 'हाँ',
      no: 'नहीं'
    },
    // Product
    product: {
      title: 'शीर्षक',
      description: 'विवरण',
      category: 'श्रेणी',
      ageGroup: 'आयु वर्ग',
      language: 'भाषा',
      inStock: 'स्टॉक में है',
      outOfStock: 'स्टॉक में नहीं है',
      addToCart: 'कार्ट में जोड़ें',
      buyNow: 'अभी खरीदें',
      reviews: 'समीक्षा',
      rating: 'रेटिंग',
      specifications: 'विनिर्देश',
      shipping: 'शिपिंग',
      returns: 'रिटर्न'
    },
    // Categories
    categories: {
      books: 'किताबें',
      poems: 'कविताएं',
      rhymes: 'छंद',
      stories: 'कहानियां',
      educational: 'शैक्षणिक',
      toys: 'खिलौने',
      supplies: 'सामग्री',
      flashcards: 'फ्लैश कार्ड'
    },
    // Age Groups
    ageGroups: {
      '0-2': '0-2 साल',
      '3-5': '3-5 साल',
      '6-8': '6-8 साल',
      '9-12': '9-12 साल',
      '13+': '13+ साल'
    },
    // Cart
    cart: {
      title: 'शॉपिंग कार्ट',
      empty: 'आपका कार्ट खाली है',
      itemAdded: 'आइटम कार्ट में जोड़ा गया',
      itemRemoved: 'आइटम कार्ट से हटा दिया गया',
      checkout: 'चेकआउट',
      subtotal: 'उप-योग',
      tax: 'कर',
      shipping: 'शिपिंग',
      discount: 'छूट',
      grandTotal: 'कुल योग',
      continueShopping: 'खरीदारी जारी रखें',
      proceedToPayment: 'भुगतान के लिए आगे बढ़ें'
    },
    // Checkout
    checkout: {
      title: 'चेकआउट',
      shippingAddress: 'शिपिंग पता',
      billingAddress: 'बिलिंग पता',
      paymentMethod: 'भुगतान विधि',
      orderSummary: 'ऑर्डर सारांश',
      placeOrder: 'ऑर्डर दें',
      processing: 'प्रसंस्करण...',
      success: 'ऑर्डर सफलतापूर्वक दिया गया!',
      failed: 'ऑर्डर विफल हो गया। कृपया फिर से कोशिश करें।'
    },
    // User
    user: {
      profile: 'प्रोफाइल',
      orders: 'ऑर्डर',
      wishlist: 'इच्छा सूची',
      settings: 'सेटिंग्स',
      firstName: 'पहला नाम',
      lastName: 'अंतिम नाम',
      email: 'ईमेल',
      phone: 'फोन',
      address: 'पता',
      city: 'शहर',
      state: 'राज्य',
      pincode: 'पिनकोड',
      country: 'देश',
      password: 'पासवर्ड',
      confirmPassword: 'पासवर्ड की पुष्टि करें',
      updateProfile: 'प्रोफाइल अपडेट करें',
      changePassword: 'पासवर्ड बदलें'
    },
    // Auth
    auth: {
      login: 'लॉगिन',
      register: 'रजिस्टर',
      forgotPassword: 'पासवर्ड भूल गए?',
      resetPassword: 'पासवर्ड रीसेट करें',
      createAccount: 'खाता बनाएं',
      alreadyHaveAccount: 'पहले से खाता है?',
      dontHaveAccount: 'खाता नहीं है?',
      welcomeBack: 'वापसी पर स्वागत है!',
      createNewAccount: 'नया खाता बनाएं',
      loginSuccess: 'लॉगिन सफल!',
      registerSuccess: 'रजिस्ट्रेशन सफल!',
      logoutSuccess: 'लॉगआउट सफल!'
    },
    // Search
    search: {
      placeholder: 'किताबें, कविताएं, छंद, कहानियां खोजें...',
      noResults: 'कोई परिणाम नहीं मिला',
      suggestions: 'सुझाव',
      trending: 'ट्रेंडिंग',
      recent: 'हाल का',
      filters: 'फिल्टर',
      clearFilters: 'फिल्टर साफ करें',
      sortBy: 'इसके अनुसार सॉर्ट करें',
      relevance: 'प्रासंगिकता',
      priceLowToHigh: 'कीमत: कम से अधिक',
      priceHighToLow: 'कीमत: अधिक से कम',
      newest: 'नवीनतम',
      oldest: 'सबसे पुराना',
      rating: 'रेटिंग',
      popular: 'लोकप्रिय'
    },
    // Error messages
    errors: {
      networkError: 'नेटवर्क त्रुटि। कृपया अपना कनेक्शन जांचें।',
      serverError: 'सर्वर त्रुटि। कृपया बाद में फिर से कोशिश करें।',
      notFound: 'पृष्ठ नहीं मिला।',
      unauthorized: 'अनधिकृत पहुंच।',
      validationError: 'कृपया अपना इनपुट जांचें।',
      cartError: 'कार्ट अपडेट करने में विफल।',
      paymentError: 'भुगतान विफल हो गया। कृपया फिर से कोशिश करें।',
      generalError: 'कुछ गलत हो गया। कृपया फिर से कोशिश करें।'
    },
    // Success messages
    success: {
      itemAdded: 'आइटम सफलतापूर्वक कार्ट में जोड़ा गया!',
      orderPlaced: 'ऑर्डर सफलतापूर्वक दिया गया!',
      profileUpdated: 'प्रोफाइल सफलतापूर्वक अपडेट किया गया!',
      passwordChanged: 'पासवर्ड सफलतापूर्वक बदला गया!',
      reviewSubmitted: 'समीक्षा सफलतापूर्वक जमा की गई!'
    },
    // Footer
    footer: {
      about: 'हमारे बारे में',
      contact: 'हमसे संपर्क करें',
      privacy: 'गोपनीयता नीति',
      terms: 'सेवा शर्तें',
      refund: 'रिफंड नीति',
      shipping: 'शिपिंग जानकारी',
      faq: 'अक्सर अक्सर प्रश्न',
      social: 'हमें फॉलो करें',
      newsletter: 'हमारे न्यूज़लेटर की सदस्यता लें',
      copyright: '© 2024 सिंगलबी. सभी अधिकार सुरक्षित।'
    }
  }
};

// Language direction (RTL for Tamil)
const languageDirections: Record<Language, 'ltr' | 'rtl'> = {
  en: 'ltr',
  ta: 'rtl',
  hi: 'ltr'
};

// Context
interface I18nContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Provider component
export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    // Get language from localStorage or browser
    const saved = localStorage.getItem('language') as Language;
    if (saved && ['en', 'ta', 'hi'].includes(saved)) {
      return saved;
    }
    
    // Check browser language
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'ta') return 'ta';
    if (browserLang === 'hi') return 'hi';
    return 'en';
  });

  const dir = languageDirections[language];
  const isRTL = dir === 'rtl';

  // Save language preference
  useEffect(() => {
    localStorage.setItem('language', language);
    
    // Update document direction
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
    
    // Update document title based on language
    const titles = {
      en: 'SINGGLEBEE - Premium Educational Marketplace',
      ta: 'சிங்கிள்பீ - பிரீமியம் கல்வி சந்தை',
      hi: 'सिंगलबी - प्रीमियम शैक्षणिक मार्केटप्लेस'
    };
    document.title = titles[language];
  }, [language, dir]);

  // Translation function
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English
        value = translations.en;
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            return key; // Return key if translation not found
          }
        }
        break;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  const value: I18nContextType = {
    language,
    setLanguage,
    t,
    dir,
    isRTL
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

// Hook for using i18n
export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// Translation helper function
export const translate = (key: string, language: Language = 'en'): string => {
  const keys = key.split('.');
  let value: any = translations[language];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to English
      value = translations.en;
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey];
        } else {
          return key;
        }
      }
      break;
    }
  }
  
  return typeof value === 'string' ? value : key;
};

// Export translations for server-side use
export { translations, languageDirections };

export default I18nProvider;
