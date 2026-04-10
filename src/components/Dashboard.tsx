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
  PieChart as PieChartIcon,
  ShieldCheck,
  UserCircle,
  Phone,
  MapPin,
  Search,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Clock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { translations } from '../translations';

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
  paidAt?: string;
}

export default function Dashboard({ userProfile, lang }: { userProfile: any, lang: 'en' | 'am' }) {
  const t = translations[lang];
  const [fines, setFines] = useState<Fine[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'users'>('stats');
  const [searchQuery, setSearchQuery] = useState('');
  const [policeEmail, setPoliceEmail] = useState('');
  const [policeName, setPoliceName] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffSuccess, setStaffSuccess] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const finesRef = collection(db, 'fines');
    const unsubscribeFines = onSnapshot(query(finesRef, orderBy('createdAt', 'desc')), (snapshot) => {
      setFines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Fine)));
      setLoading(false);
    });

    let unsubscribeUsers = () => {};
    if (userProfile?.role === 'admin') {
      const usersRef = collection(db, 'users');
      unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const nq = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(10));
      const nUnsubscribe = onSnapshot(nq, (snapshot) => {
        setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      
      const oldUnUsers = unsubscribeUsers;
      unsubscribeUsers = () => {
        oldUnUsers();
        nUnsubscribe();
      };
    }

    return () => {
      unsubscribeFines();
      unsubscribeUsers();
    };
  }, [userProfile]);

  const stats = {
    total: fines.length,
    revenue: fines.filter(f => f.status === 'paid').reduce((acc, curr) => acc + (curr.amount || 0), 0),
    pending: fines.filter(f => f.status === 'pending').length,
    officers: new Set(fines.map(f => f.officerEmail)).size,
    totalUsers: allUsers.length,
    totalPolice: allUsers.filter(u => u.role === 'police').length,
    totalDrivers: allUsers.filter(u => u.role === 'driver').length,
  };

  // Chart Data Processing
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const revenueData = last7Days.map(date => ({
    date: new Date(date).toLocaleDateString(lang === 'en' ? 'en-US' : 'am-ET', { weekday: 'short' }),
    amount: fines
      .filter(f => f.status === 'paid' && f.paidAt?.startsWith(date))
      .reduce((acc, curr) => acc + curr.amount, 0)
  }));

  const violationData = Object.entries(
    fines.reduce((acc: any, curr) => {
      const type = curr.violationType || 'Other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const statusData = [
    { name: lang === 'en' ? 'Paid' : 'የተከፈለ', value: fines.filter(f => f.status === 'paid').length, color: '#10b981' },
    { name: lang === 'en' ? 'Pending' : 'ያልተከፈለ', value: fines.filter(f => f.status === 'pending').length, color: '#f59e0b' }
  ];

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4'];

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

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const filteredUsers = allUsers.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.phoneNumber?.includes(searchQuery)
  );

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
      {/* Header with Tabs for Admin */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t.dashboard}</h1>
          <p className="text-slate-500 text-sm mt-1">{lang === 'en' ? 'Real-time overview of traffic operations' : 'የትራፊክ ስራዎች የቀጥታ ክትትል'}</p>
        </div>
        
        {userProfile?.role === 'admin' && (
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button 
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'stats' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Activity className="w-4 h-4" />
              {lang === 'en' ? 'Statistics' : 'ስታቲስቲክስ'}
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Users className="w-4 h-4" />
              {t.userManagement}
            </button>
          </div>
        )}
      </div>

      {activeTab === 'stats' ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title={t.totalFines} 
              value={stats.total} 
              icon={<FileText className="w-6 h-6" />} 
              color="blue"
              trend="+12%"
              trendUp={true}
            />
            <StatCard 
              title={t.totalRevenue} 
              value={`${stats.revenue.toLocaleString()} ETB`} 
              icon={<DollarSign className="w-6 h-6" />} 
              color="green"
              trend="+8.4%"
              trendUp={true}
            />
            <StatCard 
              title={t.pendingFines} 
              value={stats.pending} 
              icon={<Clock className="w-6 h-6" />} 
              color="amber"
              trend="-2.1%"
              trendUp={false}
            />
            <StatCard 
              title={t.activeOfficers} 
              value={stats.officers} 
              icon={<Shield className="w-6 h-6" />} 
              color="purple"
              trend="+4"
              trendUp={true}
            />
          </div>

          {/* Visual Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                {t.revenueTrend}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-purple-600" />
                {t.violationDistribution}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={violationData}
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
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                {t.paymentStatusChart}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Violations Table */}
            <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">{t.recentViolations}</h3>
                <button className="text-blue-600 text-sm font-bold hover:underline">{t.viewAll}</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t.driver}</th>
                      <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t.violation}</th>
                      <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t.amount}</th>
                      <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t.status}</th>
                      <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {fines.slice(0, 5).map((fine) => (
                      <tr key={fine.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                              {fine.driverName?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{fine.driverName}</p>
                              <p className="text-xs text-slate-500">{fine.licenseNumber}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-sm font-medium text-slate-700">{fine.violationType}</p>
                          <p className="text-xs text-slate-400">{new Date(fine.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                        </td>
                        <td className="px-8 py-5">
                          <p className="font-bold text-slate-900">{fine.amount} ETB</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            fine.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {fine.status === 'paid' ? (lang === 'en' ? 'Paid' : 'የተከፈለ') : (lang === 'en' ? 'Pending' : 'ያልተከፈለ')}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button className="p-2 hover:bg-white rounded-xl transition-colors opacity-0 group-hover:opacity-100">
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Side Panels */}
            <div className="space-y-8">
              {/* Reports Section */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-900">{t.systemReports}</h2>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><Printer className="w-5 h-5 text-slate-500" /></button>
                    <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><Download className="w-5 h-5 text-slate-500" /></button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <ReportAction title={t.dailyReport} description="Last 24 hours activity" />
                  <ReportAction title={t.weeklyReport} description="Last 7 days performance" />
                  <ReportAction title={t.monthlyReport} description="Full month summary" />
                </div>
              </div>

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
            </div>
          </div>
        </>
      ) : (
        /* User Management Section */
        <div className="space-y-6">
          {/* User Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard title={t.totalUsers} value={stats.totalUsers} icon={<Users className="w-6 h-6" />} color="blue" />
            <StatCard title={t.totalPolice} value={stats.totalPolice} icon={<ShieldCheck className="w-6 h-6" />} color="purple" />
            <StatCard title={t.totalDrivers} value={stats.totalDrivers} icon={<UserCircle className="w-6 h-6" />} color="green" />
          </div>

          {/* Register Police Form */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              {t.registerPolice}
            </h2>
            <form onSubmit={handleRegisterPolice} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">{t.officerName}</label>
                  <div className="relative">
                    <UserCircle className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
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

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-xl font-bold text-slate-900">{t.userList}</h3>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 pl-11 pr-4 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{lang === 'en' ? 'User' : 'ተጠቃሚ'}</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t.role}</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t.phoneNumber}</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t.address}</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                            user.role === 'admin' ? 'bg-red-50 text-red-600' : 
                            user.role === 'police' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                          }`}>
                            {user.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{user.name}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                          user.role === 'admin' ? 'bg-red-100 text-red-700' : 
                          user.role === 'police' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm text-slate-700 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" /> {user.phoneNumber || '-'}
                        </p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm text-slate-700 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" /> {user.address || '-'}
                        </p>
                      </td>
                      <td className="px-8 py-5">
                        <button className="p-2 hover:bg-white rounded-xl transition-colors text-blue-600 font-bold text-sm flex items-center gap-1">
                          {t.details} <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color, trend, trendUp }: any) {
  const colorClasses: any = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
    red: "bg-red-50 text-red-600"
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between group cursor-pointer"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-4 rounded-2xl transition-all group-hover:scale-110 ${colorClasses[color]}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${trendUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
        <h4 className="text-2xl font-black text-slate-900">{value}</h4>
      </div>
    </motion.div>
  );
}

function ReportAction({ title, description }: any) {
  return (
    <button className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-blue-50 rounded-2xl transition-all group border border-transparent hover:border-blue-100">
      <div className="text-left">
        <p className="font-bold text-slate-900 group-hover:text-blue-700">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <Download className="w-5 h-5 text-slate-300 group-hover:text-blue-500" />
    </button>
  );
}
