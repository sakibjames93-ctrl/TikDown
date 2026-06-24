import React from 'react';
import { Users, DownloadCloud, Globe, DollarSign, Activity, Settings, Database, Code, BarChart4 } from 'lucide-react';
import { motion } from 'motion/react';

export function AdminPanel() {
  const stats = [
    { label: 'Total Downloads', value: '1.2M', trend: '+14%', icon: DownloadCloud, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Today Downloads', value: '8,432', trend: '+5%', icon: Activity, color: 'text-cyan-600', bg: 'bg-cyan-100' },
    { label: 'Revenue (AdSense)', value: '$452', trend: '+12%', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Active Users', value: '42K', trend: '+2%', icon: Users, color: 'text-pink-600', bg: 'bg-pink-100' },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">System overview and remote configurations.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white text-gray-700 font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm text-sm">
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={idx} 
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                {stat.trend}
              </span>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</h3>
            <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Module */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-500" />
                System Configurations
              </h2>
            </div>
            <div className="p-6 space-y-6">
              
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Code className="w-4 h-4 text-gray-400" /> AdSense Code (Header)
                </label>
                <textarea 
                  className="w-full text-sm font-mono p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-colors resize-none" 
                  rows={3} 
                  defaultValue={'<script async src="https://pagead2.googlesyndication.com/..."></script>'}
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Database className="w-4 h-4 text-gray-400" /> API Settings (Third-Party Providers)
                </label>
                <div className="flex gap-4">
                  <input 
                    type="password" 
                    className="flex-1 text-sm p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-300"
                    defaultValue="sk_test_api_key_hidden"
                  />
                  <button className="px-4 py-2 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-colors text-sm">
                    Update Key
                  </button>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button className="px-6 py-2.5 bg-pink-500 text-white font-medium rounded-xl hover:bg-pink-600 transition-colors shadow-sm">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-gray-500" />
              Top Countries
            </h2>
            <div className="space-y-4">
              {[
                { name: 'United States', flag: '🇺🇸', val: '45%' },
                { name: 'India', flag: '🇮🇳', val: '22%' },
                { name: 'Brazil', flag: '🇧🇷', val: '14%' },
                { name: 'Indonesia', flag: '🇮🇩', val: '8%' },
                { name: 'Others', flag: '🌍', val: '11%' },
              ].map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <span>{c.flag}</span>
                    <span>{c.name}</span>
                  </div>
                  <span className="font-medium text-gray-900">{c.val}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
              <BarChart4 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">SEO Check</h3>
              <p className="text-sm text-gray-500 mt-1 mb-3">Sitemap is up to date and robots.txt is accessible.</p>
              <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Manage SEO →</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
