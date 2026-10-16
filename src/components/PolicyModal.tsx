import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, RotateCcw, Truck, FileText, Lock, ChevronRight, Phone, MapPin } from 'lucide-react';

export type PolicyType = 'refund' | 'delivery' | 'privacy' | 'terms';

interface PolicyModalProps {
  isOpen: boolean;
  initialPolicy?: PolicyType;
  onClose: () => void;
}

interface PolicyContent {
  id: PolicyType;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  sections: { heading: string; body: string }[];
}

const POLICIES: PolicyContent[] = [
  {
    id: 'refund',
    title: 'Return & Refund Policy',
    icon: RotateCcw,
    description: 'Guidelines on returns, replacements, and refunds for our freshly made Telugu snacks and sweets.',
    sections: [
      {
        heading: 'Perishable Food Products Notice',
        body: 'At Sahadeep Reddy’s PindiVantalu, all our snacks—including crispy Murukulu, authentic Chekkalu, Boondi, Gavvalu, and savory mixtures—are freshly prepared in small batches with care and attention to quality. Because our food products are consumable and perishable, we do not accept returns for reasons such as a change of mind once an order has been delivered. However, if you receive a damaged, incorrect, or spoiled product, please contact us promptly so we can review the issue and assist you appropriately. We are committed to maintaining food safety, hygiene, and customer satisfaction.',
      },
      {
        heading: 'Damaged, Tampered, or Defective Deliveries',
        body: 'If your order arrives damaged, with broken tamper-evident seals, or in an unsatisfactory condition, please report it to our customer care team within 24 hours of delivery. Please provide your order number and photograph/video evidence of the packaging to via WhatsApp at +91 9182693953 or +91 9849397359.',
      },
      {
        heading: 'Replacement & Full Refund Processing',
        body: 'Upon verification of the issue, we will immediately arrange a fresh replacement batch at zero additional cost, or issue a 100% refund to your original payment method (UPI, credit/debit card, or net banking). Refunds are typically credited back to your bank account within 3 to 5 business days depending on banking clearing cycles.',
      },
      {
        heading: 'Cancellation Policy',
        body: 'Orders can be cancelled free of charge if requested before the batch has been packed and handed over to our logistics courier (typically within 4 hours of placing the order). Once an order has entered the "Packed" or "Dispatched" stage, cancellations cannot be processed.',
      },
    ],
  },
  {
    id: 'delivery',
    title: 'Delivery Policy',
    icon: Truck,
    description: 'Shipping timelines, courier partners, and packaging safety across India.',
    sections: [
      {
        heading: 'Kitchen Dispatch Timelines',
        body: 'Every order placed at Sahadeep Reddy’s PindiVantalu is prepared with care to maintain freshness and quality. Our traditional snacks are prepared in batches, allowed to cool, and packed in food-grade packaging to help preserve their taste and freshness. Orders are carefully packed and dispatched according to product availability and preparation schedules. We strive to deliver fresh, delicious traditional snacks to your doorstep.',
      },
      {
        heading: 'Delivery Destinations & Transit Times',
        body: 'We deliver our freshly prepared traditional snacks across India within **1–4 business days**, depending on your location and courier availability. Orders are carefully packed to maintain freshness and quality.',
      },
      {
        heading: 'Careful & Secure Packaging',
        body: 'Our traditional snacks are carefully packed in food-grade packaging to help preserve their freshness, taste, and crunchiness during transit. Each order is packed with care to minimize the risk of damage during delivery.',
      },
      {
        heading: 'Order Tracking & Delivery Updates',
        body: 'Once your order is dispatched, tracking details will be shared when available so you can follow your shipment’s progress. You can also check your order status through our order tracking portal using your order ID.',
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    icon: Lock,
    description: 'How Sahadeep Reddy\'s PindiVantalu collects, uses, and protects your personal data.',
    sections: [
      {
        heading: 'Information We Collect',
        body: 'We collect minimal personal information strictly necessary to process and fulfill your snack orders. This includes: recipient full name, contact mobile number, delivery address, pin code, and email address for billing receipts and delivery updates.',
      },
      {
        heading: 'Payment Information Security',
        body: 'Sahadeep Reddy\'s does NOT store your credit card numbers, CVVs, debit card PINs, or UPI MPINs. All digital transactions are securely processed directly through RBI-authorized, PCI-DSS compliant payment gateways (Razorpay) using 256-bit SSL encryption.',
      },
      {
        heading: 'No Third-Party Data Selling',
        body: 'We strictly respect your privacy. We never sell, rent, or lease your personal information to third-party marketing firms, advertisers, or lead brokers. Your data is used exclusively to dispatch orders, notify you of order milestones, and provide customer support.',
      },
      {
        heading: 'Cookies & Browser Storage',
        body: 'We use local storage and essential cookies solely to remember your active shopping cart contents, session authentication, and dietary preferences for a fast, responsive user experience.',
      },
    ],
  },
  {
    id: 'terms',
    title: 'Terms and Conditions',
    icon: FileText,
    description: 'General rules, terms of purchase, and intellectual property guidelines.',
    sections: [
      {
        heading: 'Agreement to Terms',
        body: 'By accessing, browsing, or placing an order on Sahadeep Reddy\'s PindiVantalu web store, you agree to comply with and be bound by these Terms and Conditions along with our Refund, Delivery, and Privacy Policies.',
      },
      {
        heading: 'Product Pricing & Dynamic Campaign Offers',
        body: 'All snack prices are quoted in Indian Rupees (₹) inclusive of applicable goods and services taxes. Promotional campaign discounts, festive offers, and packaging tier prices (250g, 500g, 1kg) are displayed transparently with original and discounted rates.',
      },
      {
        heading: 'Storage and Shelf Life Instructions',
        body: 'Our traditional savories and sweets contain zero chemical preservatives or artificial flavor enhancers. Customers are advised to store unopened pouches in a cool, dry place away from sunlight, and once opened, transfer the contents to clean airtight containers to preserve aroma and crispness for up to 60 days.',
      },
      {
        heading: 'Intellectual Property Rights',
        body: 'All brand names, logos, product photography, heirloom recipe descriptions, and UI design assets associated with Sahadeep Reddy\'s PindiVantalu are protected intellectual property. Unauthorized commercial reproduction or scraping is prohibited.',
      },
    ],
  },
];

export const PolicyModal: React.FC<PolicyModalProps> = ({
  isOpen,
  initialPolicy = 'refund',
  onClose,
}) => {
  const [activePolicy, setActivePolicy] = useState<PolicyType>(initialPolicy);

  useEffect(() => {
    if (initialPolicy) {
      setActivePolicy(initialPolicy);
    }
  }, [initialPolicy, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentPolicy = POLICIES.find((p) => p.id === activePolicy) || POLICIES[0];
  const IconComponent = currentPolicy.icon;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5">
      {/* Dark overlay backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-3xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 z-10 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-stone-200/80 bg-gradient-to-r from-stone-50 via-amber-50/40 to-stone-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-stone-900">
                Store Policies
              </h2>
              <p className="text-[11px] text-stone-500">
                Sahadeep Reddy's PindiVantalu Customer Commitments & Standards
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-200/60 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector Bar */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 pt-3 pb-2 bg-stone-50/70 border-b border-stone-200/60 overflow-x-auto shrink-0 scrollbar-none">
          {POLICIES.map((p) => {
            const isTabActive = p.id === activePolicy;
            const TabIcon = p.icon;
            return (
              <button
                key={p.id}
                onClick={() => setActivePolicy(p.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${isTabActive
                    ? 'bg-[#451A03] text-[#FEF3C7] shadow-sm'
                    : 'bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900 border border-stone-200/80'
                  }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{p.title}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1 text-stone-800">
          <div className="flex items-start gap-3 pb-4 border-b border-stone-100">
            <div className="p-2.5 rounded-xl bg-amber-100/80 text-amber-900 shrink-0 mt-0.5">
              <IconComponent className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-stone-900">
                {currentPolicy.title}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                {currentPolicy.description}
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {currentPolicy.sections.map((sec, idx) => (
              <div
                key={idx}
                className="bg-stone-50/70 rounded-xl p-4 border border-stone-200/70 hover:border-amber-200 transition-colors"
              >
                <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5 uppercase tracking-wider mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                  <span>{sec.heading}</span>
                </h4>
                <div className="text-xs text-stone-600 leading-relaxed whitespace-pre-line font-sans">
                  {sec.body}
                </div>
              </div>
            ))}
          </div>

          {/* Customer Care Support Note */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <p className="font-bold text-amber-950">Have questions about our policies?</p>
              <p className="text-amber-800/80 text-[11px] mt-0.5">
                Our support team is available 9:00 AM – 8:00 PM IST to assist with any orders.
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-amber-900 mt-1">
                <MapPin className="w-3 h-3 text-amber-700 shrink-0" />
                <span>Miyapur, HMT Swarnapuri Colony, Hyderabad - 502032</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <a
                href="tel:+919182693953"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-800 text-white font-bold text-xs hover:bg-amber-900 transition-colors shadow-2xs font-mono"
              >
                <Phone className="w-3 h-3 text-amber-200" />
                <span>+919182693953</span>
              </a>
              <a
                href="tel:+919849397359"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 font-bold text-xs hover:bg-amber-100 transition-colors shadow-2xs font-mono"
              >
                <Phone className="w-3 h-3 text-amber-700" />
                <span>9849397359</span>
              </a>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 sm:px-6 bg-stone-50 border-t border-stone-200 flex items-center justify-between shrink-0 text-xs">
          <span className="text-[11px] text-stone-400">
            Last updated: October 2026 · Sahadeep Reddy's PindiVantalu
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
