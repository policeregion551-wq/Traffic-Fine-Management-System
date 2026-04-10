import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, getDocs, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { verifyReceipt } from '../lib/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Shield, 
  DollarSign, 
  FileText,
  Camera,
  Loader2,
  ChevronRight,
  History,
  AlertTriangle
} from 'lucide-react';

import { translations } from '../translations';

export default function FinePayment({ userProfile, lang }: { userProfile: any, lang: 'en' | 'am' }) {
  const t = translations[lang];
  const [fines, setFines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFine, setSelectedFine] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile) return;

    const finesRef = collection(db, 'fines');
    let q;
    
    if (userProfile.role === 'police' || userProfile.role === 'admin') {
      q = query(finesRef, orderBy('createdAt', 'desc'));
    } else {
      q = query(finesRef, where('phoneNumber', '==', userProfile.phoneNumber || ''));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const finesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFines(finesData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'fines');
    });

    return () => unsubscribe();
  }, [userProfile]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFine) return;

    setVerifying(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        
        // Use Gemini to verify the receipt with name matching
        const verificationResult = await verifyReceipt(base64String, selectedFine.amount, selectedFine.driverName);
        
        if (verificationResult && verificationResult.isAuthentic) {
          // 1. Check for duplicate transaction ID
          const transactionId = verificationResult.transactionId;
          const duplicateQuery = query(collection(db, 'fines'), where('receiptData.transactionId', '==', transactionId));
          const duplicateSnapshot = await getDocs(duplicateQuery);

          if (!duplicateSnapshot.empty) {
            const errorMsg = lang === 'en' ? "This receipt has already been used. Fraud attempt detected." : "ይህ ደረሰኝ ቀደም ብሎ ጥቅም ላይ ውሏል። የማጭበርበር ሙከራ ተገኝቷል።";
            setError(errorMsg);
            
            // Send notification to admin
            await addDoc(collection(db, 'notifications'), {
              type: 'fraud_attempt',
              fineId: selectedFine.id,
              driverName: selectedFine.driverName,
              transactionId: transactionId,
              message: `Driver ${selectedFine.driverName} attempted to reuse a receipt.`,
              createdAt: serverTimestamp(),
              severity: 'high'
            });

            setVerifying(false);
            return;
          }

          // 2. Check Name Matching and Amount
          if (!verificationResult.matchesExpectedAmount || !verificationResult.matchesExpectedName) {
            let mismatchMsg = lang === 'en' ? "Verification failed: " : "ማረጋገጥ አልተቻለም፡ ";
            if (!verificationResult.matchesExpectedAmount) mismatchMsg += lang === 'en' ? "Amount mismatch. " : "የገንዘብ መጠኑ አይመሳሰልም። ";
            if (!verificationResult.matchesExpectedName) mismatchMsg += lang === 'en' ? "Name on receipt does not match driver name. " : "በደረሰኙ ላይ ያለው ስም ከአሽከርካሪው ስም ጋር አይመሳሰልም። ";
            
            setError(mismatchMsg);
            setVerifying(false);
            return;
          }

          // 3. Success - Update fine status
          await updateDoc(doc(db, 'fines', selectedFine.id), {
            status: 'paid',
            receiptImageUrl: reader.result as string,
            receiptVerified: true,
            receiptData: verificationResult,
            paidAt: new Date().toISOString()
          });
          setUploadSuccess(true);
          setSelectedFine(null);
        } else {
          setError(lang === 'en' ? "Receipt verification failed. The image might be unclear or invalid." : "ደረሰኙን ማረጋገጥ አልተቻለም። ምስሉ ግልጽ ላይሆን ይችላል።");
        }
        setVerifying(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Verification error", err);
      setError(lang === 'en' ? "An error occurred during verification." : "በማረጋገጥ ሂደት ላይ ስህተት ተከስቷል።");
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {userProfile?.role === 'police' || userProfile?.role === 'admin' ? (lang === 'en' ? "Payment Tracking" : "የክፍያ ክትትል") : t.myFines}
          </h1>
          <p className="text-slate-500">{lang === 'en' ? 'View and settle outstanding traffic fines.' : 'ያልተከፈሉ የትራፊክ ቅጣቶችን ይመልከቱ እና ይክፈሉ።'}</p>
        </div>
        
        <div className="flex gap-2">
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {fines.filter(f => f.status === 'pending').length} {lang === 'en' ? 'Pending' : 'ያልተከፈለ'}
          </div>
          <div className="bg-green-50 text-green-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {fines.filter(f => f.status === 'paid').length} {lang === 'en' ? 'Paid' : 'የተከፈለ'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Fines List */}
        <div className="lg:col-span-2 space-y-4">
          {fines.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl text-center border border-dashed border-slate-200">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">{lang === 'en' ? 'No fines found.' : 'ምንም ቅጣት አልተገኘም።'}</p>
            </div>
          ) : (
            fines.map((fine) => (
              <motion.div
                layoutId={fine.id}
                key={fine.id}
                onClick={() => fine.status === 'pending' && setSelectedFine(fine)}
                className={`bg-white p-6 rounded-3xl border transition-all cursor-pointer group ${
                  selectedFine?.id === fine.id ? 'border-blue-500 ring-4 ring-blue-50' : 'border-slate-100 hover:border-blue-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      fine.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {fine.status === 'paid' ? <CheckCircle2 /> : <Clock />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{fine.violationType}</h3>
                      <p className="text-sm text-slate-500">{fine.driverName} • {fine.licenseNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">{fine.amount} ETB</p>
                    <p className={`text-xs font-bold uppercase tracking-wider ${
                      fine.status === 'paid' ? 'text-green-600' : 'text-amber-600'
                    }`}>
                      {fine.status === 'paid' ? (lang === 'en' ? 'Paid' : 'የተከፈለ') : (lang === 'en' ? 'Pending' : 'ያልተከፈለ')}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><History className="w-3 h-3" /> {new Date(fine.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {fine.officerEmail}</span>
                  </div>
                  {fine.status === 'pending' && (
                    <span className="text-blue-600 text-sm font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      {lang === 'en' ? 'Pay Now' : 'አሁን ይክፈሉ'} <ChevronRight className="w-4 h-4" />
                    </span>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Payment Panel */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedFine ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 sticky top-8"
              >
                <h2 className="text-xl font-bold text-slate-900 mb-6">{lang === 'en' ? 'Complete Payment' : 'ክፍያውን ያጠናቅቁ'}</h2>
                
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">{t.violation}</span>
                    <span className="font-semibold text-slate-900">{selectedFine.violationType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">{lang === 'en' ? 'Amount Due' : 'የሚከፈል መጠን'}</span>
                    <span className="font-bold text-blue-600 text-lg">{selectedFine.amount} ETB</span>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl mb-8">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">{lang === 'en' ? 'Payment Methods' : 'የክፍያ አማራጮች'}</p>
                  <div className="space-y-3">
                    <div className="p-4 bg-white rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">CBE</div>
                        <span className="text-sm font-bold">{lang === 'en' ? 'Commercial Bank of Ethiopia' : 'የኢትዮጵያ ንግድ ባንክ'}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-1">{lang === 'en' ? 'Account Number:' : 'የአካውንት ቁጥር፡'}</p>
                      <p className="text-lg font-mono font-bold text-blue-700 select-all">1000179910806</p>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 opacity-60">
                      <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">TB</div>
                      <span className="text-sm font-semibold">Telebirr ({lang === 'en' ? 'Coming Soon' : 'በቅርቡ'})</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-slate-600 text-center">{lang === 'en' ? 'Upload your payment receipt screenshot for instant verification.' : 'ለፈጣን ማረጋገጫ የክፍያ ደረሰኝዎን ፎቶ እዚህ ይጫኑ።'}</p>
                  
                  <label className="block">
                    <div className={`w-full border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                      verifying ? 'bg-slate-50 border-slate-200' : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                    }`}>
                      {verifying ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                          <p className="text-sm font-bold text-blue-600">{lang === 'en' ? 'AI Verifying Receipt...' : 'AI ደረሰኙን እያረጋገጠ ነው...'}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <Camera className="w-8 h-8 text-blue-600" />
                          <p className="text-sm font-bold text-slate-700">{lang === 'en' ? 'Upload Receipt' : 'ደረሰኝ ይጫኑ'}</p>
                          <p className="text-xs text-slate-400">JPG, PNG supported</p>
                        </div>
                      )}
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileUpload}
                      disabled={verifying}
                    />
                  </label>
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="bg-slate-100 p-8 rounded-3xl text-center border-2 border-dashed border-slate-200">
                <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">{lang === 'en' ? 'Select a pending fine to complete payment.' : 'ክፍያ ለመፈፀም ያልተከፈለ ቅጣት ይምረጡ።'}</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
