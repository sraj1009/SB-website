import React, { useState, useRef, useCallback } from 'react';
import {
  Smartphone,
  CreditCard,
  Wallet,
  Upload,
  File,
  Check,
  AlertCircle,
  Shield,
  Lock,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react';

interface CheckoutPaymentStepProps {
  onContinue: (paymentMethod: string, receiptFile?: File) => void;
  onBack: () => void;
  selectedPaymentMethod?: string;
  uploadedReceipt?: File;
}

// TypeScript form validation schema for notes
interface PaymentFormData {
  paymentMethod: string;
  receiptFile?: File;
  cardNumber?: string;
  cardExpiry?: string;
  cardCVV?: string;
  cardName?: string;
  upiId?: string;
}

const CheckoutPaymentStep: React.FC<CheckoutPaymentStepProps> = ({
  onContinue,
  onBack,
  selectedPaymentMethod: initialMethod = '',
  uploadedReceipt: initialReceipt,
}) => {
  // React useState hooks for form management
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(initialMethod);
  const [receiptFile, setReceiptFile] = useState<File | null>(initialReceipt || null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>(
    'idle'
  );
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<PaymentFormData>({
    paymentMethod: initialMethod,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Payment methods configuration
  const paymentMethods = [
    {
      id: 'upi',
      name: 'UPI / GPay',
      icon: Smartphone,
      recommended: true,
      description: 'Instant payment via UPI apps',
    },
    {
      id: 'card',
      name: 'Credit / Debit Card',
      icon: CreditCard,
      recommended: false,
      description: 'Visa, Mastercard, RuPay accepted',
    },
    {
      id: 'cod',
      name: 'Cash on Delivery',
      icon: Wallet,
      recommended: false,
      description: 'Pay when you receive your order',
    },
  ];

  // Progress steps configuration
  const progressSteps = [
    { id: 'shipping', name: 'Shipping', completed: true },
    { id: 'payment', name: 'Payment', current: true },
    { id: 'review', name: 'Review', completed: false },
    { id: 'confirmation', name: 'Confirmation', completed: false },
  ];

  // Handle payment method selection
  const handlePaymentMethodSelect = useCallback((method: string) => {
    setSelectedPaymentMethod(method);
    setFormData((prev) => ({ ...prev, paymentMethod: method }));
    setValidationErrors((prev) => ({ ...prev, paymentMethod: '' }));

    // Reset receipt file if switching away from COD
    if (method !== 'cod') {
      setReceiptFile(null);
      setUploadStatus('idle');
    }
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback((file: File) => {
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setValidationErrors((prev) => ({
        ...prev,
        receiptFile: 'Please upload a PNG, JPG, or PDF file',
      }));
      setUploadStatus('error');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setValidationErrors((prev) => ({
        ...prev,
        receiptFile: 'File size must be less than 5MB',
      }));
      setUploadStatus('error');
      return;
    }

    // Simulate upload progress
    setUploadStatus('uploading');
    setUploadProgress(0);
    setValidationErrors((prev) => ({ ...prev, receiptFile: '' }));

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setReceiptFile(file);
          setUploadStatus('success');
          return 100;
        }
        return prev + 10;
      });
    }, 100);
  }, []);

  // Handle drag and drop events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  const removeReceiptFile = useCallback(() => {
    setReceiptFile(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Form validation
  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};

    if (!selectedPaymentMethod) {
      errors.paymentMethod = 'Please select a payment method';
    }

    if (selectedPaymentMethod === 'cod' && !receiptFile) {
      errors.receiptFile = 'Please upload your payment receipt';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [selectedPaymentMethod, receiptFile]);

  // Handle continue button click
  const handleContinue = useCallback(() => {
    if (validateForm()) {
      onContinue(selectedPaymentMethod, receiptFile || undefined);
    }
  }, [validateForm, selectedPaymentMethod, receiptFile, onContinue]);

  // Check if continue button should be enabled
  const isContinueEnabled =
    selectedPaymentMethod &&
    (selectedPaymentMethod !== 'cod' || (receiptFile && uploadStatus === 'success'));

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Progress Indicator - Honeycomb Style */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-2">
            {progressSteps.map((step, index) => (
              <React.Fragment key={step.id}>
                {/* Hexagon Step */}
                <div className="relative">
                  <div
                    className={`
                      w-12 h-12 flex items-center justify-center
                      transition-all duration-300 relative
                      ${
                        step.completed
                          ? 'bg-green-500 text-white'
                          : step.current
                            ? 'bg-amber-500 text-white ring-4 ring-amber-200'
                            : 'bg-gray-200 text-gray-500'
                      }
                    `}
                    style={{
                      clipPath:
                        'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                    }}
                  >
                    {step.completed ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-bold">{index + 1}</span>
                    )}
                  </div>

                  {/* Step Name */}
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                    <span
                      className={`text-xs font-medium ${
                        step.current
                          ? 'text-amber-600'
                          : step.completed
                            ? 'text-green-600'
                            : 'text-gray-500'
                      }`}
                    >
                      {step.name}
                    </span>
                  </div>
                </div>

                {/* Connector */}
                {index < progressSteps.length - 1 && (
                  <div
                    className={`
                    w-16 h-0.5
                    ${step.completed ? 'bg-green-500' : 'bg-gray-300'}
                  `}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Select Payment Method</h1>
            <p className="text-gray-600">Choose your preferred payment option</p>
          </div>

          {/* Payment Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = selectedPaymentMethod === method.id;

              return (
                <div
                  key={method.id}
                  onClick={() => handlePaymentMethodSelect(method.id)}
                  className={`
                    relative p-6 border-2 rounded-2xl cursor-pointer
                    transition-all duration-200 hover:shadow-lg
                    ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50 shadow-amber-100'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }
                  `}
                >
                  {/* Recommended Badge */}
                  {method.recommended && (
                    <div className="absolute -top-2 -right-2 px-2 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">
                      Recommended
                    </div>
                  )}

                  {/* Radio Selection */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center
                        transition-all duration-200
                        ${isSelected ? 'border-amber-500 bg-amber-500' : 'border-gray-300'}
                      `}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>

                      {/* Icon */}
                      <div
                        className={`
                        w-20 h-20 rounded-xl flex items-center justify-center
                        ${isSelected ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'}
                      `}
                      >
                        <Icon className="w-10 h-10" />
                      </div>
                    </div>

                    {/* Checkmark for selected state */}
                    {isSelected && (
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Provider Name */}
                  <h3
                    className={`font-semibold mb-1 ${
                      isSelected ? 'text-amber-700' : 'text-gray-900'
                    }`}
                  >
                    {method.name}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-gray-600">{method.description}</p>

                  {/* Subtle Glow Effect */}
                  {isSelected && (
                    <div className="absolute inset-0 rounded-2xl bg-amber-500/5 pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Receipt Upload Section (for COD) */}
          {selectedPaymentMethod === 'cod' && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Payment Receipt</h2>

              <div
                className={`
                  relative border-2 border-dashed rounded-2xl p-8 text-center
                  transition-all duration-200
                  ${
                    isDragging
                      ? 'border-amber-500 bg-amber-50'
                      : uploadStatus === 'success'
                        ? 'border-green-500 bg-green-50'
                        : uploadStatus === 'error'
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                  }
                `}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {uploadStatus === 'uploading' ? (
                  <div className="space-y-4">
                    <Loader2 className="w-12 h-12 text-amber-500 mx-auto animate-spin" />
                    <div className="w-64 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
                      <div
                        className="h-full bg-amber-500 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600">Uploading... {uploadProgress}%</p>
                  </div>
                ) : uploadStatus === 'success' && receiptFile ? (
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <File className="w-5 h-5 text-green-600" />
                      <span className="text-green-700 font-medium">{receiptFile.name}</span>
                      <button
                        onClick={removeReceiptFile}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-green-600">Receipt uploaded successfully!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-gray-700 font-medium mb-2">
                        Drag and drop your receipt here
                      </p>
                      <p className="text-sm text-gray-500">PNG, JPG, PDF (max 5MB)</p>
                    </div>
                    <button
                      type="button"
                      className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                    >
                      Browse Files
                    </button>
                  </div>
                )}
              </div>

              {/* Validation Error */}
              {validationErrors.receiptFile && (
                <div className="mt-4 flex items-center space-x-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{validationErrors.receiptFile}</span>
                </div>
              )}
            </div>
          )}

          {/* Security Badges */}
          <div className="flex items-center justify-center space-x-8 mb-8 py-6 border-t border-gray-200">
            <div className="flex items-center space-x-2 text-gray-600">
              <Shield className="w-5 h-5" />
              <span className="text-sm">SSL Secured</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Lock className="w-5 h-5" />
              <span className="text-sm">256-bit Encryption</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm">Trusted by 10,000+ families</span>
            </div>
          </div>

          {/* Trust Signals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 p-6 bg-amber-50 rounded-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center">
                <ChevronRight className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Manual verification within 2 hours</p>
                <p className="text-sm text-gray-600">Our team reviews every payment</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">100% secure transaction</p>
                <p className="text-sm text-gray-600">Bank-level security protocols</p>
              </div>
            </div>
          </div>

          {/* Validation Error */}
          {validationErrors.paymentMethod && (
            <div className="mb-6 flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{validationErrors.paymentMethod}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={onBack}
              className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Back
            </button>

            <button
              onClick={handleContinue}
              disabled={!isContinueEnabled}
              className={`
                px-8 py-3 rounded-xl font-semibold transition-all duration-200
                flex items-center space-x-2
                ${
                  isContinueEnabled
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white hover:from-amber-500 hover:to-amber-600 shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              <span>Continue</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPaymentStep;
