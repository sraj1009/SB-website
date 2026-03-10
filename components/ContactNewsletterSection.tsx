import React, { useState, useCallback } from 'react';
import { 
  Mail, 
  Send, 
  MessageSquare, 
  User, 
  Star,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import BeeIcon from './BeeIcon';

interface ContactNewsletterSectionProps {
  className?: string;
}

// React Hook Form structure annotation for design notes
interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface NewsletterFormData {
  email: string;
}

// Testimonial data
const testimonials = [
  {
    id: 1,
    name: "Priya Sharma",
    role: "Parent",
    content: "The educational books from SINGGLEBEE have transformed my child's learning experience. Quality is exceptional!",
    rating: 5
  },
  {
    id: 2,
    name: "Raj Kumar",
    role: "Teacher",
    content: "As an educator, I'm impressed by the curated collection. The honey products are pure and the service is outstanding.",
    rating: 5
  },
  {
    id: 3,
    name: "Anita Patel",
    role: "Customer",
    content: "Love the bee-themed approach to learning! My kids are more engaged and the products arrive beautifully packaged.",
    rating: 5
  }
];

const ContactNewsletterSection: React.FC<ContactNewsletterSectionProps> = ({ className = "" }) => {
  // React Hook Form state management
  const [contactForm, setContactForm] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [contactErrors, setContactErrors] = useState<Partial<ContactFormData>>({});
  const [newsletterError, setNewsletterError] = useState('');
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showContactSuccess, setShowContactSuccess] = useState(false);
  const [showNewsletterSuccess, setShowNewsletterSuccess] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Form validation
  const validateContactForm = useCallback((): boolean => {
    const errors: Partial<ContactFormData> = {};

    if (!contactForm.name.trim()) {
      errors.name = 'Name is required';
    } else if (contactForm.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!contactForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!contactForm.subject.trim()) {
      errors.subject = 'Subject is required';
    } else if (contactForm.subject.trim().length < 3) {
      errors.subject = 'Subject must be at least 3 characters';
    }

    if (!contactForm.message.trim()) {
      errors.message = 'Message is required';
    } else if (contactForm.message.trim().length < 10) {
      errors.message = 'Message must be at least 10 characters';
    }

    setContactErrors(errors);
    return Object.keys(errors).length === 0;
  }, [contactForm]);

  const validateNewsletterEmail = useCallback((): boolean => {
    if (!newsletterEmail.trim()) {
      setNewsletterError('Email is required');
      return false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newsletterEmail)) {
      setNewsletterError('Please enter a valid email address');
      return false;
    }
    setNewsletterError('');
    return true;
  }, [newsletterEmail]);

  // Handle contact form submission
  const handleContactSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateContactForm()) return;

    setIsSubmittingContact(true);
    
    // Simulate Formspree webhook integration
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Success state
      setShowContactSuccess(true);
      setContactForm({ name: '', email: '', subject: '', message: '' });
      
      // Hide success modal after 5 seconds
      setTimeout(() => setShowContactSuccess(false), 5000);
    } catch (error) {
      console.error('Contact form submission error:', error);
    } finally {
      setIsSubmittingContact(false);
    }
  }, [contactForm, validateContactForm]);

  // Handle newsletter subscription
  const handleNewsletterSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateNewsletterEmail()) return;

    setIsSubscribing(true);
    
    // Simulate newsletter subscription
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Success state
      setShowNewsletterSuccess(true);
      setNewsletterEmail('');
      
      // Hide success modal after 4 seconds
      setTimeout(() => setShowNewsletterSuccess(false), 4000);
    } catch (error) {
      console.error('Newsletter subscription error:', error);
    } finally {
      setIsSubscribing(false);
    }
  }, [newsletterEmail, validateNewsletterEmail]);

  // Handle input changes
  const handleContactInputChange = useCallback((field: keyof ContactFormData, value: string) => {
    setContactForm(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (contactErrors[field]) {
      setContactErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [contactErrors]);

  // Testimonial navigation
  const nextTestimonial = useCallback(() => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  }, []);

  const prevTestimonial = useCallback(() => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, []);

  return (
    <section className={`relative py-20 px-6 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 overflow-hidden ${className}`}>
      {/* Background Honeycomb Pattern */}
      <div 
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='52' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0 L52 15 L52 37 L30 52 L8 37 L8 15 Z' fill='none' stroke='%23FFA500' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 52px',
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Get in <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">Touch</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Have questions? We'd love to hear from you. Send us a message and join our hive community!
          </p>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Left Column - Contact Form */}
          <div className="bg-white/85 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8"
               style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-amber-500" />
                Send us a Message
              </h3>
              <p className="text-gray-600">We typically respond within 24 hours</p>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-6">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={contactForm.name}
                    onChange={(e) => handleContactInputChange('name', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 ${
                      contactErrors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Your full name"
                  />
                </div>
                {contactErrors.name && (
                  <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{contactErrors.name}</span>
                  </div>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => handleContactInputChange('email', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 ${
                      contactErrors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="your@email.com"
                  />
                </div>
                {contactErrors.email && (
                  <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{contactErrors.email}</span>
                  </div>
                )}
              </div>

              {/* Subject Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={contactForm.subject}
                  onChange={(e) => handleContactInputChange('subject', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 ${
                    contactErrors.subject ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="What's this about?"
                />
                {contactErrors.subject && (
                  <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{contactErrors.subject}</span>
                  </div>
                )}
              </div>

              {/* Message Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={contactForm.message}
                  onChange={(e) => handleContactInputChange('message', e.target.value)}
                  rows={5}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 resize-none ${
                    contactErrors.message ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Tell us more..."
                />
                {contactErrors.message && (
                  <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{contactErrors.message}</span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmittingContact}
                className="w-full bg-gradient-to-r from-amber-400 to-amber-500 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-3 hover:from-amber-500 hover:to-amber-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingContact ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <BeeIcon size={20} />
                    Send to Hive
                  </>
                )}
              </button>
            </form>

            {/* Contact Info */}
            <div className="mt-8 p-4 bg-amber-50 rounded-2xl">
              <div className="flex items-center gap-3 text-amber-700">
                <Mail className="w-5 h-5" />
                <span className="font-medium">support@singglebee.com</span>
              </div>
              <div className="flex items-center gap-3 text-amber-600 mt-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Response time: Within 24 hours</span>
              </div>
            </div>
          </div>

          {/* Right Column - Newsletter Signup */}
          <div className="relative">
            {/* Honeycomb Background */}
            <div 
              className="absolute inset-0 rounded-3xl opacity-20"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='35' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0 L35 10 L35 25 L20 35 L5 25 L5 10 Z' fill='none' stroke='%232D5016' stroke-width='0.8'/%3E%3C/svg%3E")`,
                backgroundSize: '40px 35px',
                backgroundColor: 'rgba(253, 243, 199, 0.8)',
              }}
            />

            <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8"
                 style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
              {/* Newsletter Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BeeIcon size={32} className="text-white" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">Join the Hive</h3>
                <p className="text-lg text-gray-600">Get sweetness in your inbox</p>
                <p className="text-sm text-gray-500 mt-2">Exclusive offers, new arrivals, and educational tips</p>
              </div>

              {/* Newsletter Form */}
              <form onSubmit={handleNewsletterSubmit} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => {
                      setNewsletterEmail(e.target.value);
                      setNewsletterError('');
                    }}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 ${
                      newsletterError ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your email"
                  />
                  {newsletterError && (
                    <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{newsletterError}</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubscribing}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubscribing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                      Subscribing...
                    </>
                  ) : (
                    'Subscribe Now'
                  )}
                </button>
              </form>

              {/* Social Proof */}
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-green-700 font-semibold">5,000+ hive members</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonial Carousel */}
        <div className="bg-white/85 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8"
             style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">What Our Hive Members Say</h3>
          
          <div className="relative">
            {/* Testimonial Content */}
            <div className="text-center max-w-3xl mx-auto">
              <div className="flex justify-center mb-4">
                {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
              <blockquote className="text-xl text-gray-700 italic mb-6">
                "{testimonials[currentTestimonial].content}"
              </blockquote>
              <div className="font-semibold text-gray-900">{testimonials[currentTestimonial].name}</div>
              <div className="text-gray-600">{testimonials[currentTestimonial].role}</div>
            </div>

            {/* Navigation Buttons */}
            <button
              onClick={prevTestimonial}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 hover:bg-amber-200 transition-colors"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextTestimonial}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 hover:bg-amber-200 transition-colors"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dots Indicator */}
            <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    index === currentTestimonial ? 'bg-amber-500 w-8' : 'bg-gray-300'
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Contact Success Modal */}
      {showContactSuccess && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <BeeIcon size={32} className="text-amber-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Thank you!</h3>
            <p className="text-gray-600 mb-6">We'll buzz back soon</p>
            <p className="text-sm text-gray-500">Your message has been sent successfully. We'll respond within 24 hours.</p>
            <button
              onClick={() => setShowContactSuccess(false)}
              className="mt-6 px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Newsletter Success Modal */}
      {showNewsletterSuccess && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <BeeIcon size={32} className="text-amber-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Welcome to the Hive!</h3>
            <p className="text-gray-600 mb-6">Check your email for a sweet surprise</p>
            <p className="text-sm text-gray-500">You've been added to our newsletter. Get ready for exclusive offers and educational content!</p>
            <button
              onClick={() => setShowNewsletterSuccess(false)}
              className="mt-6 px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default ContactNewsletterSection;
