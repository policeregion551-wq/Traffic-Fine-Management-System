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

export default function FinePayment({ userProfile }: { userProfile: any }) {
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
            const errorMsg = "This receipt has already been used. Fraud attempt detected.";
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
            let mismatchMsg = "Verification failed: ";
            if (!verificationResult.matchesExpectedAmount) mismatchMsg += "Amount mismatch. ";
            if (!verificationResult.matchesExpectedName) mismatchMsg += "Name on receipt does not match driver name. ";
            
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
          setError("Receipt verification failed. The image might be unclear or invalid.");
        }
        setVerifying(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Verification error", err);
      setError("An error occurred during verification.");
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
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {userProfile?.role === 'police' ? "Payment Tracking" : "My Fines & Payments"}
          </h1>
          <p className="text-slate-500">View and settle outstanding traffic fines.</p>
        </div>
        
        <div className="flex gap-2">
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {fines.filter(f => f.status === 'pending').length} Pending
          </div>
          <div className="bg-green-50 text-green-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {fines.filter(f => f.status === 'paid').length} Paid
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Fines List */}
        <div className="lg:col-span-2 space-y-4">
          {fines.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl text-center border border-dashed border-slate-200">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No fines found.</p>
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
                      {fine.status}
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
                      Pay Now <ChevronRight className="w-4 h-4" />
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
                <h2 className="text-xl font-bold text-slate-900 mb-6">Complete Payment</h2>
                
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Violation</span>
                    <span className="font-semibold text-slate-900">{selectedFine.violationType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Amount Due</span>
                    <span className="font-bold text-blue-600 text-lg">{selectedFine.amount} ETB</span>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl mb-8">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">Payment Methods</p>
                  <div className="space-y-3">
                    <div className="p-4 bg-white rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">CBE</div>
                        <span className="text-sm font-bold">Commercial Bank of Ethiopia</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-1">Account Number:</p>
                      <p className="text-lg font-mono font-bold text-blue-700 select-all">1000179910806</p>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 opacity-60">
                      <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">TB</div>
                      <span className="text-sm font-semibold">Telebirr (Coming Soon)</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-slate-600 text-center">Upload your payment receipt screenshot for instant verification.</p>
                  
                  <label className="block">
                    <div className={`w-full border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                      verifying ? 'bg-slate-50 border-slate-200' : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                    }`}>
                      {verifying ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                          <p className="text-sm font-bold text-blue-600">AI Verifying Receipt...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <Camera className="w-8 h-8 text-blue-600" />
                          <p className="text-sm font-bold text-slate-700">Upload Receipt</p>
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
                <p className="text-slate-500 font-medium">Select a pending fine to complete payment.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
