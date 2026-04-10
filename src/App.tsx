/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { 
  onAuthStateChanged, 
  signOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './components/Dashboard';
import FineRegistration from './components/FineRegistration';
import FinePayment from './components/FinePayment';
import { translations } from './translations';
import { 
  Shield, 
  Car, 
  FileText, 
  CreditCard, 
  BarChart3, 
  LogOut, 
  User as UserIcon,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  ChevronRight,
  Filter,
  Download,
  Printer,
  History,
  Loader2,
  Menu,
  X,
  Languages
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<'en' | 'am'>('am');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const t = translations[lang];

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          } else {
            // Check if this email was pre-registered as police or admin in the 'staff' collection
            let role = 'driver';
            const staffQuery = query(collection(db, 'staff'), where('email', '==', user.email));
            const staffSnapshot = await getDocs(staffQuery);
            
            if (!staffSnapshot.empty) {
              role = staffSnapshot.docs[0].data().role;
            } else if (user.email === "policeregion551@gmail.com") {
              role = 'admin';
            }

            const newProfile = {
              uid: user.uid,
              email: user.email,
              name: user.displayName || 'User',
              role: role,
              createdAt: new Date().toISOString(),
              phoneNumber: '' 
            };
            
            await setDoc(doc(db, 'users', user.uid), newProfile);
            setUserProfile(newProfile);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setAuthLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    const phoneNumber = formData.get('phoneNumber') as string;

    try {
      if (authMode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        
        // Check role
        let role = 'driver';
        if (email === "policeregion551@gmail.com") {
          role = 'admin';
        } else {
          const staffQuery = query(collection(db, 'staff'), where('email', '==', email));
          const staffSnapshot = await getDocs(staffQuery);
          if (!staffSnapshot.empty) {
            role = staffSnapshot.docs[0].data().role;
          }
        }

        const newProfile = {
          uid: userCredential.user.uid,
          email,
          name,
          phoneNumber,
          role,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', userCredential.user.uid), newProfile);
        setUserProfile(newProfile);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Auth failed", err);
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const phoneNumber = formData.get('phoneNumber') as string;
    const name = formData.get('name') as string;

    if (!user || !userProfile) return;

    try {
      const updatedProfile = { ...userProfile, phoneNumber, name };
      await setDoc(doc(db, 'users', user.uid), updatedProfile);
      setUserProfile(updatedProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Shield className="w-12 h-12 text-blue-600" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="absolute top-4 right-4">
          <button 
            onClick={() => setLang(lang === 'en' ? 'am' : 'en')}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all border border-slate-100"
          >
            <Languages className="w-4 h-4 text-blue-600" />
            {lang === 'en' ? 'አማርኛ' : 'English'}
          </button>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8"
        >
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">{lang === 'en' ? 'Traffic Fine System' : 'የትራፊክ ቅጣት ሲስተም'}</h1>
          <p className="text-slate-600 mb-8 text-center text-sm">{lang === 'en' ? 'Securely manage traffic violations and payments in Ethiopia.' : 'የትራፊክ ጥፋቶችን እና ክፍያዎችን በኢትዮጵያ ውስጥ ደህንነቱ በተጠበቀ ሁኔታ ያስተዳድሩ።'}</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">{t.fullName}</label>
                  <input 
                    name="name"
                    required
                    placeholder={lang === 'en' ? "Enter your full name" : "ሙሉ ስምዎን ያስገቡ"}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">{t.phoneNumber}</label>
                  <input 
                    name="phoneNumber"
                    required
                    placeholder="+251..."
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">{t.emailAddress}</label>
              <input 
                name="email"
                type="email"
                required
                placeholder="email@example.com"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">{t.password}</label>
              <input 
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <button
              disabled={authLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
            >
              {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (authMode === 'login' ? t.signIn : t.createAccount)}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              {authMode === 'login' ? t.noAccount : t.haveAccount}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Profile Completion Step
  if (userProfile && !userProfile.phoneNumber && userProfile.role === 'driver') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{t.completeProfile}</h2>
          <p className="text-slate-500 mb-6 text-sm">{lang === 'en' ? 'Please provide your details to continue using the system.' : 'እባክዎን ሲስተሙን መጠቀሙን ለመቀጠል ዝርዝሮችዎን ያቅርቡ።'}</p>
          
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">{t.fullName}</label>
              <input 
                name="name"
                defaultValue={user.displayName || ''}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">{t.phoneNumber}</label>
              <input 
                name="phoneNumber"
                placeholder="+251..."
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-200"
            >
              {t.saveContinue}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <span className="font-bold text-lg text-slate-900">FineSys</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-slate-100 rounded-xl transition-all"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 flex flex-col z-50 transition-transform duration-300 md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 hidden md:flex items-center gap-3 border-bottom border-slate-100">
          <Shield className="w-8 h-8 text-blue-600" />
          <span className="font-bold text-xl text-slate-900">FineSys</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem 
            icon={<BarChart3 />} 
            label={t.dashboard} 
            active={activeTab === 'dashboard'} 
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} 
          />
          
          {userProfile?.role === 'police' && (
            <NavItem 
              icon={<Plus />} 
              label={t.issueFine} 
              active={activeTab === 'issue'} 
              onClick={() => { setActiveTab('issue'); setIsSidebarOpen(false); }} 
            />
          )}

          <NavItem 
            icon={<CreditCard />} 
            label={userProfile?.role === 'police' ? t.paymentStatus : t.myFines} 
            active={activeTab === 'payments'} 
            onClick={() => { setActiveTab('payments'); setIsSidebarOpen(false); }} 
          />

          <NavItem 
            icon={<History />} 
            label={t.history} 
            active={activeTab === 'history'} 
            onClick={() => { setActiveTab('history'); setIsSidebarOpen(false); }} 
          />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={() => setLang(lang === 'en' ? 'am' : 'en')}
            className="w-full flex items-center gap-3 p-3 text-slate-600 hover:bg-slate-50 rounded-2xl mb-2 transition-all"
          >
            <Languages className="w-5 h-5 text-blue-600" />
            <span className="font-medium">{lang === 'en' ? 'አማርኛ' : 'English'}</span>
          </button>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user.displayName || user.email}</p>
              <p className="text-xs text-slate-500 capitalize">{userProfile?.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">{t.signOut}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 hidden md:flex items-center justify-between px-8">
          <h2 className="text-xl font-bold text-slate-900 capitalize">{t[activeTab as keyof typeof t] || activeTab}</h2>
          <div className="flex items-center gap-4">
            <div className="relative hidden lg:block">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder={t.searchPlaceholder} 
                className="bg-slate-100 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Dashboard userProfile={userProfile} lang={lang} />
              </motion.div>
            )}
            {activeTab === 'issue' && userProfile?.role === 'police' && (
              <motion.div
                key="issue"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <FineRegistration userProfile={userProfile} lang={lang} />
              </motion.div>
            )}
            {activeTab === 'payments' && (
              <motion.div
                key="payments"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <FinePayment userProfile={userProfile} lang={lang} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t border-slate-200 text-center">
            <p className="text-sm font-bold text-slate-500 mb-1">
              {t.footerText}
            </p>
            <p className="text-xs font-semibold text-slate-400">
              ({t.byAuthor})
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${
        active 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <span className="w-6 h-6">{icon}</span>
      <span className="font-semibold">{label}</span>
    </button>
  );
}
