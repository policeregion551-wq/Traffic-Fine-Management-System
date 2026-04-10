import React, { useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Shield, User, Phone, Car, FileText, Mail, MapPin, DollarSign } from 'lucide-react';

import { translations } from '../translations';

export default function FineRegistration({ userProfile, lang }: { userProfile: any, lang: 'en' | 'am' }) {
  const t = translations[lang];
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    driverName: '',
    phoneNumber: '',
    vehicleType: '',
    licenseNumber: '',
    licenseCategory: '',
    violationType: '',
    officerEmail: userProfile?.email || '',
    amount: '',
    region: '',
    zone: '',
    city: '',
    wereda: '',
    violationAddress: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const fineData = {
        ...formData,
        amount: parseFloat(formData.amount),
        status: 'pending',
        officerUid: userProfile?.uid,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'fines'), fineData);
      setSuccess(true);
      setFormData({
        driverName: '',
        phoneNumber: '',
        vehicleType: '',
        licenseNumber: '',
        licenseCategory: '',
        violationType: '',
        officerEmail: userProfile?.email || '',
        amount: '',
        region: '',
        zone: '',
        city: '',
        wereda: '',
        violationAddress: ''
      });
      setTimeout(() => setSuccess(false), 5000);
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
                label={t.phoneNumber} 
                icon={<Phone />} 
                value={formData.phoneNumber} 
                onChange={(v: string) => setFormData({...formData, phoneNumber: v})} 
                required 
              />
              <Input 
                label={lang === 'en' ? "License Number" : "የመንጃ ፈቃድ ቁጥር"} 
                icon={<FileText />} 
                value={formData.licenseNumber} 
                onChange={(v: string) => setFormData({...formData, licenseNumber: v})} 
                required 
              />
              <Input 
                label={lang === 'en' ? "License Category" : "የመንጃ ፈቃድ ደረጃ"} 
                icon={<Shield />} 
                value={formData.licenseCategory} 
                onChange={(v: string) => setFormData({...formData, licenseCategory: v})} 
              />
            </div>
          </section>

          {/* Vehicle & Violation */}
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Car className="w-5 h-5 text-blue-600" />
              {lang === 'en' ? 'Violation Details' : 'የጥፋቱ ዝርዝር'}
            </h2>
            
            <div className="space-y-4">
              <Input 
                label={lang === 'en' ? "Vehicle Type" : "የተሽከርካሪ አይነት"} 
                icon={<Car />} 
                value={formData.vehicleType} 
                onChange={(v: string) => setFormData({...formData, vehicleType: v})} 
              />
              <Input 
                label={t.violation} 
                icon={<AlertCircle />} 
                value={formData.violationType} 
                onChange={(v: string) => setFormData({...formData, violationType: v})} 
                required 
              />
              <Input 
                label={`${t.amount} (ETB)`} 
                icon={<DollarSign />} 
                type="number"
                value={formData.amount} 
                onChange={(v: string) => setFormData({...formData, amount: v})} 
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

          {/* Location Information */}
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4 md:col-span-2">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-blue-600" />
              {lang === 'en' ? 'Location Information' : 'የቦታ መረጃ'}
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Input label={lang === 'en' ? "Region" : "ክልል"} value={formData.region} onChange={(v: string) => setFormData({...formData, region: v})} />
              <Input label={lang === 'en' ? "Zone/City" : "ዞን/ከተማ"} value={formData.zone} onChange={(v: string) => setFormData({...formData, zone: v})} />
              <Input label={lang === 'en' ? "Wereda" : "ወረዳ"} value={formData.wereda} onChange={(v: string) => setFormData({...formData, wereda: v})} />
              <Input label={lang === 'en' ? "Specific Address" : "ልዩ ቦታ"} value={formData.violationAddress} onChange={(v: string) => setFormData({...formData, violationAddress: v})} />
            </div>
          </section>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 text-green-600 rounded-2xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-medium">{lang === 'en' ? 'Fine registered successfully!' : 'ቅጣቱ በተሳካ ሁኔታ ተመዝግቧል!'}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
        >
          {loading ? (lang === 'en' ? "Registering..." : "በመመዝገብ ላይ...") : t.issueFine}
        </button>
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
