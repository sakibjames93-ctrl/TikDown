import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Home as HomeIcon, LayoutDashboard, Crown, PlaySquare, LogOut, User, Loader2, ShieldAlert } from 'lucide-react';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { useAuth } from './contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

const Home = lazy(() => import('./components/Home').then(module => ({ default: module.Home })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then(module => ({ default: module.AdminPanel })));
const Auth = lazy(() => import('./components/Auth').then(module => ({ default: module.Auth })));
const Pricing = lazy(() => import('./components/Pricing').then(module => ({ default: module.Pricing })));

const About = lazy(() => import('./components/About').then(module => ({ default: module.About })));
const Privacy = lazy(() => import('./components/Privacy').then(module => ({ default: module.Privacy })));
const Terms = lazy(() => import('./components/Terms').then(module => ({ default: module.Terms })));

const LoadingScreen = () => (
  <div className="flex-1 flex items-center justify-center min-h-[50vh]">
    <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
  </div>
);

export default function App() {
  const { user, isAdmin, isPremium, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [adsCodeBody, setAdsCodeBody] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'global'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setMaintenanceMode(data.maintenanceMode === true);
          if (data.adsCodeBody) {
            setAdsCodeBody(data.adsCodeBody);
          }
          
          if (data.seoTitle) {
            document.title = data.seoTitle;
          }
          if (data.seoDescription) {
            let meta = document.querySelector('meta[name="description"]');
            if (!meta) {
              meta = document.createElement('meta');
              meta.setAttribute('name', 'description');
              document.head.appendChild(meta);
            }
            meta.setAttribute('content', data.seoDescription);
          }
          if (data.adsCodeHead && !document.getElementById('ads-head')) {
            const range = document.createRange();
            const fragment = range.createContextualFragment(data.adsCodeHead);
            const container = document.createElement('div');
            container.id = 'ads-head';
            container.appendChild(fragment);
            document.head.appendChild(container);
          }
        }
      } catch (e) {
        console.error("Failed to fetch settings", e);
      } finally {
        setSettingsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (maintenanceMode && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-16 h-16 text-pink-500 mb-6" />
        <h1 className="text-4xl font-bold mb-4">Under Maintenance</h1>
        <p className="text-gray-400 max-w-md text-lg">
          We are currently performing some scheduled maintenance. Please check back soon.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-8 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition-colors"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <PayPalScriptProvider options={{ "clientId": "test", components: "buttons", currency: "USD" }}>
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col font-sans relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none" />
        
        {/* Navbar */}
        <nav className="bg-slate-900/60 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <Link 
                to="/"
                className="flex items-center gap-2 cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-pink-500/20 group-hover:shadow-pink-500/40 transition-shadow">
                  <PlaySquare className="w-5 h-5 text-white fill-white" />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300 tracking-tight">
                  TikDown
                </span>
              </Link>
              
              <div className="flex items-center gap-2 sm:gap-6">
                <Link 
                  to="/"
                  className={`text-sm font-medium flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${location.pathname === '/' ? 'text-white bg-slate-800' : 'text-gray-400 hover:text-white hover:bg-slate-800/50'}`}
                >
                  <HomeIcon className="w-4 h-4 hidden sm:block" /> Downloader
                </Link>
                
                <Link 
                  to="/pricing"
                  className={`text-sm font-medium flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${location.pathname === '/pricing' ? 'text-pink-400 bg-pink-500/10 border border-pink-500/20' : 'text-pink-400 hover:bg-pink-500/10 border border-transparent hover:border-pink-500/20'}`}
                >
                  <Crown className="w-4 h-4" /> <span className="hidden sm:inline">Premium</span>
                </Link>

                {isAdmin && (
                  <Link 
                    to="/admin"
                    className={`text-sm font-medium flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${location.pathname === '/admin' ? 'text-white bg-slate-800' : 'text-gray-400 hover:text-white hover:bg-slate-800/50'}`}
                  >
                    <LayoutDashboard className="w-4 h-4 hidden sm:block" /> Admin
                  </Link>
                )}

                <div className="h-4 w-px bg-slate-700 hidden sm:block mx-1"></div>

                {user ? (
                  <button 
                    onClick={() => signOut()}
                    className="text-sm font-medium text-gray-400 hover:text-red-400 flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4 hidden sm:block" /> Logout
                  </button>
                ) : (
                  <Link 
                    to="/login"
                    className="text-sm font-medium text-white bg-white/10 hover:bg-white/20 border border-white/10 flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                  >
                    <User className="w-4 h-4 hidden sm:block" /> Login
                  </Link>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 w-full flex flex-col relative z-10">
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/admin" element={isAdmin ? <AdminPanel /> : <div className="p-8 text-center text-red-500">Access Denied</div>} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/login" element={<Auth mode="login" />} />
              <Route path="/register" element={<Auth mode="register" />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
            </Routes>
          </Suspense>
        </main>

        {adsCodeBody && (
          <div className="w-full flex justify-center py-4 bg-transparent z-10" dangerouslySetInnerHTML={{ __html: adsCodeBody }} />
        )}

        {/* Footer */}
        <footer className="bg-slate-900/80 backdrop-blur-md border-t border-slate-800 py-8 mt-auto relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} TikDown. This tool is not affiliated with TikTok.
            </p>
            <div className="flex gap-6 text-sm text-gray-500 font-medium pt-2 md:pt-0">
              <Link to="/about" className="hover:text-gray-300 transition-colors">About</Link>
              <Link to="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-gray-300 transition-colors">Terms of Service</Link>
            </div>
          </div>
        </footer>
      </div>
    </PayPalScriptProvider>
  );
}

