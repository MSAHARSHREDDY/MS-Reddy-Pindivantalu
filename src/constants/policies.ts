export interface Policy {
  id: string;
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: {
    title: string;
    content: string;
    list?: string[];
  }[];
}

export const POLICIES: Policy[] = [
  {
    id: 'policy-refund',
    title: 'Return & Refund Policy',
    subtitle: 'We take pride in our traditional snacks. If something is not right, we are here to make it right.',
    lastUpdated: 'October 12, 2026',
    sections: [
      {
        title: '1. Quality Assurance & Freshness',
        content: 'At Pindi Snacks (Sahadeep Reddys), every batch of our traditional snacks is prepared with utmost care, premium ingredients, and strict hygiene standards. Due to the perishable and consumable nature of food items, we maintain stringent quality checks before dispatch.'
      },
      {
        title: '2. Eligibility for Returns & Replacements',
        content: 'We accept return or replacement requests strictly under the following conditions:',
        list: [
          'Damaged, tampered, or spoiled packaging received upon delivery.',
          'Incorrect product variant or weight delivered compared to your order confirmation.',
          'Quality defect reported within 48 hours of delivery with photographic evidence.'
        ]
      },
      {
        title: '3. Non-Returnable Items',
        content: 'For health, safety, and hygiene reasons, opened or consumed food packages cannot be returned unless proven spoiled or defective upon opening.'
      },
      {
        title: '4. Refund Process & Timelines',
        content: 'Once your return request is reviewed and approved by our support team, refunds are processed within 5-7 business days to your original payment method or bank account. For Cash on Delivery (COD) orders, refunds are issued via UPI or bank transfer.'
      },
      {
        title: '5. How to Initiate a Request',
        content: 'To raise a return or refund request, please call or WhatsApp our customer support line directly at +919182693953,9849397359 with your Order ID and photos of the package. Kitchen & Office: Miyapur, HMT Swarnapuri Colony, Hyderabad - 502032.'
      }
    ]
  },
  {
    id: 'policy-delivery',
    title: 'Delivery Policy',
    subtitle: 'Fast, secure, and hygienic delivery of authentic traditional snacks to your doorstep.',
    lastUpdated: 'October 15, 2026',
    sections: [
      {
        title: '1. Shipping Coverage & Partners',
        content: 'We ship across India through trusted courier and logistics partners (Blue Dart, Delhivery, DTDC, and India Post) ensuring safe transit of fragile and crispy snacks.'
      },
      {
        title: '2. Processing & Dispatch Time',
        content: 'Orders are typically processed and dispatched within 24 to 48 hours of confirmation. Orders placed on Sundays or public holidays are processed on the next business day.'
      },
      {
        title: '3. Estimated Delivery Timelines',
        content: 'Delivery of orders is completed between 1-4 days across India:',
        list: [
          'Hyderabad & Telangana: 1-2 days.',
          'Andhra Pradesh & South India: 2-3 days.',
          'Rest of India: 2-4 days.',
          'All packages are dispatched via express logistics to ensure fresh delivery between 1-4 days.'
        ]
      },
      {
        title: '4. Shipping Charges',
        content: 'We offer free standard shipping on orders above ₹499. For orders below ₹499, a nominal delivery charge of ₹49 is applied at checkout.'
      },
      {
        title: '5. Order Tracking',
        content: 'Once your order is dispatched, you will receive an SMS notification with your tracking link and AWB number. You can also track your order live on our website or call our support team at +919182693953,9849397359.'
      }
    ]
  },
  {
    id: 'policy-privacy',
    title: 'Privacy Policy',
    subtitle: 'Your trust is paramount. We respect your privacy and protect your personal information.',
    lastUpdated: 'October 15, 2026',
    sections: [
      {
        title: '1. Information We Collect',
        content: 'We collect personal information when you place an order, create an account, or contact support. This includes your name, phone number, delivery address, and order history.'
      },
      {
        title: '2. How We Use Your Information',
        content: 'Your information is used strictly to fulfill orders, provide customer support, send delivery updates, and improve your shopping experience. We do not sell or rent your personal data to third parties.'
      },
      {
        title: '3. Data Security',
        content: 'We employ robust encryption and secure servers (HTTPS, JWT authentication, and secure database storage) to ensure your personal data and password credentials remain confidential.'
      },
      {
        title: '4. Cookies & Analytics',
        content: 'Our website uses essential cookies to manage your shopping cart session, user authentication state, and preferences. You can disable cookies in your browser settings, though some store features may require them.'
      },
      {
        title: '5. Contact Us Regarding Privacy',
        content: 'If you have any questions or concerns about our privacy practices, please call our customer support team directly at +919182693953,9849397359, or visit us at Miyapur, HMT Swarnapuri Colony, Hyderabad - 502032.'
      }
    ]
  },
  {
    id: 'policy-terms',
    title: 'Terms & Conditions',
    subtitle: 'Please read these terms carefully before using our website or placing an order.',
    lastUpdated: 'October 15, 2026',
    sections: [
      {
        title: '1. Introduction',
        content: 'Welcome to Pindi Snacks (operated by Sahadeep Reddys). By accessing our website (https://www.sahadeep-reddys.in) and purchasing our products, you agree to comply with and be bound by these Terms and Conditions.'
      },
      {
        title: '2. Pricing & Product Availability',
        content: 'All prices listed on our website are in Indian Rupees (INR) and inclusive of applicable taxes unless stated otherwise. We reserve the right to modify prices or discontinue products at any time without prior notice.'
      },
      {
        title: '3. User Accounts & Security',
        content: 'You are responsible for maintaining the confidentiality of your account credentials and password. You agree to accept responsibility for all activities that occur under your account.'
      },
      {
        title: '4. Intellectual Property',
        content: 'All content on this website—including logos, product names, images, descriptions, recipes, and design layout—is the exclusive property of Sahadeep Reddys and protected by copyright laws.'
      },
      {
        title: '5. Limitation of Liability',
        content: 'Sahadeep Reddys shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or website.'
      },
      {
        title: '6. Customer Support & Kitchen Address',
        content: 'For any support, questions, or assistance, call our support team at +919182693953,9849397359. Address: Miyapur, HMT Swarnapuri Colony, Hyderabad - 502032.'
      }
    ]
  }
];
