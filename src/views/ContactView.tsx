import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2 } from 'lucide-react';
import { StoreSettings } from '../types';

interface ContactViewProps {
  settings?: StoreSettings | null;
  onExploreProducts: () => void;
}

export const ContactView: React.FC<ContactViewProps> = ({ settings, onExploreProducts }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-12">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-stone-900">
          Contact Our Kitchens
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
          Have a question about our homemade snack batches, custom festival gift boxes, bulk family orders, or shipping across India? We are delighted to assist you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Contact Info Card */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <h2 className="font-display text-xl font-bold text-[#451A03] border-b border-stone-100 pb-3">
            Kitchen Information
          </h2>

          <div className="space-y-4 text-xs text-stone-700">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-stone-900 text-sm">Kitchen Location</strong>
                <p className="text-stone-600 mt-0.5 leading-relaxed">
                  {settings?.storeAddress || 'Traditional Kitchens, Madhapur, Hyderabad, Telangana 500081'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-stone-900 text-sm">Direct Phone Support</strong>
                <p className="font-mono text-stone-600 mt-0.5">
                  {settings?.supportPhone || '+91 98765 43210'}
                </p>
                <span className="text-[11px] text-stone-500">Mon - Sat: 9:00 AM - 8:00 PM IST</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-stone-900 text-sm">Order Inquiries</strong>
                <p className="text-stone-600 mt-0.5">
                  {settings?.supportEmail || 'orders@pindivantalu.com'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-stone-900 text-sm">Fresh Frying Schedule</strong>
                <p className="text-stone-600 mt-0.5">
                  Batches fried fresh daily in cold-pressed oil · Dispatched within 24 hours.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Message Form */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <h2 className="font-display text-xl font-bold text-stone-900 border-b border-stone-100 pb-3">
            Send an Inquiry
          </h2>

          {submitted ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-stone-900">
                Message Received!
              </h3>
              <p className="text-xs text-stone-600 max-w-sm mx-auto">
                Thank you, {name || 'customer'}. Our kitchen coordination team will reach out to you within a few hours.
              </p>
              <button
                onClick={onExploreProducts}
                className="mt-3 px-4 py-2 bg-[#451A03] hover:bg-[#78350F] text-[#FEF3C7] text-xs font-semibold rounded-lg shadow-sm"
              >
                Browse Traditional Snacks
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Reddy"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Message / Order Requirements *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="How can we assist you with our traditional Telugu snacks?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-2.5 border border-stone-300 rounded-lg focus:outline-none focus:border-amber-800"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#451A03] hover:bg-[#78350F] text-[#FEF3C7] text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Message</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
