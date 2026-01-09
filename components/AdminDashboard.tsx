
import React, { useState, useEffect, useMemo } from 'react';
import { User, Customer } from '../types';
import { MONTHS } from '../constants';
import { db } from '../firebase';
import { 
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy 
} from 'firebase/firestore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

type Milestone = 'MESSAGE' | 'CALL' | 'GREET' | 'FOLLOWUP';

interface Alert {
  customerName: string;
  staffName: string;
  milestone: Milestone;
  daysLate: number;
  day: number;
  month: number;
}

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stats' | 'staff' | 'customers' | 'alerts'>('stats');
  const [staff, setStaff] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Load Data
  useEffect(() => {
    const qStaff = query(collection(db, 'staff'), orderBy('username'));
    const unsubscribeStaff = onSnapshot(qStaff, (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    });

    const qCustomers = query(collection(db, 'customers'), orderBy('month'), orderBy('day'));
    const unsubscribeCustomers = onSnapshot(qCustomers, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    });

    return () => {
      unsubscribeStaff();
      unsubscribeCustomers();
    };
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Compliance Alerts Logic
  const alerts = useMemo(() => {
    const list: Alert[] = [];
    customers.forEach(c => {
      const eventDate = new Date(today.getFullYear(), c.month, c.day);
      
      const checkMissed = (dueDays: number, isDone: boolean, m: Milestone) => {
        const targetDate = new Date(eventDate);
        targetDate.setDate(targetDate.getDate() + dueDays);
        if (!isDone && today > targetDate) {
          const diff = Math.floor((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
          list.push({
            customerName: c.name,
            staffName: c.assignedStaffName,
            milestone: m,
            daysLate: diff,
            day: c.day,
            month: c.month
          });
        }
      };

      checkMissed(-7, c.tracking.messaged, 'MESSAGE');
      checkMissed(-3, c.tracking.called, 'CALL');
      checkMissed(0, c.tracking.greeted, 'GREET');
      checkMissed(2, c.tracking.followedUp, 'FOLLOWUP');
    });
    return list;
  }, [customers, today]);

  // CRUD: Staff
  const handleAddStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    if (staff.find(s => s.username === username)) return alert("Username already exists");
    try {
      await addDoc(collection(db, 'staff'), { username, password, role: 'STAFF' });
      e.currentTarget.reset();
    } catch (err) {
      alert("Failed to save staff. Check Firebase connection.");
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingStaff) return;
    const formData = new FormData(e.currentTarget);
    try {
      await updateDoc(doc(db, 'staff', editingStaff.id), {
        username: formData.get('username') as string,
        password: formData.get('password') as string
      });
      setEditingStaff(null);
    } catch (err) {
      alert("Update failed.");
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (confirm("Permanently delete this staff member? This will leave their assigned customers unowned.")) {
      try {
        await deleteDoc(doc(db, 'staff', id));
      } catch (err) {
        alert("Delete failed.");
      }
    }
  };

  // CRUD: Customer
  const handleAddCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const staffId = formData.get('staffId') as string;
    const assignedStaff = staff.find(s => s.id === staffId);
    
    if (!staffId) return alert("Please assign a staff member.");

    try {
      await addDoc(collection(db, 'customers'), {
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        eventType: formData.get('eventType') as any,
        day: parseInt(formData.get('day') as string),
        month: parseInt(formData.get('month') as string),
        assignedStaffId: staffId,
        assignedStaffName: assignedStaff?.username || 'Unassigned',
        status: 'PENDING',
        tracking: { messaged: false, called: false, greeted: false, followedUp: false }
      });
      e.currentTarget.reset();
    } catch (err) {
      alert("Could not register customer data.");
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCustomer) return;
    const formData = new FormData(e.currentTarget);
    const staffId = formData.get('staffId') as string;
    const assignedStaff = staff.find(s => s.id === staffId);
    try {
      await updateDoc(doc(db, 'customers', editingCustomer.id), {
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        eventType: formData.get('eventType') as any,
        day: parseInt(formData.get('day') as string),
        month: parseInt(formData.get('month') as string),
        assignedStaffId: staffId,
        assignedStaffName: assignedStaff?.username || 'Unassigned'
      });
      setEditingCustomer(null);
    } catch (err) {
      alert("Update failed.");
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (confirm("Permanently delete this customer record?")) {
      try {
        await deleteDoc(doc(db, 'customers', id));
      } catch (err) {
        alert("Delete failed.");
      }
    }
  };

  const statsData = MONTHS.map((m, idx) => ({
    name: m.substring(0, 3),
    count: customers.filter(c => c.month === idx).length
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 mb-6">
        <TabBtn active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} label="Dashboard" />
        <TabBtn active={activeTab === 'staff'} onClick={() => setActiveTab('staff')} label="Staff Management" />
        <TabBtn active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} label="Compliance Tracking" />
        <TabBtn active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} label="Staff Alerts" badge={alerts.length} />
      </div>

      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <StatCard label="Total Records" val={customers.length} />
          <StatCard label="Active Staff" val={staff.length} color="text-indigo-600" />
          <StatCard label="Pending Tasks" val={alerts.length} color={alerts.length > 0 ? "text-red-500" : "text-green-500"} />
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-[400px]">
             <h3 className="text-lg font-bold mb-6 text-slate-400 uppercase tracking-widest text-[10px]">Monthly Distribution</h3>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={statsData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                 <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                 <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                 <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b bg-red-50/30">
            <h3 className="text-xl font-black text-red-900">Overdue Task Alerts</h3>
            <p className="text-red-600 font-medium text-sm">Action required from assigned staff members.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase">Staff</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase">Customer</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase">Date</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase text-center">Milestone</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {alerts.map((alert, i) => (
                  <tr key={i} className="hover:bg-red-50/20 transition-colors">
                    <td className="px-8 py-6 font-bold text-slate-900">{alert.staffName}</td>
                    <td className="px-8 py-6 text-slate-700">{alert.customerName}</td>
                    <td className="px-8 py-6">
                       <p className="text-sm font-bold text-indigo-600 uppercase">{alert.day} {MONTHS[alert.month]}</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="px-3 py-1 bg-red-100 text-red-700 text-[10px] font-black uppercase rounded-full">
                        {alert.milestone}
                      </span>
                    </td>
                    <td className="px-8 py-6 font-bold text-red-600 text-sm whitespace-nowrap">{alert.daysLate} Days Late</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-fit">
            <h3 className="text-xl font-bold mb-6">{editingStaff ? 'Edit Staff Member' : 'Create New Staff'}</h3>
            <form key={editingStaff?.id || 'new-staff'} onSubmit={editingStaff ? handleUpdateStaff : handleAddStaff} className="space-y-4">
              <Input name="username" def={editingStaff?.username} placeholder="Username" />
              <Input name="password" def={editingStaff?.password} placeholder="Password" />
              <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all">
                {editingStaff ? 'Update Member' : 'Create Staff Member'}
              </button>
              {editingStaff && (
                <button type="button" onClick={() => setEditingStaff(null)} className="w-full text-slate-400 font-bold py-2 mt-2">Cancel Edit</button>
              )}
            </form>
          </div>
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase">Username</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase">Password</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {staff.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6 font-bold text-slate-900">{s.username}</td>
                    <td className="px-8 py-6 font-mono text-sm text-slate-400">{s.password}</td>
                    <td className="px-8 py-6 text-right space-x-6">
                      <button onClick={() => setEditingStaff(s)} className="text-indigo-600 font-black text-xs uppercase hover:underline">Edit</button>
                      <button onClick={() => handleDeleteStaff(s.id)} className="text-red-500 font-black text-xs uppercase hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-fit">
            <h3 className="text-xl font-bold mb-6">{editingCustomer ? 'Edit Customer' : 'Add New Record'}</h3>
            <form key={editingCustomer?.id || 'new-cust'} onSubmit={editingCustomer ? handleUpdateCustomer : handleAddCustomer} className="space-y-4">
              <Input name="name" def={editingCustomer?.name} placeholder="Full Name" />
              <Input name="phone" def={editingCustomer?.phone} placeholder="Phone" />
              <select name="eventType" defaultValue={editingCustomer?.eventType || 'BIRTHDAY'} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium">
                <option value="BIRTHDAY">Birthday</option>
                <option value="ANNIVERSARY">Anniversary</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <Input name="day" def={editingCustomer?.day.toString()} placeholder="Day" type="number" />
                <select name="month" defaultValue={editingCustomer?.month || 0} className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none font-medium">
                  {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
              </div>
              <select required name="staffId" defaultValue={editingCustomer?.assignedStaffId || ''} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700">
                <option value="">-- Assign Staff --</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.username}</option>)}
              </select>
              <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all">
                {editingCustomer ? 'Save Changes' : 'Register Record'}
              </button>
              {editingCustomer && (
                <button type="button" onClick={() => setEditingCustomer(null)} className="w-full text-slate-400 font-bold py-2 mt-2">Cancel Edit</button>
              )}
            </form>
          </div>
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-slate-900 text-white p-5 rounded-[24px] flex flex-wrap gap-6 items-center justify-center text-[10px] font-black uppercase tracking-widest shadow-xl border-t-4 border-indigo-500">
              <span className="text-indigo-400">Action Status:</span>
              <div className="flex items-center gap-2"><div className="w-2 h-2 bg-indigo-500 rounded-full"></div> M: Message (7d)</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 bg-indigo-500 rounded-full"></div> C: Call (3d)</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 bg-indigo-500 rounded-full"></div> G: Greet (Day)</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 bg-indigo-500 rounded-full"></div> F: Follow (+2d)</div>
            </div>
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase">Customer</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase">Date</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase">Owner</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase text-center">Tracking</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {customers.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <p className="font-bold text-slate-900">{c.name}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase">{c.eventType} • {c.phone}</p>
                      </td>
                      <td className="px-8 py-6 text-sm font-black text-indigo-600">{c.day} {MONTHS[c.month]}</td>
                      <td className="px-8 py-6 text-xs font-bold text-slate-500">{c.assignedStaffName}</td>
                      <td className="px-8 py-6">
                        <div className="flex justify-center gap-2">
                          <Dot active={c.tracking.messaged} label="M" />
                          <Dot active={c.tracking.called} label="C" />
                          <Dot active={c.tracking.greeted} label="G" />
                          <Dot active={c.tracking.followedUp} label="F" />
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right whitespace-nowrap">
                        <button onClick={() => setEditingCustomer(c)} className="text-indigo-600 font-black text-[10px] uppercase hover:underline mr-4">Edit</button>
                        <button onClick={() => handleDeleteCustomer(c.id)} className="text-red-500 font-black text-[10px] uppercase hover:underline">Delete</button>
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
};

const TabBtn = ({ active, onClick, label, badge }: any) => (
  <button onClick={onClick} className={`px-8 py-3 rounded-full font-black text-[11px] uppercase tracking-widest transition-all flex items-center gap-3 ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'}`}>
    {label}
    {badge > 0 && <span className="bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse">{badge}</span>}
  </button>
);
const StatCard = ({ label, val, color = "text-slate-900" }: any) => (
  <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p><p className={`text-4xl font-black mt-3 ${color}`}>{val}</p></div>
);
const Input = ({ name, placeholder, def, type = "text" }: any) => (
  <input required name={name} defaultValue={def} type={type} placeholder={placeholder} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium placeholder:text-slate-300" />
);
const Dot = ({ active, label }: any) => (
  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-300 border border-slate-200 opacity-40'}`}>{label}</div>
);

export default AdminDashboard;
