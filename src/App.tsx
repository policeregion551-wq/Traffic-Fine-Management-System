/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot, query, where, orderBy, getDocs } from 'firebase/firestore';
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
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import FineRegistration from './components/FineRegistration';
import FinePayment from './components/FinePayment';
import Dashboard from './components/Dashboard';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState<string | null>(null);

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
              name: user.displayName,
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

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed", err);
      setError("Login failed. Please try again.");
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
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center"
        >
          <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Traffic Fine System</h1>
          <p className="text-slate-600 mb-8">Securely manage traffic violations and payments in Ethiopia.</p>
          
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-200"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
            Sign in with Google
          </button>
          
          <p className="mt-8 text-xs text-slate-400">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
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
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Complete Your Profile</h2>
          <p className="text-slate-500 mb-6 text-sm">Please provide your details to continue using the system.</p>
          
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
              <input 
                name="name"
                defaultValue={user.displayName || ''}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
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
              Save & Continue
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 flex items-center gap-3 border-bottom border-slate-100">
          <Shield className="w-8 h-8 text-blue-600" />
          <span className="font-bold text-xl text-slate-900">FineSys</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem 
            icon={<BarChart3 />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          
          {userProfile?.role === 'police' && (
            <NavItem 
              icon={<Plus />} 
              label="Issue Fine" 
              active={activeTab === 'issue'} 
              onClick={() => setActiveTab('issue')} 
            />
          )}

          <NavItem 
            icon={<CreditCard />} 
            label={userProfile?.role === 'police' ? "Payment Status" : "My Fines"} 
            active={activeTab === 'payments'} 
            onClick={() => setActiveTab('payments')} 
          />

          <NavItem 
            icon={<History />} 
            label="History" 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
          />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user.displayName}</p>
              <p className="text-xs text-slate-500 capitalize">{userProfile?.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <h2 className="text-xl font-bold text-slate-900 capitalize">{activeTab}</h2>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search fines, plates..." 
                className="bg-slate-100 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Dashboard userProfile={userProfile} />
              </motion.div>
            )}
            {activeTab === 'issue' && userProfile?.role === 'police' && (
              <motion.div
                key="issue"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <FineRegistration userProfile={userProfile} />
              </motion.div>
            )}
            {activeTab === 'payments' && (
              <motion.div
                key="payments"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <FinePayment userProfile={userProfile} />
              </motion.div>
            )}
          </AnimatePresence>
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
