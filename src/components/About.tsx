import React from 'react';
import { motion } from 'motion/react';

export function About() {
  return (
    <div className="w-full max-w-4xl mx-auto py-16 px-4 sm:px-6 relative z-10 text-slate-300">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/60 backdrop-blur-xl p-8 md:p-12 rounded-[2rem] border border-slate-700/50 shadow-2xl"
      >
        <h1 className="text-4xl font-extrabold text-white mb-6">About TikDown</h1>
        <div className="space-y-6 text-lg leading-relaxed">
          <p>
            Welcome to <span className="font-bold text-white">TikDown</span>, the fastest and most reliable platform for downloading TikTok videos without any watermarks. Our mission is to provide creators, marketers, and everyday users with a seamless tool to save their favorite content in high definition.
          </p>
          <p>
            We understand the frustration of finding a great video and not being able to save it cleanly. That's why we built TikDown using cutting-edge technology to ensure instant downloads, batch profile processing, and the highest possible quality for your offline viewing and content curation needs.
          </p>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Why Choose Us?</h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><span className="font-semibold text-pink-400">Zero Watermarks:</span> Clean, unbranded video files.</li>
            <li><span className="font-semibold text-pink-400">Ultra-Fast Speeds:</span> Powered by high-bandwidth proxy servers.</li>
            <li><span className="font-semibold text-pink-400">Bulk Downloads:</span> Save entire profiles with one click via ZIP.</li>
            <li><span className="font-semibold text-pink-400">Secure & Private:</span> We don't store your downloaded videos.</li>
          </ul>
          <p className="mt-8 pt-6 border-t border-slate-700/50 text-sm text-slate-500">
            Note: TikDown is an independent tool and is not affiliated with, endorsed by, or sponsored by TikTok or ByteDance. Please respect the copyright of the content creators.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
