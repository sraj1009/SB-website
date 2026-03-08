import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import BeeCharacter from './BeeCharacter';
import api from '../services/api';

const SuccessPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const sessionId = searchParams.get('sess_id');
    const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
    const [orderId, setOrderId] = useState<string | null>(null);

    useEffect(() => {
        const verifyPayment = async () => {
            if (!sessionId) {
                setStatus('failed');
                return;
            }

            try {
                // api.payments.getStatus returns the data object directly
                const data = await api.payments.getStatus(sessionId);
                const isPaid = data?.paymentStatus === 'success' || data?.status === 'completed' || (data?.type === 'order' && data?.paymentStatus === 'success') || data?.orderCreated === true;
                if (isPaid) {
                    setStatus('success');
                    setOrderId(data?.orderId || data?.sessionId || sessionId);
                } else {
                    // Poll a few times since webhook might be delayed
                    setTimeout(async () => {
                        try {
                            const retryData = await api.payments.getStatus(sessionId);
                            const retryPaid = retryData?.paymentStatus === 'success' || retryData?.status === 'completed' || retryData?.orderCreated === true;
                            if (retryPaid) {
                                setStatus('success');
                                setOrderId(retryData?.orderId || retryData?.sessionId || sessionId);
                            } else {
                                setStatus('failed');
                            }
                        } catch {
                            setStatus('failed');
                        }
                    }, 3000);
                }
            } catch (error) {
                console.error("Payment verification failed", error);
                setStatus('failed');
            }
        };

        verifyPayment();
    }, [sessionId]);

    return (
        <div className="min-h-screen bg-brand-light flex items-center justify-center p-4">
            <div className="bg-white rounded-[4rem] p-12 md:p-20 max-w-2xl w-full text-center shadow-2xl border-[6px] border-brand-accent relative overflow-hidden animate-slide-up">
                <div className="absolute top-0 right-0 w-40 h-40 bg-brand-primary/10 rounded-full blur-3xl -mr-20 -mt-20"></div>

                {status === 'loading' && (
                    <div className="flex flex-col items-center">
                        <div className="w-40 h-40 relative mb-10">
                            <div className="absolute inset-0 border-[8px] border-brand-primary/10 rounded-full"></div>
                            <div className="absolute inset-0 border-[8px] border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center animate-buzz">
                                <BeeCharacter size="5rem" />
                            </div>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-brand-black mb-6 tracking-tighter">Verifying Payment...</h2>
                        <p className="text-gray-500 font-bold text-xl mb-10">Please don't close this window.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center animate-fade-in">
                        <div className="w-40 h-40 bg-brand-meadow rounded-[3rem] flex items-center justify-center mx-auto mb-10 shadow-2xl relative group border-[8px] border-white overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent"></div>
                            <svg className="w-20 h-20 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h2 className="text-5xl md:text-7xl font-black text-brand-black mb-6 tracking-tighter">Bzz-tastic!</h2>
                        <p className="text-gray-500 font-bold text-xl md:text-2xl mb-10 leading-relaxed">
                            Order <span className="text-brand-primary">#{orderId}</span> has been confirmed! 🍯
                        </p>
                        <div className="bg-brand-light p-8 rounded-[2.5rem] border-4 border-white mb-10 shadow-inner">
                            <p className="text-brand-black font-black text-lg italic opacity-80">
                                Our hive team is already preparing your package! We'll buzz you as soon as it's shipped.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full bg-brand-black text-brand-primary font-black py-6 rounded-[2rem] text-xl hover:scale-105 transition-all shadow-xl active:scale-95"
                        >
                            Continue Shopping
                        </button>
                    </div>
                )}

                {status === 'failed' && (
                    <div className="flex flex-col items-center animate-fade-in">
                        <div className="w-40 h-40 bg-brand-rose rounded-[3rem] flex items-center justify-center mx-auto mb-10 shadow-2xl relative group border-[8px] border-white overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent"></div>
                            <svg className="w-20 h-20 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </div>
                        <h2 className="text-5xl md:text-6xl font-black text-brand-black mb-6 tracking-tighter">Payment Failed</h2>
                        <p className="text-gray-500 font-bold text-xl mb-10 leading-relaxed">
                            Oops! Something went wrong with your transaction. No money was deducted.
                        </p>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full bg-brand-primary text-brand-black font-black py-6 rounded-[2rem] text-xl hover:scale-105 transition-all shadow-xl active:scale-95"
                        >
                            Return to Hive
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SuccessPage;
