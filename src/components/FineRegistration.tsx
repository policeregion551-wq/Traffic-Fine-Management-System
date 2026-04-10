import React, { useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Shield, User, Phone, Car, FileText, Mail, MapPin, DollarSign, Clock } from 'lucide-react';

import { translations } from '../translations';

export default function FineRegistration({ userProfile, lang }: { userProfile: any, lang: 'en' | 'am' }) {
  const t = translations[lang];
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    driverName: '',
    driverEmail: '',
    phoneNumber: '',
    vehicleType: '',
    plateNumber: '',
    licenseNumber: '',
    violationType: '',
    violationLocation: '',
    violationDate: new Date().toISOString().split('T')[0],
    paymentDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dailyPenaltyRate: '10',
    amount: '',
    officerEmail: userProfile?.email || ''
  });

  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const generateRecordCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const sendEmailNotification = async (email: string, code: string, amount: number) => {
    // In a real production app, this would call a backend API (e.g., /api/send-email)
    // which uses a service like SendGrid, Mailgun, or AWS SES.
    console.log(`[EMAIL SIMULATION] Sending record code ${code} to ${email} for amount ${amount} ETB`);
    
    // We simulate the API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGeneratedCode(null);

    try {
      // Check for existing unpaid fines
      const finesRef = collection(db, 'fines');
      const q = query(finesRef, where('driverEmail', '==', formData.driverEmail));
      const snapshot = await getDocs(q);
      const unpaidFines = snapshot.docs.filter(doc => doc.data().status === 'pending');
      const unpaidCount = unpaidFines.length;

      if (unpaidCount >= 2) {
        setError(lang === 'en' 
          ? "Driver has 2 unpaid fines. System blocked. Take other action." 
          : "አሽከርካሪው 2 ያልተከፈሉ ቅጣቶች አሉት። ሲስተሙ ተዘግቷል። ሌላ እርምጃ ይውሰዱ።");
        setLoading(false);
        return;
      }

      const recordCode = generateRecordCode();
      const fineData = {
        ...formData,
        amount: parseFloat(formData.amount),
        dailyPenaltyRate: parseFloat(formData.dailyPenaltyRate),
        status: 'pending',
        recordCode,
        officerUid: userProfile?.uid,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'fines'), fineData);
      
      // Send email notification (simulated)
      await sendEmailNotification(formData.driverEmail, recordCode, parseFloat(formData.amount));

      setGeneratedCode(recordCode);
      setSuccess(true);
      setFormData({
        driverName: '',
        driverEmail: '',
        phoneNumber: '',
        vehicleType: '',
        plateNumber: '',
        licenseNumber: '',
        violationType: '',
        violationLocation: '',
        violationDate: new Date().toISOString().split('T')[0],
        paymentDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dailyPenaltyRate: '10',
        amount: '',
        officerEmail: userProfile?.email || ''
      });
      // Don't auto-hide success if we want to show the code
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'fines');
      setError(lang === 'en' ? "Failed to register fine." : "ቅጣቱን መመዝገብ አልተቻለም።");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">{t.issueFine}</h1>
        <p className="text-slate-500">{lang === 'en' ? 'Register a traffic violation and notify the driver.' : 'የትራፊክ ጥፋቶችን ይመዝግቡ እና ለአሽከርካሪው ያሳውቁ።'}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Driver Information */}
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-blue-600" />
              {lang === 'en' ? 'Driver Details' : 'የአሽከርካሪው ዝርዝር'}
            </h2>
            
            <div className="space-y-4">
              <Input 
                label={t.fullName} 
                icon={<User />} 
                value={formData.driverName} 
                onChange={(v: string) => setFormData({...formData, driverName: v})} 
                required 
              />
              <Input 
                label={t.emailAddress} 
                icon={<Mail />} 
                type="email"
                value={formData.driverEmail} 
                onChange={(v: string) => setFormData({...formData, driverEmail: v})} 
                required 
              />
              <Input 
                label={t.phoneNumber} 
                icon={<Phone />} 
                value={formData.phoneNumber} 
                onChange={(v: string) => setFormData({...formData, phoneNumber: v})} 
                required 
              />
              <Input 
                label={t.licenseNumber} 
                icon={<FileText />} 
                value={formData.licenseNumber} 
                onChange={(v: string) => setFormData({...formData, licenseNumber: v})} 
                required 
              />
            </div>
          </section>

          {/* Violation Details */}
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              {lang === 'en' ? 'Violation Details' : 'የጥፋቱ ዝርዝር'}
            </h2>
            
            <div className="space-y-4">
              <Input 
                label={t.violationType} 
                icon={<AlertCircle />} 
                value={formData.violationType} 
                onChange={(v: string) => setFormData({...formData, violationType: v})} 
                required 
              />
              <Input 
                label={t.violationLocation} 
                icon={<MapPin />} 
                value={formData.violationLocation} 
                onChange={(v: string) => setFormData({...formData, violationLocation: v})} 
                required 
              />
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label={t.violationDate} 
                  type="date"
                  value={formData.violationDate} 
                  onChange={(v: string) => setFormData({...formData, violationDate: v})} 
                  required 
                />
                <Input 
                  label={t.paymentDeadline} 
                  type="date"
                  value={formData.paymentDeadline} 
                  onChange={(v: string) => setFormData({...formData, paymentDeadline: v})} 
                  required 
                />
              </div>
            </div>
          </section>

          {/* Vehicle & Amount */}
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4 md:col-span-2">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-blue-600" />
              {lang === 'en' ? 'Vehicle & Penalty' : 'ተሽከርካሪ እና ቅጣት'}
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input 
                label={t.vehicleType} 
                icon={<Car />} 
                value={formData.vehicleType} 
                onChange={(v: string) => setFormData({...formData, vehicleType: v})} 
              />
              <Input 
                label={t.plateNumber} 
                icon={<FileText />} 
                value={formData.plateNumber} 
                onChange={(v: string) => setFormData({...formData, plateNumber: v})} 
                required 
              />
              <Input 
                label={t.fineAmount} 
                icon={<DollarSign />} 
                type="number"
                value={formData.amount} 
                onChange={(v: string) => setFormData({...formData, amount: v})} 
                required 
              />
              <Input 
                label={t.dailyPenalty} 
                icon={<Clock />} 
                type="number"
                value={formData.dailyPenaltyRate} 
                onChange={(v: string) => setFormData({...formData, dailyPenaltyRate: v})} 
                required 
              />
              <Input 
                label={t.officerEmail} 
                icon={<Mail />} 
                value={formData.officerEmail} 
                onChange={(v: string) => setFormData({...formData, officerEmail: v})} 
                required 
              />
            </div>
          </section>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {success && generatedCode && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 bg-green-50 text-green-800 rounded-3xl border border-green-100 text-center space-y-4"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">{lang === 'en' ? 'Fine Registered Successfully!' : 'ቅጣቱ በተሳካ ሁኔታ ተመዝግቧል!'}</h3>
              <p className="text-sm text-green-700">{t.codeSent}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-green-200 inline-block">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t.recordCode}</p>
              <p className="text-4xl font-mono font-black text-green-600 tracking-widest">{generatedCode}</p>
            </div>
            <button 
              onClick={() => { setSuccess(false); setGeneratedCode(null); }}
              className="block mx-auto text-sm font-bold text-green-600 hover:underline"
            >
              {lang === 'en' ? 'Register Another Fine' : 'ሌላ ቅጣት መዝግብ'}
            </button>
          </motion.div>
        )}

        {!success && (
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
          >
            {loading ? (lang === 'en' ? "Registering..." : "በመመዝገብ ላይ...") : t.issueFine}
          </button>
        )}
      </form>
    </div>
  );
}

function Input({ label, icon, value, onChange, type = "text", required = false }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-700 ml-1">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-slate-50 border-slate-200 rounded-2xl py-3 ${icon ? 'pl-12' : 'px-4'} pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none`}
        />
      </div>
    </div>
  );
}
