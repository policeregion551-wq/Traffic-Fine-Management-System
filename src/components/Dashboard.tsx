import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot, orderBy, limit, addDoc, setDoc, doc, getDocs, where } from 'firebase/firestore';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  Download, 
  Printer, 
  Calendar,
  ChevronRight,
  Shield,
  Car,
  Plus,
  Mail,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Fine {
  id: string;
  driverName: string;
  phoneNumber: string;
  licenseNumber: string;
  violationType: string;
  amount: number;
  status: string;
  createdAt: any;
  officerEmail: string;
}

export default function Dashboard({ userProfile }: { userProfile: any }) {
  const [fines, setFines] = useState<Fine[]>([]);
  const [stats, setStats] = useState({
    totalFines: 0,
    totalRevenue: 0,
    pendingCount: 0,
    paidCount: 0,
    recentViolations: [] as Fine[]
  });
  const [policeEmail, setPoliceEmail] = useState('');
  const [policeName, setPoliceName] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffSuccess, setStaffSuccess] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'fines'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const finesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Fine));
      setFines(finesData);
      
      const totalRevenue = finesData.reduce((acc, curr) => curr.status === 'paid' ? acc + curr.amount : acc, 0);
      const pendingCount = finesData.filter(f => f.status === 'pending').length;
      const paidCount = finesData.filter(f => f.status === 'paid').length;
      
      setStats({
        totalFines: finesData.length,
        totalRevenue,
        pendingCount,
        paidCount,
        recentViolations: finesData.slice(0, 5)
      });
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'fines');
    });

    // Listen for fraud notifications
    if (userProfile?.role === 'admin') {
      const nq = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(10));
      const nUnsubscribe = onSnapshot(nq, (snapshot) => {
        setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => {
        unsubscribe();
        nUnsubscribe();
      };
    }

    return () => unsubscribe();
  }, [userProfile]);

  const handleRegisterPolice = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffLoading(true);
    try {
      // Create a placeholder user document with the police role
      // When the user logs in with this email, they will get the role
      const q = query(collection(db, 'users'), where('email', '==', policeEmail));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        await setDoc(doc(db, 'users', userDoc.id), { role: 'police' }, { merge: true });
      } else {
        // Pre-register the email in a 'staff_invites' or just 'users' with a flag
        // For simplicity, we'll use a 'staff' collection or just check email on login in App.tsx
        // Let's use a 'staff' collection for pre-registration
        await addDoc(collection(db, 'staff'), {
          email: policeEmail,
          name: policeName,
          role: 'police',
          createdAt: new Date().toISOString()
        });
      }
      setStaffSuccess(true);
      setPoliceEmail('');
      setPoliceName('');
      setTimeout(() => setStaffSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setStaffLoading(false);
    }
  };

  const repeatOffenders = fines.reduce((acc: any, curr) => {
    const key = curr.licenseNumber;
    if (!acc[key]) {
      acc[key] = { name: curr.driverName, count: 0, totalAmount: 0, license: key };
    }
    acc[key].count += 1;
    acc[key].totalAmount += curr.amount;
    return acc;
  }, {});

  const topOffenders = Object.values(repeatOffenders)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Fines" 
          value={stats.totalFines.toString()} 
          icon={<AlertTriangle className="text-amber-600" />} 
          color="bg-amber-50" 
        />
        <StatCard 
          title="Total Revenue" 
          value={`${stats.totalRevenue.toLocaleString()} ETB`} 
          icon={<DollarSign className="text-green-600" />} 
          color="bg-green-50" 
        />
        <StatCard 
          title="Pending Fines" 
          value={stats.pendingCount.toString()} 
          icon={<TrendingUp className="text-blue-600" />} 
          color="bg-blue-50" 
        />
        <StatCard 
          title="Active Officers" 
          value="24" 
          icon={<Shield className="text-purple-600" />} 
          color="bg-purple-50" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Recent Violations</h2>
              <button className="text-blue-600 text-sm font-bold hover:underline">View All</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    <th className="pb-4">Driver</th>
                    <th className="pb-4">Violation</th>
                    <th className="pb-4">Amount</th>
                    <th className="pb-4">Status</th>
                    <th className="pb-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stats.recentViolations.map((fine) => (
                    <tr key={fine.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="py-4">
                        <p className="font-bold text-slate-900">{fine.driverName}</p>
                        <p className="text-xs text-slate-500">{fine.licenseNumber}</p>
                      </td>
                      <td className="py-4">
                        <span className="text-sm text-slate-600">{fine.violationType}</span>
                      </td>
                      <td className="py-4">
                        <span className="font-bold text-slate-900">{fine.amount} ETB</span>
                      </td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          fine.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {fine.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors inline" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reports Section */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">System Reports</h2>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><Printer className="w-5 h-5 text-slate-500" /></button>
                <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><Download className="w-5 h-5 text-slate-500" /></button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ReportAction title="Daily Report" description="Last 24 hours activity" />
              <ReportAction title="Weekly Report" description="Last 7 days performance" />
              <ReportAction title="Monthly Report" description="Full month summary" />
              <ReportAction title="Custom Range" description="Select specific dates" />
            </div>
          </div>

          {/* Staff Management (Admin Only) */}
          {userProfile?.role === 'admin' && (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Register Traffic Police
              </h2>
              <form onSubmit={handleRegisterPolice} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Officer Name</label>
                    <div className="relative">
                      <Users className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        value={policeName}
                        onChange={(e) => setPoliceName(e.target.value)}
                        required
                        placeholder="Full Name"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Officer Email</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="email"
                        value={policeEmail}
                        onChange={(e) => setPoliceEmail(e.target.value)}
                        required
                        placeholder="email@police.gov.et"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>
                <button 
                  disabled={staffLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {staffLoading ? "Registering..." : "Add Officer"}
                </button>
                {staffSuccess && (
                  <p className="text-xs text-green-600 font-bold flex items-center gap-1 justify-center">
                    <CheckCircle2 className="w-3 h-3" /> Officer registered successfully!
                  </p>
                )}
              </form>
            </div>
          )}
        </div>

        {/* Side Panels */}
        <div className="space-y-8">
          {/* Top Offenders */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Repeat Offenders
            </h2>
            <div className="space-y-4">
              {topOffenders.map((offender: any, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div>
                    <p className="font-bold text-slate-900">{offender.name}</p>
                    <p className="text-xs text-slate-500">{offender.license}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{offender.count} Fines</p>
                    <p className="text-xs text-slate-400">{offender.totalAmount} ETB</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fraud Alerts (Admin Only) */}
          {userProfile?.role === 'admin' && notifications.length > 0 && (
            <div className="bg-red-50 p-8 rounded-3xl shadow-sm border border-red-100">
              <h2 className="text-xl font-bold text-red-900 mb-6 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Fraud Alerts
              </h2>
              <div className="space-y-4">
                {notifications.map((n) => (
                  <div key={n.id} className="p-4 bg-white rounded-2xl border border-red-100 shadow-sm">
                    <p className="text-sm font-bold text-red-700 mb-1">{n.message}</p>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{n.driverName}</span>
                      <span>{new Date(n.createdAt?.seconds * 1000).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location Heatmap Placeholder */}
          <div className="bg-blue-600 p-8 rounded-3xl shadow-xl text-white">
            <h2 className="text-xl font-bold mb-4">Regional Insights</h2>
            <p className="text-blue-100 text-sm mb-6">Addis Ababa has the highest violation rate this week (42%).</p>
            <div className="space-y-3">
              <div className="h-2 bg-blue-500 rounded-full overflow-hidden">
                <div className="h-full bg-white w-[42%]"></div>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span>Addis Ababa</span>
                <span>42%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function ReportAction({ title, description }: any) {
  return (
    <button className="flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 rounded-2xl transition-all group border border-transparent hover:border-blue-100">
      <div className="text-left">
        <p className="font-bold text-slate-900 group-hover:text-blue-700">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <Download className="w-5 h-5 text-slate-300 group-hover:text-blue-500" />
    </button>
  );
}
