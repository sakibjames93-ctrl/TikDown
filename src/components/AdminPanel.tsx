import React, { useEffect, useState } from 'react';
import { Users, DownloadCloud, Globe, DollarSign, Activity, Settings, Database, Code, BarChart4, Trash, Save, Layout, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { collection, getDocs, deleteDoc, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'settings'>('dashboard');
  
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [totalDownloadsCount, setTotalDownloadsCount] = useState(0);
  const [todayDownloadsCount, setTodayDownloadsCount] = useState(0);

  const [settings, setSettings] = useState({
    websiteName: 'TikDown',
    maintenanceMode: false,
    apiBaseUrl: 'https://tikwm.com/api/',
    adsCodeHead: '',
    adsCodeBody: '',
    seoTitle: 'TikTok Video Downloader - Download Without Watermark',
    seoDescription: 'Download TikTok videos without watermark for free. Fast, secure, and easy to use TikTok downloader.'
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingUsers(false);
      }
    };

    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'global'));
        if (docSnap.exists()) {
          setSettings(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    
    const fetchStats = async () => {
      try {
        const snap = await getDocs(collection(db, 'stats'));
        let total = 0;
        let today = 0;
        const todayDateStr = new Date().toISOString().split('T')[0];
        
        snap.docs.forEach(doc => {
          const data = doc.data();
          total += (data.totalDownloads || 0);
          if (data.date === todayDateStr) {
            today += (data.totalDownloads || 0);
          }
        });
        setTotalDownloadsCount(total);
        setTodayDownloadsCount(today);
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };

    fetchUsers();
    fetchSettings();
    fetchStats();
  }, []);

  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), settings);
      alert('Settings saved successfully!');
    } catch (err: any) {
      alert(`Error saving settings: ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const togglePremium = async (id: string, current: boolean) => {
    await updateDoc(doc(db, 'users', id), { isPremium: !current });
    setUsers(users.map(u => u.id === id ? { ...u, isPremium: !current } : u));
  };

  const deleteUser = async (id: string) => {
    if (confirm("Are you sure?")) {
      await deleteDoc(doc(db, 'users', id));
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const stats = [
    { label: 'Total Downloads', value: totalDownloadsCount.toLocaleString(), trend: '', icon: DownloadCloud, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Today Downloads', value: todayDownloadsCount.toLocaleString(), trend: '', icon: Activity, color: 'text-cyan-600', bg: 'bg-cyan-100' },
    { label: 'Revenue (AdSense)', value: '...', trend: '', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Total Users', value: users.length.toString(), trend: '', icon: Users, color: 'text-pink-600', bg: 'bg-pink-100' },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">System overview and remote configurations.</p>
        </div>
        <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Layout className="w-4 h-4 inline mr-2"/>
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Settings className="w-4 h-4 inline mr-2"/>
            Settings
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <>
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
            {/* Users Table */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    User Management
                  </h2>
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Premium</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loadingUsers ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-center text-gray-500 text-sm">Loading...</td>
                        </tr>
                      ) : users.map(u => (
                        <tr key={u.id}>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-900">{u.name || 'Unnamed'}</p>
                            <p className="text-sm text-gray-500">{u.email}</p>
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => togglePremium(u.id, !!u.isPremium)}
                              className={`text-xs px-2 py-1 rounded-full font-medium ${u.isPremium ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-600'}`}
                            >
                              {u.isPremium ? 'Premium' : 'Standard'}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => deleteUser(u.id)}
                              className="text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sidebar Cards */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
                  <BarChart4 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">SEO Check</h3>
                  <p className="text-sm text-gray-500 mt-1 mb-3">Sitemap is up to date and robots.txt is accessible.</p>
                  <button onClick={() => setActiveTab('settings')} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Manage SEO →</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'settings' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-500" />
              Global Settings
            </h2>
          </div>
          
          <form onSubmit={handleSettingsSave} className="p-6 space-y-8">
            {/* General */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-gray-400"/> General Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website Name</label>
                  <input 
                    type="text" 
                    value={settings.websiteName}
                    onChange={e => setSettings({...settings, websiteName: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer mt-6">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={settings.maintenanceMode}
                        onChange={e => setSettings({...settings, maintenanceMode: e.target.checked})}
                      />
                      <div className={`block w-14 h-8 rounded-full ${settings.maintenanceMode ? 'bg-red-500' : 'bg-gray-200'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition transform ${settings.maintenanceMode ? 'translate-x-6' : ''}`}></div>
                    </div>
                    <div className="ml-3 text-gray-700 font-medium flex items-center gap-2">
                      Maintenance Mode {settings.maintenanceMode && <ShieldAlert className="w-4 h-4 text-red-500"/>}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* API Settings */}
            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-gray-400"/> API Configuration
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TikWM API Base URL</label>
                <input 
                  type="url" 
                  value={settings.apiBaseUrl}
                  onChange={e => setSettings({...settings, apiBaseUrl: e.target.value})}
                  className="w-full max-w-lg px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none font-mono text-sm"
                />
              </div>
            </div>

            {/* SEO Settings */}
            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <BarChart4 className="w-5 h-5 text-gray-400"/> SEO Management
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
                  <input 
                    type="text" 
                    value={settings.seoTitle}
                    onChange={e => setSettings({...settings, seoTitle: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
                  <textarea 
                    value={settings.seoDescription}
                    onChange={e => setSettings({...settings, seoDescription: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none min-h-[100px]"
                  />
                </div>
              </div>
            </div>

            {/* Ads Management */}
            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Code className="w-5 h-5 text-gray-400"/> Ad Placement Codes
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">&lt;head&gt; Ad Code (Google AdSense, etc)</label>
                  <textarea 
                    value={settings.adsCodeHead}
                    onChange={e => setSettings({...settings, adsCodeHead: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none font-mono text-sm min-h-[120px] bg-gray-50"
                    placeholder="<!-- Paste script tags here -->"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">&lt;body&gt; Ad Code (Banner above footer)</label>
                  <textarea 
                    value={settings.adsCodeBody}
                    onChange={e => setSettings({...settings, adsCodeBody: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none font-mono text-sm min-h-[120px] bg-gray-50"
                    placeholder="<!-- Paste HTML/JS for banner ad -->"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="flex items-center gap-2 px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {savingSettings ? 'Saving...' : <><Save className="w-5 h-5" /> Save Changes</>}
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </div>
  );
}

