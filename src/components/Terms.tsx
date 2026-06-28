import React from 'react';
import { motion } from 'motion/react';

export function Terms() {
  return (
    <div className="w-full max-w-4xl mx-auto py-16 px-4 sm:px-6 relative z-10 text-slate-300">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/60 backdrop-blur-xl p-8 md:p-12 rounded-[2rem] border border-slate-700/50 shadow-2xl"
      >
        <h1 className="text-4xl font-extrabold text-white mb-6">Terms of Service</h1>
        <div className="space-y-6 text-lg leading-relaxed text-sm">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing and using TikDown, you accept and agree to be bound by the terms and provision of this agreement.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">2. Use License</h2>
          <p>
            You are granted a limited, non-exclusive, non-transferable license to use the service for personal, non-commercial purposes. You must not use our service to download copyrighted material without the explicit permission of the copyright owner.
          </p>
          
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">3. Disclaimer</h2>
          <p>
            The materials on TikDown are provided on an 'as is' basis. TikDown makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">4. Limitations</h2>
          <p>
            In no event shall TikDown or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on TikDown's website.
          </p>

          <h2 className="text-2xl font-bold text-white mt-8 mb-4">5. Governing Law</h2>
          <p>
            These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction in which the service operates, and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
