import React, { useState } from 'react';
import { Home as HomeIcon, LayoutDashboard, Crown, PlaySquare } from 'lucide-react';
import { Home } from './components/Home';
import { AdminPanel } from './components/AdminPanel';

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'admin'>('home');

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setCurrentView('home')}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-cyan-500 flex items-center justify-center shadow-inner">
                <PlaySquare className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">
                TikDown
              </span>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-6">
              <button 
                onClick={() => setCurrentView('home')}
                className={`text-sm font-medium flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${currentView === 'home' ? 'text-gray-900 bg-gray-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                <HomeIcon className="w-4 h-4 hidden sm:block" /> Downloader
              </button>
              
              <button 
                className="text-sm font-medium text-pink-600 hover:bg-pink-50 flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
                onClick={() => alert("Premium tier logic would connect here!")}
              >
                <Crown className="w-4 h-4" /> <span className="hidden sm:inline">Premium</span>
              </button>

              <div className="h-4 w-px bg-gray-200 hidden sm:block mx-1"></div>

              <button 
                onClick={() => setCurrentView('admin')}
                className={`text-sm font-medium flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${currentView === 'admin' ? 'text-gray-900 bg-gray-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                <LayoutDashboard className="w-4 h-4" /> <span className="hidden sm:inline">Admin</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full">
        {currentView === 'home' ? <Home /> : <AdminPanel />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} TikDown. This tool is not affiliated with TikTok.
          </p>
          <div className="flex gap-6 text-sm text-gray-400 font-medium pt-2 md:pt-0">
            <a href="#" className="hover:text-gray-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-gray-600 transition-colors">API API</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
