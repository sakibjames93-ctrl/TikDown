import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Check, Loader2, CreditCard, Bitcoin, X, Copy } from 'lucide-react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import QRCode from 'react-qr-code';

export function Pricing() {
  const { user, isPremium } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const cryptoAddress = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
  const cryptoAmount = "0.00015"; // roughly $4.99

  const handleCryptoPaymentClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setShowCryptoModal(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(cryptoAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifyCryptoPayment = async () => {
    setLoading(true);
    // Simulate Blockchain Verification
    setTimeout(async () => {
      await updateDoc(doc(db, 'users', user!.uid), { isPremium: true });
      setShowCryptoModal(false);
      setSuccess(true);
      setLoading(false);
    }, 2500);
  };

  const handlePayPalSuccess = async (details: any) => {
    if (user) {
      await updateDoc(doc(db, 'users', user.uid), { isPremium: true });
      setSuccess(true);
    }
  };

  if (isPremium) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 px-4">
        <div className="bg-gradient-to-r from-pink-500 to-cyan-500 p-1 rounded-full mb-6">
          <div className="bg-white p-4 rounded-full">
            <Check className="w-12 h-12 text-pink-500" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">You are Premium!</h2>
        <p className="text-gray-500 max-w-md text-center">
          Thank you for subscribing to TikDown Premium. You now have unlimited batch downloads, high-speed servers, and no ads.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h2 className="text-base text-pink-600 font-semibold tracking-wide uppercase">Pricing</h2>
        <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          Upgrade to Premium
        </p>
        <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
          Unlock the full potential of TikDown with unlimited bulk downloads and priority processing.
        </p>
      </div>

      {success && (
        <div className="mb-8 p-4 bg-green-50 text-green-700 rounded-xl text-center border border-green-200">
          Payment successful! Your account is being upgraded. Please refresh the page if it doesn't update automatically.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Basic Plan */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col">
          <h3 className="text-2xl font-bold text-gray-900">Free</h3>
          <p className="text-gray-500 mt-2 flex-1">Perfect for occasional downloads.</p>
          <div className="mt-6">
            <span className="text-5xl font-extrabold text-gray-900">$0</span>
            <span className="text-gray-500 font-medium">/mo</span>
          </div>
          <ul className="mt-8 space-y-4">
            {['Standard download speed', 'Ads enabled', 'Single video downloads', 'Standard quality only'].map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-gray-600">
                <Check className="w-5 h-5 text-gray-400" /> {feature}
              </li>
            ))}
          </ul>
          <button 
            className="mt-8 w-full bg-gray-50 text-gray-500 py-3 rounded-xl font-medium cursor-not-allowed"
            disabled
          >
            Current Plan
          </button>
        </div>

        {/* Premium Plan */}
        <div className="bg-gray-900 rounded-3xl shadow-xl p-8 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <CreditCard className="w-48 h-48 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-white relative z-10">Premium</h3>
          <p className="text-gray-400 mt-2 flex-1 relative z-10">For power users and creators.</p>
          <div className="mt-6 relative z-10">
            <span className="text-5xl font-extrabold text-white">$4.99</span>
            <span className="text-gray-400 font-medium">/mo</span>
          </div>
          <ul className="mt-8 space-y-4 relative z-10">
            {['Lightning fast downloads', 'No advertisements', 'Batch profile downloading', 'HD Quality video support', 'Priority customer support'].map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-gray-300">
                <Check className="w-5 h-5 text-pink-500" /> {feature}
              </li>
            ))}
          </ul>
          
          <div className="mt-8 space-y-4 relative z-10">
            {user ? (
              <>
                <PayPalButtons 
                  style={{ layout: "horizontal", color: "white" }}
                  createOrder={(data, actions) => {
                    return actions.order.create({
                      purchase_units: [{ amount: { value: "4.99" } }],
                      intent: "CAPTURE"
                    });
                  }}
                  onApprove={async (data, actions) => {
                    const details = await actions.order?.capture();
                    handlePayPalSuccess(details);
                  }}
                />
                
                <button 
                  onClick={handleCryptoPaymentClick}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-colors"
                >
                  <Bitcoin className="w-5 h-5" />
                  Pay with Crypto
                </button>
              </>
            ) : (
              <button 
                onClick={() => navigate('/login')}
                className="w-full bg-pink-500 text-white py-3 rounded-xl font-medium hover:bg-pink-600 transition-colors"
              >
                Sign in to Upgrade
              </button>
            )}
          </div>
        </div>
      </div>

      {showCryptoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 relative overflow-hidden shadow-2xl">
            <button 
              onClick={() => setShowCryptoModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <Bitcoin className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Pay with Bitcoin</h3>
              <p className="text-sm text-gray-500 mt-2">Send exactly <strong className="text-gray-900">{cryptoAmount} BTC</strong> to the address below.</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl flex flex-col items-center justify-center mb-6 border border-gray-100">
              <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-4">
                <QRCode value={cryptoAddress} size={160} />
              </div>
              
              <div className="w-full space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">BTC Address</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={cryptoAddress}
                    className="flex-1 bg-white border border-gray-200 text-sm font-mono text-gray-600 py-2.5 px-3 rounded-lg focus:outline-none"
                  />
                  <button 
                    onClick={copyToClipboard}
                    className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center justify-center"
                    title="Copy Address"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleVerifyCryptoPayment}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Verifying Payment...
                  </>
                ) : (
                  'I have made the payment'
                )}
              </button>
              <p className="text-xs text-center text-gray-500">
                It may take a few minutes for the transaction to be confirmed on the blockchain.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
