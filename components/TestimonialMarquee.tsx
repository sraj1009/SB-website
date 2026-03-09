import React from 'react';

const TESTIMONIALS = [
  {
    id: 1,
    name: 'Anitha',
    text: 'My son loves the colors! He keeps turning the pages.',
    rating: 5,
  },
  {
    id: 2,
    name: 'Karthik',
    text: 'Fast delivery to Madurai. The packaging was eco-friendly and cute.',
    rating: 5,
  },
  {
    id: 3,
    name: 'Lakshmi',
    text: 'Quality is amazing. Papers are thick and durable for toddlers.',
    rating: 5,
  },
  {
    id: 4,
    name: 'Saravanan',
    text: 'Best books for kids learning Tamil. Highly recommended.',
    rating: 5,
  },
  { id: 5, name: 'Meena', text: 'My daughter reads this every night before bed.', rating: 5 },
  { id: 6, name: 'Rajan', text: 'Good packaging and excellent customer support.', rating: 4 },
  {
    id: 7,
    name: 'Priya',
    text: 'Helpful for learning. The pictures relate well to the words.',
    rating: 5,
  },
  {
    id: 8,
    name: 'Senthil',
    text: 'Very nice story collection. Eagerly waiting for Volume 2.',
    rating: 5,
  },
  { id: 9, name: 'Kavitha', text: 'Colorful and bright illustrations. Truly joyful.', rating: 5 },
  { id: 10, name: 'Muthu', text: 'Recommended! Worth every rupee for the quality.', rating: 5 },
];

const TestimonialMarquee: React.FC = () => {
  // Triple the items for smooth infinite scroll
  const displayTestimonials = [...TESTIMONIALS, ...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <div className="py-20 bg-brand-light relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-10 text-center">
        <h2 className="text-3xl sm:text-4xl font-black text-brand-black tracking-tighter mb-2">
          What People Say 💬
        </h2>
      </div>

      <div className="relative w-full group">
        {/* Gradient Masks */}
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-r from-brand-light to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-l from-brand-light to-transparent z-10 pointer-events-none" />

        <div className="flex gap-6 w-max animate-scroll-slow py-4">
          {displayTestimonials.map((review, index) => (
            <div
              key={`${review.id}-${index}`}
              className="w-[300px] sm:w-[350px] bg-white p-6 rounded-3xl shadow-sm border border-brand-primary/10 flex-shrink-0 flex flex-col gap-4 hover:shadow-honey hover:scale-[1.02] transition-all duration-300"
            >
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-gray-200'}`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-600 font-medium italic leading-relaxed">"{review.text}"</p>
              <div className="mt-auto flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-amber-700 font-black text-xs">
                  {review.name.charAt(0)}
                </div>
                <span className="text-brand-black font-black text-sm uppercase tracking-wider">
                  {review.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .animate-scroll-slow {
          animation: scroll 40s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default TestimonialMarquee;
