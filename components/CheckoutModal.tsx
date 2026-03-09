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

const InputLabel = ({
  children,
  required,
  icon,
}: React.PropsWithChildren<{ required?: boolean; icon?: string }>) => (
  <label className="flex items-center gap-2 text-[11px] font-black text-brand-black/70 uppercase tracking-[0.15em] mb-2.5 ml-1">
    {icon && <span className="text-lg filter saturate-150">{icon}</span>}
    <span>{children}</span>
    {required && <span className="text-brand-rose ml-0.5 text-base">*</span>}
  </label>
);

const FormInputContainer = ({
  children,
  focused,
}: React.PropsWithChildren<{ focused?: boolean }>) => (
  <div className={`relative transition-all duration-300 group ${focused ? 'scale-[1.01]' : ''}`}>
    <div
      className={`absolute -inset-[1px] bg-brand-primary rounded-2xl blur-sm opacity-0 group-hover:opacity-10 transition duration-500 ${focused ? 'opacity-30 blur-md' : ''}`}
    ></div>
    <div
      className={`relative bg-brand-light/50 border-2 rounded-2xl transition-all duration-300 ${focused ? 'border-brand-primary bg-white shadow-lg' : 'border-brand-primary/10 group-hover:border-brand-primary/30'}`}
    >
      {children}
    </div>
  </div>
);

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  subtotal,
  shippingFee,
  total,
  cart,
  onSuccess,
  user,
}) => {
  const [step, setStep] = useState<'details' | 'processing' | 'success'>('details');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    landmark: '',
    city: '',
    state: '',
    zip: '',
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: 'percentage' | 'fixed';
    discountAmount: number;
    calculatedDiscount: number;
    finalAmount: number;
  } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('details');
      setScreenshots([]);
      setPreviews([]);
      setSubmissionError(null);
      setFormData({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phoneNumber || '',
        address: user?.streetAddress || '',
        landmark: user?.landmark || '',
        city: user?.city || '',
        state: user?.state || '',
        zip: user?.zipCode || '',
      });
      setCouponCode('');
      setAppliedCoupon(null);
      setCouponError(null);
    }
  }, [isOpen, user]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const result = await api.coupons.validate(couponCode, subtotal);
      setAppliedCoupon(result);
    } catch (err: any) {
      setCouponError(err.message || 'Invalid coupon code');
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const displayTotal = appliedCoupon ? appliedCoupon.finalAmount + shippingFee : total;
  const displayDiscount = appliedCoupon ? appliedCoupon.calculatedDiscount : 0;

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
        alert(
          `Adding ${file.name} would exceed the 10MB total upload limit. Please upload smaller images.`
        );
        continue;
      }
      validFiles.push(file);
      addedSize += file.size;
    }

    if (validFiles.length > 0) {
      setScreenshots((prev) => [...prev, ...validFiles]);
      validFiles.forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => setPreviews((prev) => [...prev, reader.result as string]);
        reader.readAsDataURL(file);
      });
    }

    // Reset input so same file can be selected again if needed (e.g. after delete)
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Validation helpers
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPhone = (phone: string) => /^[0-9]{10}$/.test(phone);
  const isValidCityState = (value: string) =>
    /^[a-zA-Z\s]+$/.test(value) && value.trim().length >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.address ||
      !formData.city ||
      !formData.state ||
      !formData.zip
    ) {
      setSubmissionError('Please fill in all required fields');
      const firstEmpty = Object.entries(formData).find(([k, v]) => !v && k !== 'landmark');
      if (firstEmpty) setFocusedField(firstEmpty[0]);
      return;
    }
    if (!isValidEmail(formData.email)) {
      setSubmissionError('Please enter a valid email address (e.g. name@example.com)');
      return;
    }
    if (!isValidPhone(formData.phone)) {
      setSubmissionError('Phone number must be exactly 10 digits');
      return;
    }
    if (!isValidCityState(formData.city)) {
      setSubmissionError('City must contain only letters');
      return;
    }
    if (!isValidCityState(formData.state)) {
      setSubmissionError('State must contain only letters');
      return;
    }
    if (!/^[0-9]{6}$/.test(formData.zip)) {
      setSubmissionError('Pincode must be exactly 6 digits');
      return;
    }
    if (screenshots.length === 0) {
      alert('Please upload your Honey Receipt (UPI/GPay Screenshot)!');
      return;
    }

    setStep('processing');
    setSubmissionError(null);

    try {
      const data = new FormData();
      // Human-readable keys for better email formatting
      data.append('Customer Name', formData.name);
      data.append('Contact Email', formData.email);
      data.append('Phone Number', formData.phone);

      const fullAddress = `${formData.address}, ${formData.landmark ? formData.landmark + ', ' : ''}${formData.city}, ${formData.state}, ${formData.zip}`;
      data.append('Delivery Address', fullAddress);

      data.append('Order Subtotal', `₹${subtotal.toLocaleString('en-IN')}`);
      data.append('Shipping Cost', `₹${shippingFee.toLocaleString('en-IN')}`);
      data.append('Grand Total', `₹${total.toLocaleString('en-IN')}`);

      const orderSummary = (cart || [])
        .map((item) => `- ${item.title} (x${item.quantity})`)
        .join('\n');
      data.append('Order Items', orderSummary);

      // Main message body for the email
      data.append(
        'message',
        `🐝 NEW HIVE ORDER 🐝\n\n` +
        `Customer: ${formData.name}\n` +
        `Total: ₹${total.toLocaleString('en-IN')}\n\n` +
        `--- ORDER ITEMS ---\n${orderSummary}\n\n` +
        `--- DELIVERY ---\n${fullAddress}\n\n` +
        `--- CONTACT ---\nPhone: ${formData.phone}\nEmail: ${formData.email}\n\n` +
        `--- PAYMENT PROOF ---\nVerified: Yes (User uploaded screenshot)`
      );

      data.append('_subject', `🍯 New Hive Order from ${formData.name}`);
      data.append('Payment Proof', 'Verified (User Uploaded)');

      // NOTE: screenshots are validated but NOT sent to Formspree as per request
      // This avoids "File Uploads Not Permitted" errors while keeping the UX mandatory.

      // 1. Send purely notification email via Formspree (Backup)
      try {
        await fetch('https://formspree.io/f/mqeearzy', {
          method: 'POST',
          body: data,
          headers: { Accept: 'application/json' },
        });
      } catch (e) {
        console.warn('Formspree backup failed, continuing with main order...', e);
      }

      // 2. Create the ACTUAL order in the MongoDB backend
      try {
        const orderData = {
          items: cart.map((item) => ({
            productId: item.id.toString(),
            quantity: item.quantity,
          })),
          shippingAddress: {
            fullName: formData.name,
            street: formData.address,
            landmark: formData.landmark,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zip,
            phone: formData.phone,
            email: formData.email,
          },
          paymentMethod: 'upi_manual' as const,
          couponCode: appliedCoupon?.code,
        };

        const backendOrder = await api.orders.createOrder(orderData);
        console.log('Backend order created:', backendOrder);
      } catch (err: any) {
        throw new Error(err.message || 'Failed to create order in system. Please try again.');
      }

      setStep('success');
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 8000);
    } catch (err: any) {
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
              <h3 className="text-2xl md:text-4xl font-black text-brand-black tracking-tighter leading-none">
                Finalize Order
              </h3>
              <p className="text-[10px] font-black text-brand-secondary uppercase tracking-[0.35em] mt-1.5 opacity-60">
                Nectar Collection Sequence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                Hive Progress
              </span>
              <div className="flex gap-1.5">
                <div
                  className={`w-10 h-2 rounded-full transition-all duration-700 ${step === 'details' ? 'bg-brand-primary shadow-lg' : 'bg-brand-meadow'}`}
                ></div>
                <div
                  className={`w-10 h-2 rounded-full transition-all duration-700 ${step === 'processing' ? 'bg-brand-primary shadow-lg' : step === 'success' ? 'bg-brand-meadow' : 'bg-brand-light'}`}
                ></div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-12 h-12 rounded-2xl bg-brand-light flex items-center justify-center text-brand-black hover:bg-brand-rose hover:text-white transition-all active:scale-90 font-black shadow-sm"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar relative z-0">
          {step === 'details' && (
            <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row h-full">
              {/* Left Column: Summary & Payment */}
              <div className="w-full lg:w-[40%] bg-brand-light/40 border-r border-brand-light p-6 md:p-12 space-y-8 md:space-y-10">
                {submissionError && (
                  <div className="bg-rose-50 border-2 border-brand-rose/10 p-5 rounded-3xl animate-buzz shadow-sm">
                    <p className="text-brand-rose font-black text-xs text-center leading-relaxed">
                      🚨 BUZZ ERROR: {submissionError}
                    </p>
                  </div>
                )}

                {/* Total Card */}
                <div className="bg-white p-10 rounded-[3rem] shadow-honey border-4 border-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-brand-primary/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                  <span className="text-brand-secondary/40 font-black text-[11px] uppercase tracking-[0.4em] block mb-5 text-center">
                    Hive Dues
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-brand-primary text-3xl font-black">₹</span>
                    <span className="text-7xl font-black text-brand-black tracking-tighter">
                      {displayTotal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Promo Code Section */}
                  <div className="mt-8 pt-6 border-t border-brand-light/30">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Promo Code (Optional)
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1 group/promo">
                        <div
                          className={`absolute -inset-[1px] bg-brand-primary rounded-xl blur-sm opacity-0 transition duration-500 ${isValidatingCoupon ? 'opacity-20 blur-md' : 'group-hover/promo:opacity-10'}`}
                        ></div>
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="HIVE10"
                          disabled={isValidatingCoupon || !!appliedCoupon}
                          className={`relative w-full bg-brand-light/30 border-2 rounded-xl px-4 py-3 text-sm font-black tracking-widest outline-none transition-all
                            ${appliedCoupon ? 'border-brand-meadow bg-brand-meadow/5 text-brand-meadow' : 'border-transparent focus:border-brand-primary focus:bg-white'}
                            ${couponError ? 'border-brand-rose bg-brand-rose/5' : ''}
                          `}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={
                          appliedCoupon
                            ? () => {
                                setAppliedCoupon(null);
                                setCouponCode('');
                              }
                            : handleApplyCoupon
                        }
                        disabled={isValidatingCoupon || (!couponCode && !appliedCoupon)}
                        className={`px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm
                          ${
                            appliedCoupon
                              ? 'bg-brand-rose text-white hover:bg-rose-600'
                              : 'bg-brand-black text-brand-primary hover:bg-brand-primary hover:text-white disabled:opacity-30'
                          }
                        `}
                      >
                        {isValidatingCoupon ? (
                          <span className="inline-block animate-spin">⏳</span>
                        ) : appliedCoupon ? (
                          'Remove'
                        ) : (
                          'Apply'
                        )}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-[9px] font-black text-brand-rose mt-2 ml-1 animate-buzz">
                        ❌ {couponError}
                      </p>
                    )}
                    {appliedCoupon && (
                      <p className="text-[9px] font-black text-brand-meadow mt-2 ml-1">
                        ✅ {appliedCoupon.code} Applied Successfully!
                      </p>
                    )}
                  </div>

                  <div className="mt-8 pt-8 border-t-2 border-brand-light grid grid-cols-2 gap-6">
                    <div>
                      <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                        Subtotal
                      </span>
                      <span className="text-lg font-black text-brand-black">
                        ₹{subtotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                        Discount
                      </span>
                      <span className="text-lg font-black text-brand-meadow">
                        -₹{displayDiscount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-brand-light/50 flex justify-between items-center px-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Delivery Fee
                    </span>
                    <span className={`text-base font-black ${shippingFee === 0 ? 'text-brand-meadow' : 'text-brand-black'}`}>
                      {shippingFee === 0 ? 'FREE' : `₹${shippingFee.toLocaleString('en-IN')}`}
                    </span>
                  </div>
                </div>

                {/* UPI Payment Card */}
                <div className="bg-brand-dark p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group text-white">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/20 rounded-full blur-[60px] -mr-16 -mt-16"></div>

                  <h4 className="font-black text-brand-primary uppercase text-[11px] tracking-[0.4em] mb-8 flex items-center gap-3">
                    <span className="animate-buzz inline-block">🍯</span> Payment To:
                  </h4>

                  <div
                    onClick={copyUpiId}
                    className="bg-white/10 border-2 border-white/10 rounded-3xl p-6 cursor-pointer hover:bg-white/20 transition-all group/upi shadow-inner"
                  >
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-14 h-14 bg-brand-primary rounded-2xl flex items-center justify-center text-3xl shadow-lg border-2 border-white/20 group-hover/upi:buzz transition-transform">
                        <BeeCharacter size="2.5rem" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-[9px] font-black text-brand-primary uppercase tracking-widest mb-1 opacity-70">
                          Honey ID
                        </span>
                        <p className="text-base md:text-lg font-black text-white/90 truncate tracking-tight">
                          singglebee.rsventures@okhdfcbank
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-center transition-all ${copied ? 'bg-brand-meadow text-white' : 'bg-brand-primary text-brand-black shadow-lg hover:scale-105'}`}
                    >
                      {copied ? '✨ ID Copied! ✨' : 'Click to Copy ID'}
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-center gap-3">
                    <span className="text-white/20 text-[10px] font-black uppercase tracking-[0.2em] italic">
                      GPay, PhonePe, PayTM
                    </span>
                    <div className="flex gap-1">
                      <div className="w-1 h-1 rounded-full bg-brand-primary/40"></div>
                      <div className="w-1 h-1 rounded-full bg-brand-primary/40"></div>
                      <div className="w-1 h-1 rounded-full bg-brand-primary/40"></div>
                    </div>
                  </div>
                </div>

                <div className="text-center px-4">
                  <p className="text-[11px] font-black text-brand-secondary/40 uppercase tracking-[0.3em] italic mb-2">
                    Hive Standard
                  </p>
                  <p className="text-gray-400 font-bold text-xs leading-relaxed">
                    Once our worker bees verify your receipt, we'll buzz your tracking ID to your
                    email instantly!
                  </p>
                </div>
              </div>

              {/* Right Column: Details & Upload */}
              <div className="w-full lg:w-[60%] p-6 md:p-14 space-y-10 md:space-y-12 bg-white">
                {/* Personal Section */}
                <div className="space-y-8 animate-fade-in">
                  <div className="flex items-center gap-4 pb-4 border-b border-brand-light">
                    <div className="p-3 bg-brand-accent rounded-2xl shadow-sm">👤</div>
                    <h4 className="font-black text-brand-black uppercase text-sm tracking-[0.4em]">
                      Personal Hive Info
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-1">
                      <InputLabel required icon="📝">
                        Your Bee Name
                      </InputLabel>
                      <FormInputContainer focused={focusedField === 'name'}>
                        <input
                          required
                          type="text"
                          value={formData.name}
                          onFocus={() => setFocusedField('name')}
                          onBlur={() => setFocusedField(null)}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full bg-transparent px-6 py-4.5 text-base font-black text-brand-black outline-none placeholder:text-gray-200"
                          placeholder="Full Name"
                        />
                      </FormInputContainer>
                    </div>
                    <div className="space-y-1">
                      <InputLabel required icon="📞">
                        Contact Number
                      </InputLabel>
                      <FormInputContainer focused={focusedField === 'phone'}>
                        <input
                          required
                          type="tel"
                          pattern="[0-9]{10}"
                          value={formData.phone}
                          onFocus={() => setFocusedField('phone')}
                          onBlur={() => setFocusedField(null)}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full bg-transparent px-6 py-4.5 text-base font-black text-brand-black outline-none placeholder:text-gray-200"
                          placeholder="10 Digits"
                        />
                      </FormInputContainer>
                    </div>
                  </div>
                </div>

                {/* Delivery Section */}
                <div className="space-y-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                  <div className="flex items-center gap-4 pb-4 border-b border-brand-light">
                    <div className="p-3 bg-brand-accent rounded-2xl shadow-sm">📍</div>
                    <h4 className="font-black text-brand-black uppercase text-sm tracking-[0.4em]">
                      Delivery Hive
                    </h4>
                  </div>
                  <div className="space-y-8">
                    <div className="space-y-1">
                      <InputLabel required icon="🏠">
                        Full Address
                      </InputLabel>
                      <FormInputContainer focused={focusedField === 'address'}>
                        <input
                          required
                          type="text"
                          value={formData.address}
                          onFocus={() => setFocusedField('address')}
                          onBlur={() => setFocusedField(null)}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full bg-transparent px-6 py-4.5 text-base font-black text-brand-black outline-none placeholder:text-gray-200"
                          placeholder="House / Street / Area"
                        />
                      </FormInputContainer>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-1">
                        <InputLabel icon="🏛️">Landmark</InputLabel>
                        <FormInputContainer focused={focusedField === 'landmark'}>
                          <input
                            type="text"
                            value={formData.landmark}
                            onFocus={() => setFocusedField('landmark')}
                            onBlur={() => setFocusedField(null)}
                            onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                            className="w-full bg-transparent px-6 py-4.5 text-base font-black text-brand-black outline-none placeholder:text-gray-200"
                            placeholder="Optional"
                          />
                        </FormInputContainer>
                      </div>
                      <div className="space-y-1">
                        <InputLabel required icon="🏙️">
                          City / Town
                        </InputLabel>
                        <FormInputContainer focused={focusedField === 'city'}>
                          <input
                            required
                            type="text"
                            value={formData.city}
                            onFocus={() => setFocusedField('city')}
                            onBlur={() => setFocusedField(null)}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            className="w-full bg-transparent px-6 py-4.5 text-base font-black text-brand-black outline-none placeholder:text-gray-200"
                            placeholder="City"
                          />
                        </FormInputContainer>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-1">
                        <InputLabel required icon="🗺️">
                          State
                        </InputLabel>
                        <FormInputContainer focused={focusedField === 'state'}>
                          <input
                            required
                            type="text"
                            value={formData.state}
                            onFocus={() => setFocusedField('state')}
                            onBlur={() => setFocusedField(null)}
                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                            className="w-full bg-transparent px-6 py-4.5 text-base font-black text-brand-black outline-none placeholder:text-gray-200"
                            placeholder="State"
                          />
                        </FormInputContainer>
                      </div>
                      <div className="space-y-1">
                        <InputLabel required icon="🔢">
                          Pin Code
                        </InputLabel>
                        <FormInputContainer focused={focusedField === 'zip'}>
                          <input
                            required
                            type="text"
                            pattern="[0-9]{6}"
                            maxLength={6}
                            value={formData.zip}
                            onFocus={() => setFocusedField('zip')}
                            onBlur={() => setFocusedField(null)}
                            onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                            className="w-full bg-transparent px-6 py-4.5 text-base font-black text-brand-black outline-none placeholder:text-gray-200"
                            placeholder="6 Digits"
                          />
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
                          <h4 className="font-black text-brand-black uppercase text-xs tracking-[0.3em]">
                            Final Step: Buzz Proof
                          </h4>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                            Upload UPI / GPay Receipt
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-black text-brand-rose bg-white px-4 py-2 rounded-full border-2 border-rose-50 uppercase tracking-widest shadow-sm">
                        Mandatory
                      </span>
                    </div>

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="group/upload relative w-full border-4 border-dashed border-brand-primary/10 bg-white rounded-[2rem] p-8 md:p-12 hover:border-brand-primary hover:shadow-xl cursor-pointer transition-all text-center"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                      />
                      {previews.length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-5 animate-fade-in">
                          {previews.map((p, i) => (
                            <div key={i} className="relative group/thumb">
                              <img
                                src={p}
                                alt="Proof"
                                className="w-20 h-28 object-cover rounded-xl border-4 border-white shadow-xl transition-transform group-hover/thumb:scale-105"
                              />
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
                          <div className="w-20 h-28 bg-brand-light border-4 border-dashed border-brand-primary/10 rounded-xl flex items-center justify-center text-brand-secondary text-3xl font-black">
                            +
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center mb-5 text-brand-primary group-hover/upload:buzz transition-all shadow-sm">
                            <span className="text-4xl">🧾</span>
                          </div>
                          <p className="text-xl text-brand-black font-black tracking-tight">
                            Tap to buzz your receipt!
                          </p>
                          <p className="text-[10px] text-gray-300 font-bold uppercase tracking-[0.4em] mt-2">
                            Maximum 10MB per file
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    className="group relative w-full bg-brand-black text-brand-primary font-black py-8 rounded-[2.5rem] shadow-xl hover:scale-[1.03] active:scale-95 transition-all text-2xl md:text-3xl flex items-center justify-center gap-6 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>
                    <span className="group-hover:animate-buzz flex items-center justify-center">
                      <BeeCharacter size="3.5rem" />
                    </span>
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40 leading-none mb-1.5">
                        Nectar Sequence Finalized
                      </span>
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
              <h4 className="text-4xl font-black text-brand-black tracking-tighter">
                Your Bee is Buzzing...
              </h4>
              <p className="text-gray-400 font-bold mt-5 max-w-sm mx-auto leading-relaxed italic">
                Gathering your order details and transmitting them to the central hive mind.
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-28 text-center animate-fade-in h-full bg-white">
              <div className="w-56 h-56 bg-brand-meadow rounded-[4.5rem] flex items-center justify-center mb-12 shadow-2xl relative group border-[12px] border-white overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent"></div>
                <svg
                  className="w-28 h-28 text-white relative z-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-6xl md:text-8xl font-black text-brand-black mb-8 tracking-tighter">
                Bzz-tastic!
              </h3>
              <div className="max-w-2xl px-6 space-y-8">
                <p className="text-gray-500 font-bold text-2xl md:text-4xl leading-relaxed">
                  Your Order has been Received! 🍯
                </p>
                <div className="bg-brand-light p-10 rounded-[3.5rem] border-4 border-white shadow-inner">
                  <p className="text-brand-black font-black text-lg md:text-xl leading-relaxed italic opacity-80">
                    Our hive team will contact you shortly through Gmail or Phone to finalize your
                    delivery!
                  </p>
                </div>
              </div>
              <div className="w-full max-w-md bg-brand-light h-6 rounded-full overflow-hidden mt-16 shadow-inner border-4 border-white">
                <div className="h-full bg-brand-meadow animate-progress-grow shadow-lg shadow-brand-meadow/30"></div>
              </div>
              <p className="text-gray-300 font-black text-[10px] uppercase tracking-[0.5em] mt-8">
                Hive Connection Secure
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
