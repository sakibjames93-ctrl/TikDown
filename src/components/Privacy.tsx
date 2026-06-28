import React from 'react';
import { motion } from 'motion/react';

export function Privacy() {
  return (
    <div className="w-full max-w-4xl mx-auto py-16 px-4 sm:px-6 relative z-10 text-slate-300">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/60 backdrop-blur-xl p-8 md:p-12 rounded-[2rem] border border-slate-700/50 shadow-2xl"
      >
        <h1 className="text-4xl font-extrabold text-white mb-6">Privacy Policy</h1>
        <div className="space-y-6 text-lg leading-relaxed text-sm">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <p>
            Your privacy is important to us. It is TikDown's policy to respect your privacy regarding any information we may collect from you across our website.
          </p>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">1. Information we collect</h2>
          <p>
            We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. 
            When you use our tool to download videos, we do not store a copy of the videos on our servers, nor do we track the specific content you download to a personally identifiable profile unless you are a registered user maintaining a history log.
          </p>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">2. Cookies</h2>
          <p>
            We use "cookies" to collect information about you and your activity across our site. A cookie is a small piece of data that our website stores on your computer, and accesses each time you visit, so we can understand how you use our site.
          </p>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">3. Third-party services</h2>
          <p>
            We may employ third-party companies and individuals on our websites, such as payment processors (e.g., PayPal) or analytics providers. These third parties have access to your personal information only to perform specific tasks on our behalf and are obligated not to disclose or use it for any other purpose.
          </p>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">4. Contact Us</h2>
          <p>
            If you have any questions about how we handle user data and personal information, feel free to contact us.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
