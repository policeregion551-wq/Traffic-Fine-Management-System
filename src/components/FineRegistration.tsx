import React, { useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Shield, User, Phone, Car, FileText, Mail, MapPin, DollarSign } from 'lucide-react';

export default function FineRegistration({ userProfile }: { userProfile: any }) {
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
      setError("Failed to register fine. Please check your permissions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Issue New Fine</h1>
        <p className="text-slate-500">Register a traffic violation and notify the driver.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Driver Information */}
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-blue-600" />
              Driver Details
            </h2>
            
            <div className="space-y-4">
              <Input 
                label="Driver Name" 
                icon={<User />} 
                value={formData.driverName} 
                onChange={(v) => setFormData({...formData, driverName: v})} 
                required 
              />
              <Input 
                label="Phone Number" 
                icon={<Phone />} 
                value={formData.phoneNumber} 
                onChange={(v) => setFormData({...formData, phoneNumber: v})} 
                required 
              />
              <Input 
                label="License Number" 
                icon={<FileText />} 
                value={formData.licenseNumber} 
                onChange={(v) => setFormData({...formData, licenseNumber: v})} 
                required 
              />
              <Input 
                label="License Category/Grade" 
                icon={<Shield />} 
                value={formData.licenseCategory} 
                onChange={(v) => setFormData({...formData, licenseCategory: v})} 
              />
            </div>
          </section>

          {/* Vehicle & Violation */}
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Car className="w-5 h-5 text-blue-600" />
              Violation Details
            </h2>
            
            <div className="space-y-4">
              <Input 
                label="Vehicle Type" 
                icon={<Car />} 
                value={formData.vehicleType} 
                onChange={(v) => setFormData({...formData, vehicleType: v})} 
              />
              <Input 
                label="Violation Type" 
                icon={<AlertCircle />} 
                value={formData.violationType} 
                onChange={(v) => setFormData({...formData, violationType: v})} 
                required 
              />
              <Input 
                label="Fine Amount (ETB)" 
                icon={<DollarSign />} 
                type="number"
                value={formData.amount} 
                onChange={(v) => setFormData({...formData, amount: v})} 
                required 
              />
              <Input 
                label="Officer Email" 
                icon={<Mail />} 
                value={formData.officerEmail} 
                onChange={(v) => setFormData({...formData, officerEmail: v})} 
                required 
              />
            </div>
          </section>

          {/* Location Information */}
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4 md:col-span-2">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-blue-600" />
              Location Information
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Input label="Region" value={formData.region} onChange={(v) => setFormData({...formData, region: v})} />
              <Input label="Zone/City" value={formData.zone} onChange={(v) => setFormData({...formData, zone: v})} />
              <Input label="Wereda" value={formData.wereda} onChange={(v) => setFormData({...formData, wereda: v})} />
              <Input label="Specific Address" value={formData.violationAddress} onChange={(v) => setFormData({...formData, violationAddress: v})} />
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
            <p className="font-medium">Fine registered successfully!</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
        >
          {loading ? "Registering..." : "Register Fine"}
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
