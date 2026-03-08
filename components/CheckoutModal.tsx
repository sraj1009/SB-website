
import React, { useState, useEffect, useRef } from 'react';
import { CartItem, User } from '../types';
import BeeCharacter from './BeeCharacter.tsx';
import api from '../services/api';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  shippingFee: number;
  total: number;
  cart: CartItem[];
  onSuccess: () => void;
  user: User | null;
}

const InputLabel = ({ children, required, icon }: React.PropsWithChildren<{ required?: boolean; icon?: string }>) => (
  <label className="flex items-center gap-2 text-[11px] font-black text-brand-black/70 uppercase tracking-[0.15em] mb-2.5 ml-1">
    {icon && <span className="text-lg filter saturate-150">{icon}</span>}
    <span>{children}</span>
    {required && <span className="text-brand-rose ml-0.5 text-base">*</span>}
  </label>
);

const FormInputContainer = ({ children, focused, valid, error }: React.PropsWithChildren<{ focused?: boolean, valid?: boolean, error?: boolean }>) => (
  <div className={`relative transition-all duration-300 group ${focused ? 'scale-[1.01]' : ''}`}>
    <div className={`absolute -inset-[1px] bg-brand-primary rounded-2xl blur-sm opacity-0 group-hover:opacity-10 transition duration-500 ${focused ? 'opacity-30 blur-md' : ''}`}></div>
    <div className={`relative bg-brand-light/50 border-2 rounded-2xl transition-all duration-300 
      ${error ? 'border-brand-rose/50 bg-rose-50/10' : valid && !focused ? 'border-brand-meadow/40 bg-green-50/10' : focused ? 'border-brand-primary bg-white shadow-lg' : 'border-brand-primary/10 group-hover:border-brand-primary/30'}
    `}>
      {children}
    </div>
  </div>
);

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, subtotal, shippingFee, total, cart, onSuccess, user }) => {
  const [step, setStep] = useState<'details' | 'processing' | 'success'>('details');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    landmark: '',
    city: '',
    state: '',
    zip: ''
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('details');
      setScreenshots([]);
      setPreviews([]);
      setSubmissionError(null);
      setCreatedOrderId(null);
      setFormData({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phoneNumber || '',
        address: user?.streetAddress || '',
        landmark: user?.landmark || '',
        city: user?.city || '',
        state: 'Tamil Nadu', // Default and restricted to Tamil Nadu
        zip: user?.zipCode || ''
      });
    }
  }, [isOpen, user]);

  const copyUpiId = () => {
    navigator.clipboard.writeText('singglebee.rsventures@okhdfcbank');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const currentTotalSize = screenshots.reduce((acc, file) => acc + file.size, 0);
    const MAX_TOTAL_SIZE = 9.5 * 1024 * 1024; // 9.5MB to be safe with Formspree's 10MB limit

    const validFiles: File[] = [];
    let addedSize = 0;

    for (const file of files) {
      if (currentTotalSize + addedSize + file.size > MAX_TOTAL_SIZE) {
        alert(`Adding ${file.name} would exceed the 10MB total upload limit. Please upload smaller images.`);
        continue;
      }
      validFiles.push(file);
      addedSize += file.size;
    }

    if (validFiles.length > 0) {
      setScreenshots(prev => [...prev, ...validFiles]);
      validFiles.forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => setPreviews(prev => [...prev, reader.result as string]);
        reader.readAsDataURL(file);
      });
    }

    // Reset input so same file can be selected again if needed (e.g. after delete)
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Validation helpers
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPhone = (phone: string) => /^[0-9]{10}$/.test(phone);
  const isValidCityState = (value: string) => /^[a-zA-Z\s]+$/.test(value) && value.trim().length >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name || !formData.email || !formData.phone || !formData.address || !formData.city || !formData.state || !formData.zip) {
      setSubmissionError('Please fill in all required fields');
      return;
    }
    if (!isValidEmail(formData.email)) {
      setSubmissionError('Please enter a valid email address');
      return;
    }
    if (!isValidPhone(formData.phone)) {
      setSubmissionError('Phone number must be 10 digits');
      return;
    }

    setStep('processing');
    setSubmissionError(null);

    try {
      // 1. Create payment session (this creates a temporary session in backend, which converts to order on success)
      const sessionPayload = {
        items: cart.map(item => ({
          product: (item as any).originalId || item.id, // backend expects product ID mapping
          name: item.title,
          price: item.price,
          quantity: item.quantity,
          image: item.image
        })),
        shippingAddress: {
          fullName: formData.name,
          phone: formData.phone,
          email: formData.email,
          line1: formData.address,
          line2: formData.landmark,
          city: formData.city,
          state: formData.state,
          postalCode: formData.zip,
          country: 'India' // default
        },
        shippingCost: shippingFee,
        tax: 0
      };

      const sessionData = await api.payments.createSession(sessionPayload);

      if (sessionData.paymentMethod === 'cashfree' && sessionData.paymentSessionId) {
        // 2. Launch Cashfree SDK
        const cashfree = (window as any).Cashfree({
          mode: sessionData.environment === 'production' ? 'production' : 'sandbox'
        });

        await cashfree.checkout({
          paymentSessionId: sessionData.paymentSessionId,
          returnUrl: `${window.location.origin}/checkout/success?sess_id=${sessionData.sessionId}`
        });
      } else if (sessionData.paymentMethod === 'upi_manual') {
        // UPI manual: create order directly (no payment gateway)
        const orderPayload = {
          items: cart.map(item => ({
            productId: String((item as any).originalId || (item as any)._id || item.id),
            quantity: item.quantity
          })),
          shippingAddress: {
            fullName: formData.name,
            phone: formData.phone,
            email: formData.email,
            street: formData.address,
            landmark: formData.landmark,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zip,
            country: 'India'
          },
          paymentMethod: 'upi_manual' as const
        };
        const orderResponse = await api.orders.createOrder(orderPayload);
        const orderId = (orderResponse as any)?.orderId || (orderResponse as any)?.order?.orderId;

        // Upload screenshots if any
        if (screenshots.length > 0 && orderId) {
          try {
            const fd = new FormData();
            fd.append('orderId', orderId);
            // take only the first screenshot to comply with multer `.single('proof')`
            fd.append('proof', screenshots[0]);
            await api.payments.uploadProof(fd);
          } catch (err) {
            console.error('Failed to upload proof', err);
          }
        }

        setCreatedOrderId(orderId || null);
        onSuccess();
        setFormData({ name: '', email: '', phone: '', address: '', landmark: '', city: '', state: 'Tamil Nadu', zip: '' });
        setScreenshots([]);
        setPreviews([]);
        setStep('success');
        setSubmissionError(null);
      }

    } catch (err: any) {
      console.error("Checkout Error:", err);
      setSubmissionError(err.message || 'The hive connection was interrupted. Please try again.');
      setStep('details');
    }
  };

  const handleRemoveFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newScreenshots = [...screenshots];
    newScreenshots.splice(index, 1);
    setScreenshots(newScreenshots);

    const newPreviews = [...previews];
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-brand-black/70 backdrop-blur-xl z-[100] flex items-center justify-center p-2 md:p-6 animate-fade-in overflow-hidden">
      <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[96vh] animate-slide-up border-[6px] border-brand-accent relative">

        {/* Header Section */}
        <div className="bg-white px-8 md:px-14 py-6 border-b border-brand-light flex items-center justify-between gap-4 z-10 shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-brand-primary rounded-[1.5rem] flex items-center justify-center text-3xl shadow-honey group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none"></div>
              <span className="group-hover:buzz relative z-10 flex items-center justify-center">
                <BeeCharacter size="2rem" />
              </span>
            </div>
            <div>
              <h3 className="text-2xl md:text-4xl font-black text-brand-black tracking-tighter leading-none">Finalize Order</h3>
              <p className="text-[10px] font-black text-brand-secondary uppercase tracking-[0.35em] mt-1.5 opacity-60">Nectar Collection Sequence</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Hive Progress</span>
              <div className="flex gap-1.5">
                <div className={`w-10 h-2 rounded-full transition-all duration-700 ${step === 'details' ? 'bg-brand-primary shadow-lg' : 'bg-brand-meadow'}`}></div>
                <div className={`w-10 h-2 rounded-full transition-all duration-700 ${step === 'processing' ? 'bg-brand-primary shadow-lg' : step === 'success' ? 'bg-brand-meadow' : 'bg-brand-light'}`}></div>
              </div>
            </div>
            <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-brand-light flex items-center justify-center text-brand-black hover:bg-brand-rose hover:text-white transition-all active:scale-90 font-black shadow-sm">✕</button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar relative z-0">
          {step === 'details' && (
            <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row h-full">

              {/* Left Column: Summary & Payment */}
              <div className="w-full lg:w-[40%] bg-brand-light/40 border-r border-brand-light p-6 md:p-12 space-y-8 md:space-y-10">
                {submissionError && (
                  <div className="bg-rose-50 border-2 border-brand-rose/10 p-5 rounded-3xl animate-buzz shadow-sm">
                    <p className="text-brand-rose font-black text-xs text-center leading-relaxed">🚨 BUZZ ERROR: {submissionError}</p>
                  </div>
                )}

                {/* Total Card */}
                <div className="bg-white p-10 rounded-[3rem] shadow-honey border-4 border-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-brand-primary/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                  <span className="text-brand-secondary/40 font-black text-[11px] uppercase tracking-[0.4em] block mb-5 text-center">Hive Dues</span>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-brand-primary text-3xl font-black">₹</span>
                    <span className="text-7xl font-black text-brand-black tracking-tighter">{total.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="mt-10 pt-10 border-t-2 border-brand-light grid grid-cols-2 gap-6">
                    <div>
                      <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Subtotal</span>
                      <span className="text-lg font-black text-brand-black">₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Delivery</span>
                      <span className={`text-lg font-black ${shippingFee === 0 ? 'text-brand-meadow' : 'text-brand-black'}`}>
                        {shippingFee === 0 ? 'FREE' : `₹${shippingFee.toLocaleString('en-IN')}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* UPI Payment Card */}
                <div className="bg-brand-dark p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group text-white">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/20 rounded-full blur-[60px] -mr-16 -mt-16"></div>

                  <h4 className="font-black text-brand-primary uppercase text-[11px] tracking-[0.4em] mb-8 flex items-center gap-3">
                    <span className="animate-buzz inline-block">🍯</span> Payment To:
                  </h4>

                  <div onClick={copyUpiId} className="bg-white/10 border-2 border-white/10 rounded-3xl p-6 cursor-pointer hover:bg-white/20 transition-all group/upi shadow-inner">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-14 h-14 bg-brand-primary rounded-2xl flex items-center justify-center text-3xl shadow-lg border-2 border-white/20 group-hover/upi:buzz transition-transform">
                        <BeeCharacter size="2.5rem" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-[9px] font-black text-brand-primary uppercase tracking-widest mb-1 opacity-70">Honey ID</span>
                        <p className="text-base md:text-lg font-black text-white/90 truncate tracking-tight">
                          singglebee.rsventures@okhdfcbank
                        </p>
                      </div>
                    </div>
                    <div className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-center transition-all ${copied ? 'bg-brand-meadow text-white' : 'bg-brand-primary text-brand-black shadow-lg hover:scale-105'}`}>
                      {copied ? '✨ ID Copied! ✨' : 'Click to Copy ID'}
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-center gap-3">
                    <span className="text-white/20 text-[10px] font-black uppercase tracking-[0.2em] italic">GPay, PhonePe, PayTM</span>
                    <div className="flex gap-1">
                      <div className="w-1 h-1 rounded-full bg-brand-primary/40"></div>
                      <div className="w-1 h-1 rounded-full bg-brand-primary/40"></div>
                      <div className="w-1 h-1 rounded-full bg-brand-primary/40"></div>
                    </div>
                  </div>
                </div>

                <div className="text-center px-4">
                  <p className="text-[11px] font-black text-brand-secondary/40 uppercase tracking-[0.3em] italic mb-2">Hive Standard</p>
                  <p className="text-gray-400 font-bold text-xs leading-relaxed">
                    Once our worker bees verify your receipt, we'll buzz your tracking ID to your email instantly!
                  </p>
                </div>
              </div>

              {/* Right Column: Details & Upload */}
              <div className="w-full lg:w-[60%] p-6 md:p-14 space-y-10 md:space-y-12 bg-white">

                {/* Personal Section */}
                <div className="space-y-8 animate-fade-in">
                  <div className="flex items-center gap-4 pb-4 border-b border-brand-light">
                    <div className="p-3 bg-brand-accent rounded-2xl shadow-sm">👤</div>
                    <h4 className="font-black text-brand-black uppercase text-sm tracking-[0.4em]">Personal Hive Info</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-1">
                      <InputLabel required icon="📝">Your Bee Name</InputLabel>
                      <FormInputContainer focused={focusedField === 'name'}>
                        <input required type="text" value={formData.name} onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-transparent px-6 py-4.5 text-base font-black text-brand-black outline-none placeholder:text-gray-200" placeholder="Full Name" />
                      </FormInputContainer>
                    </div>
                    <div className="space-y-1">
                      <InputLabel required icon="📞">Contact Number</InputLabel>
                      <FormInputContainer focused={focusedField === 'phone'}>
                        <input required type="tel" pattern="[0-9]{10}" value={formData.phone} onFocus={() => setFocusedField('phone')} onBlur={() => setFocusedField(null)} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-transparent px-6 py-4.5 text-base font-black text-brand-black outline-none placeholder:text-gray-200" placeholder="10 Digits" />
                      </FormInputContainer>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <InputLabel required icon="📧">Email Address</InputLabel>
                      <FormInputContainer focused={focusedField === 'email'}>
                        <input required type="email" value={formData.email} onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-transparent px-6 py-4.5 text-base font-black text-brand-black outline-none placeholder:text-gray-200" placeholder="name@example.com" />
                      </FormInputContainer>
                    </div>
                  </div>
                </div>

                {/* Delivery Section */}
                <div className="space-y-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                  <div className="flex items-center gap-4 pb-4 border-b border-brand-light">
                    <div className="p-3 bg-brand-accent rounded-2xl shadow-sm">📍</div>
                    <h4 className="font-black text-brand-black uppercase text-sm tracking-[0.4em]">Delivery Hive</h4>
                  </div>
                  <div className="space-y-8">
                    <div className="space-y-1">
                      <InputLabel required icon="🏠">Full Address</InputLabel>
                      <FormInputContainer focused={focusedField === 'address'}>
                        <input required type="text" value={formData.address} onFocus={() => setFocusedField('address')} onBlur={() => setFocusedField(null)} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full bg-transparent px-6 py-4.5 text-base font-black text-brand-black outline-none placeholder:text-gray-200" placeholder="House / Street / Area" />
                      </FormInputContainer>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-1">
                        <InputLabel icon="🏛️">Landmark</InputLabel>
                        <FormInputContainer focused={focusedField === 'landmark'}>
                          <input type="text" value={formData.landmark} onFocus={() => setFocusedField('landmark')} onBlur={() => setFocusedField(null)} onChange={e => setFormData({ ...formData, landmark: e.target.value })} className="w-full bg-transparent px-6 py-4.5 text-base font-black text-brand-black outline-none placeholder:text-gray-200" placeholder="Optional" />
                        </FormInputContainer>
                      </div>
                      <div className="space-y-1">
                        <InputLabel required icon="🏙️">City / Town</InputLabel>
                        <FormInputContainer focused={focusedField === 'city'}>
                          <input required type="text" value={formData.city} onFocus={() => setFocusedField('city')} onBlur={() => setFocusedField(null)} onChange={e => setFormData({ ...formData, city: e.target.value })} className="w-full bg-transparent px-6 py-4.5 text-base font-black text-brand-black outline-none placeholder:text-gray-200" placeholder="City" />
                        </FormInputContainer>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-1">
                        <InputLabel required icon="🗺️">State</InputLabel>
                        <FormInputContainer focused={focusedField === 'state'}>
                          <div className="relative w-full">
                            <select
                              required
                              value={formData.state}
                              onChange={e => setFormData({ ...formData, state: e.target.value })}
                              onFocus={() => setFocusedField('state')}
                              onBlur={() => setFocusedField(null)}
                              className="w-full bg-transparent px-6 py-4.5 text-base font-black text-brand-black outline-none appearance-none cursor-pointer z-10 relative"
                            >
                              <option value="Tamil Nadu">Tamil Nadu</option>
                            </select>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-brand-primary">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        </FormInputContainer>
                      </div>
                      <div className="space-y-1">
                        <InputLabel required icon="🔢">Pin Code</InputLabel>
                        <FormInputContainer focused={focusedField === 'zip'}>
                          <input required type="text" pattern="[0-9]{6}" maxLength={6} value={formData.zip} onFocus={() => setFocusedField('zip')} onBlur={() => setFocusedField(null)} onChange={e => setFormData({ ...formData, zip: e.target.value })} className="w-full bg-transparent px-6 py-4.5 text-base font-black text-brand-black outline-none placeholder:text-gray-200" placeholder="6 Digits" />
                        </FormInputContainer>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upload Proof Area */}
                <div className="pt-4 md:pt-6">
                  <div className="bg-brand-light/30 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border-2 border-dashed border-brand-primary/20 transition-all hover:bg-white hover:border-brand-primary hover:shadow-honey relative group overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-4 bg-white rounded-2xl shadow-sm text-3xl">📸</div>
                        <div>
                          <h4 className="font-black text-brand-black uppercase text-xs tracking-[0.3em]">Final Step: Buzz Proof</h4>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Upload UPI / GPay Receipt</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-black text-brand-rose bg-white px-4 py-2 rounded-full border-2 border-rose-50 uppercase tracking-widest shadow-sm">Mandatory</span>
                    </div>

                    <div onClick={() => fileInputRef.current?.click()} className={`group/upload relative w-full border-4 border-dashed bg-white rounded-[2rem] p-8 md:p-12 transition-all cursor-pointer text-center
                      ${previews.length > 0 ? 'border-brand-meadow/50 bg-green-50/10 hover:border-brand-meadow hover:shadow-xl' : 'border-brand-rose/20 hover:border-brand-primary hover:shadow-xl'}
                    `}>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                      {previews.length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-5 animate-fade-in">
                          {previews.map((p, i) => (
                            <div key={i} className="relative group/thumb">
                              <img src={p} alt="Proof" className="w-20 h-28 object-cover rounded-xl border-4 border-white shadow-xl transition-transform group-hover/thumb:scale-105" />
                              <div className="absolute inset-0 bg-brand-primary/10 rounded-xl opacity-0 group-hover/thumb:opacity-100 transition-opacity"></div>
                              <button
                                onClick={(e) => handleRemoveFile(i, e)}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-brand-rose text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md opacity-0 group-hover/thumb:opacity-100 transition-opacity hover:scale-110"
                                type="button"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <div className="w-20 h-28 bg-brand-light border-4 border-dashed border-brand-primary/10 rounded-xl flex items-center justify-center text-brand-secondary text-3xl font-black">+</div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center mb-5 text-brand-primary group-hover/upload:buzz transition-all shadow-sm">
                            <span className="text-4xl">🧾</span>
                          </div>
                          <p className="text-xl text-brand-black font-black tracking-tight">Tap to buzz your receipt!</p>
                          <p className="text-[10px] text-gray-300 font-bold uppercase tracking-[0.4em] mt-2">Maximum 10MB per file</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button type="submit" className="group relative w-full bg-brand-black text-brand-primary font-black py-8 rounded-[2.5rem] shadow-xl hover:scale-[1.03] active:scale-95 transition-all text-2xl md:text-3xl flex items-center justify-center gap-6 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>
                    <span className="group-hover:animate-buzz flex items-center justify-center">
                      <BeeCharacter size="3.5rem" />
                    </span>
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40 leading-none mb-1.5">Nectar Sequence Finalized</span>
                      <span className="leading-none">Confirm Hive Order</span>
                    </div>
                  </button>
                </div>
              </div>
            </form>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-48 text-center animate-fade-in bg-white">
              <div className="w-56 h-56 relative mb-14">
                <div className="absolute inset-0 border-[12px] border-brand-primary/10 rounded-full"></div>
                <div className="absolute inset-0 border-[12px] border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center animate-buzz">
                  <BeeCharacter size="10rem" />
                </div>
              </div>
              <h4 className="text-4xl font-black text-brand-black tracking-tighter">Your Bee is Buzzing...</h4>
              <p className="text-gray-400 font-bold mt-5 max-w-sm mx-auto leading-relaxed italic">
                Gathering your order details and transmitting them to the central hive mind.
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-28 text-center animate-fade-in h-full bg-white">
              <div className="w-56 h-56 bg-brand-meadow rounded-[4.5rem] flex items-center justify-center mb-12 shadow-2xl relative group border-[12px] border-white overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent"></div>
                <svg className="w-28 h-28 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-6xl md:text-8xl font-black text-brand-black mb-8 tracking-tighter">Bzz-tastic!</h3>
              <div className="max-w-2xl px-6 space-y-8">
                <p className="text-gray-500 font-bold text-2xl md:text-4xl leading-relaxed">Your Order has been Received! 🍯</p>
                {createdOrderId && (
                  <p className="text-brand-primary font-black text-xl">Order #{createdOrderId}</p>
                )}
                <div className="bg-brand-light p-10 rounded-[3.5rem] border-4 border-white shadow-inner">
                  <p className="text-brand-black font-black text-lg md:text-xl leading-relaxed italic opacity-80">
                    {createdOrderId
                      ? 'Please pay via UPI to singglebee.rsventures@okhdfcbank. Our hive team will verify and contact you via email or phone!'
                      : 'Our hive team will contact you shortly through Gmail or Phone to finalize your delivery!'}
                  </p>
                </div>
              </div>
              <div className="w-full max-w-md bg-brand-light h-6 rounded-full overflow-hidden mt-16 shadow-inner border-4 border-white">
                <div className="h-full bg-brand-meadow animate-progress-grow shadow-lg shadow-brand-meadow/30"></div>
              </div>
              <p className="text-gray-300 font-black text-[10px] uppercase tracking-[0.5em] mt-8">Hive Connection Secure</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
