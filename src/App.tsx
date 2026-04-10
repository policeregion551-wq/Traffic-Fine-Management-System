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
  const [selectedRole, setSelectedRole] = useState<'admin' | 'police' | 'driver' | null>(null);

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
            const data = userDoc.data();
            // Force admin role for the specific email if it's not already set
            if (user.email === "policeregion551@gmail.com" && data.role !== 'admin') {
              const updatedProfile = { ...data, role: 'admin' };
              await setDoc(doc(db, 'users', user.uid), updatedProfile);
              setUserProfile(updatedProfile);
            } else {
              setUserProfile(data);
            }
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
        } catch (err: any) {
          console.error("Profile fetch error:", err);
          setError(err.message || "Failed to load user profile");
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
        setError(null);
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
        if (selectedRole !== 'driver') {
          throw new Error(lang === 'en' ? "Only drivers can register themselves. Police and Admins must be registered by the system." : "አሽከርካሪዎች ብቻ ናቸው እራሳቸውን መመዝገብ የሚችሉት። ፖሊሶች እና አድሚኖች በሲስተሙ መመዝገብ አለባቸው።");
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        
        const newProfile = {
          uid: userCredential.user.uid,
          email,
          name,
          phoneNumber,
          role: 'driver',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', userCredential.user.uid), newProfile);
        setUserProfile(newProfile);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // After login, check if the role matches the selected role
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists()) {
          const profile = userDoc.data();
          if (selectedRole && profile.role !== selectedRole) {
            // Special case: policeregion551@gmail.com is always admin
            if (email === "policeregion551@gmail.com" && selectedRole === 'admin') {
              // Allow
            } else {
              await signOut(auth);
              throw new Error(lang === 'en' ? `Access denied. You are registered as a ${profile.role}, but you selected ${selectedRole}.` : `መግባት አልተቻለም። እርስዎ የተመዘገቡት እንደ ${profile.role} ነው፣ ነገር ግን የመረጡት ${selectedRole} ነው።`);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Auth failed", err);
      let message = lang === 'en' ? "Authentication failed. Please check your credentials." : "መግባት አልተቻለም። እባክዎን መረጃዎን ያረጋግጡ።";
      
      if (err.code === 'auth/invalid-credential') {
        message = lang === 'en' ? "Invalid email or password." : "የተሳሳተ ኢሜል ወይም የይለፍ ቃል::";
      } else if (err.code === 'auth/email-already-in-use') {
        message = lang === 'en' ? "This email is already registered." : "ይህ ኢሜል ቀድሞ ተመዝግቧል።";
      } else if (err.code === 'auth/weak-password') {
        message = lang === 'en' ? "Password is too weak." : "የይለፍ ቃሉ በጣም ደካማ ነው።";
      } else if (err.code === 'auth/user-not-found') {
        message = lang === 'en' ? "User not found." : "ተጠቃሚው አልተገኘም።";
      }
      
      setError(message);
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
        <div className="text-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="inline-block mb-4"
          >
            <Shield className="w-12 h-12 text-blue-600" />
          </motion.div>
          <p className="text-slate-500 text-sm font-medium">Loading System...</p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    // Show error on login screen
  } else if (error && user && !userProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl p-8 text-center border border-red-100">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Authentication Error</h2>
          <p className="text-slate-500 mb-8 text-sm">{error}</p>
          <button 
            onClick={() => signOut(auth)}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl"
          >
            Sign Out & Retry
          </button>
        </div>
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

        <AnimatePresence mode="wait">
          {!selectedRole ? (
            <motion.div 
              key="role-selection"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8"
            >
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">{t.selectRole}</h1>
              <p className="text-slate-600 mb-8 text-center text-sm">{lang === 'en' ? 'Please choose your role to continue.' : 'እባክዎን ለመቀጠል ተግባርዎን ይምረጡ።'}</p>
              
              <div className="grid gap-4">
                <RoleButton 
                  icon={<Shield className="w-6 h-6" />}
                  title={t.admin}
                  description={lang === 'en' ? "System administration and management" : "የሲስተም አስተዳደር እና ቁጥጥር"}
                  onClick={() => setSelectedRole('admin')}
                />
                <RoleButton 
                  icon={<Car className="w-6 h-6" />}
                  title={t.police}
                  description={lang === 'en' ? "Traffic violation registration and monitoring" : "የትራፊክ ጥፋቶች ምዝገባ እና ክትትል"}
                  onClick={() => setSelectedRole('police')}
                />
                <RoleButton 
                  icon={<UserIcon className="w-6 h-6" />}
                  title={t.driverRole}
                  description={lang === 'en' ? "View fines and make payments" : "ቅጣቶችን ማየት እና ክፍያ መፈፀም"}
                  onClick={() => setSelectedRole('driver')}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="auth-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8"
            >
              <button 
                onClick={() => { setSelectedRole(null); setError(null); setAuthMode('login'); }}
                className="mb-6 text-sm font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-700 transition-all"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                {lang === 'en' ? 'Back to roles' : 'ወደ ምርጫ ተመለስ'}
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-100 p-3 rounded-2xl">
                  {selectedRole === 'admin' && <Shield className="w-6 h-6 text-blue-600" />}
                  {selectedRole === 'police' && <Car className="w-6 h-6 text-blue-600" />}
                  {selectedRole === 'driver' && <UserIcon className="w-6 h-6 text-blue-600" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedRole === 'admin' ? t.admin : selectedRole === 'police' ? t.police : t.driverRole}
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{authMode === 'login' ? t.signIn : t.createAccount}</p>
                </div>
              </div>

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
                    <AlertCircle className="w-4 h-4 shrink-0" />
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
              
              {selectedRole === 'driver' && (
                <div className="mt-6 text-center">
                  <button 
                    onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(null); }}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    {authMode === 'login' ? t.noAccount : t.haveAccount}
                  </button>
                </div>
              )}

              {selectedRole !== 'driver' && authMode === 'login' && (
                <p className="mt-6 text-center text-xs text-slate-400 font-medium">
                  {lang === 'en' ? "Registration is managed by the system administrator." : "ምዝገባ የሚከናወነው በሲስተም አድሚኒስትሬተሩ ነው።"}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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

function RoleButton({ icon, title, description, onClick }: { icon: React.ReactNode, title: string, description: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-blue-50 hover:border-blue-200 transition-all group text-left"
    >
      <div className="bg-white p-3 rounded-xl shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-all" />
    </button>
  );
}
