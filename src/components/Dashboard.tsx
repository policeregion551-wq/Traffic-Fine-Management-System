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
  AlertCircle,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';

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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

import { translations } from '../translations';

export default function Dashboard({ userProfile, lang }: { userProfile: any, lang: 'en' | 'am' }) {
  const [fines, setFines] = useState<Fine[]>([]);
  const t = translations[lang];
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

  // Chart Data
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [violationData, setViolationData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);

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

      // Process Chart Data
      const violationCounts: any = {};
      finesData.forEach(f => {
        violationCounts[f.violationType] = (violationCounts[f.violationType] || 0) + 1;
      });
      setViolationData(Object.keys(violationCounts).map(name => ({ name, value: violationCounts[name] })));

      const dailyRevenue: any = {};
      finesData.filter(f => f.status === 'paid').forEach(f => {
        const date = new Date(f.createdAt).toLocaleDateString();
        dailyRevenue[date] = (dailyRevenue[date] || 0) + f.amount;
      });
      setRevenueData(Object.keys(dailyRevenue).map(date => ({ date, revenue: dailyRevenue[date] })).slice(-7));

      setStatusData([
        { name: lang === 'en' ? 'Paid' : 'የተከፈለ', value: paidCount },
        { name: lang === 'en' ? 'Pending' : 'ያልተከፈለ', value: pendingCount }
      ]);

    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'fines');
    });

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
  }, [userProfile, lang]);

  const handleRegisterPolice = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffLoading(true);
    try {
      const q = query(collection(db, 'users'), where('email', '==', policeEmail));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        await setDoc(doc(db, 'users', userDoc.id), { role: 'police' }, { merge: true });
      } else {
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
    <div className="space-y-8 pb-12">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={t.totalFines} 
          value={stats.totalFines.toString()} 
          icon={<AlertTriangle className="text-amber-600" />} 
          color="bg-amber-50" 
        />
        <StatCard 
          title={t.totalRevenue} 
          value={`${stats.totalRevenue.toLocaleString()} ETB`} 
          icon={<DollarSign className="text-green-600" />} 
          color="bg-green-50" 
        />
        <StatCard 
          title={t.pendingFines} 
          value={stats.pendingCount.toString()} 
          icon={<TrendingUp className="text-blue-600" />} 
          color="bg-blue-50" 
        />
        <StatCard 
          title={t.activeOfficers} 
          value="24" 
          icon={<Shield className="text-purple-600" />} 
          color="bg-purple-50" 
        />
      </div>

      {/* Visual Analytics Section */}
      {(userProfile?.role === 'admin' || userProfile?.role === 'police') && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              {t.revenueTrend}
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-purple-600" />
              {t.violationDistribution}
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={violationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {violationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              {t.paymentStatusChart}
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">{t.recentViolations}</h2>
              <button className="text-blue-600 text-sm font-bold hover:underline">{t.viewAll}</button>
            </div>
            
            <div className="overflow-x-auto -mx-8 px-8">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    <th className="pb-4">{t.driver}</th>
                    <th className="pb-4">{t.violation}</th>
                    <th className="pb-4">{t.amount}</th>
                    <th className="pb-4">{t.status}</th>
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
              <h2 className="text-xl font-bold text-slate-900">{t.systemReports}</h2>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><Printer className="w-5 h-5 text-slate-500" /></button>
                <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><Download className="w-5 h-5 text-slate-500" /></button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ReportAction title={t.dailyReport} description="Last 24 hours activity" />
              <ReportAction title={t.weeklyReport} description="Last 7 days performance" />
              <ReportAction title={t.monthlyReport} description="Full month summary" />
              <ReportAction title={t.customRange} description="Select specific dates" />
            </div>
          </div>

          {/* Staff Management (Admin Only) */}
          {userProfile?.role === 'admin' && (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                {t.registerPolice}
              </h2>
              <form onSubmit={handleRegisterPolice} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">{t.officerName}</label>
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
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">{t.officerEmail}</label>
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
                  {staffLoading ? "Registering..." : t.addOfficer}
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
              {t.repeatOffenders}
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
                {t.fraudAlerts}
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
            <h2 className="text-xl font-bold mb-4">{t.regionalInsights}</h2>
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
