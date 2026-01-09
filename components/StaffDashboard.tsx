
import React, { useState, useEffect, useMemo } from 'react';
import { User, Customer } from '../types';
import { MONTHS } from '../constants';
import { db } from '../firebase';
import { collection, onSnapshot, updateDoc, doc, query, where } from 'firebase/firestore';
import { generateWish } from '../services/geminiService';

interface StaffDashboardProps {
  currentUser: User;
}

type Milestone = 'MESSAGE' | 'CALL' | 'GREET' | 'FOLLOWUP';

interface Task {
  customer: Customer;
  milestone: Milestone;
  isOverdue: boolean;
}

const StaffDashboard: React.FC<StaffDashboardProps> = ({ currentUser }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [wishModal, setWishModal] = useState<{ isOpen: boolean; content: string; customer: Customer | null; milestone: Milestone | null }>({
    isOpen: false,
    content: '',
    customer: null,
    milestone: null
  });
  const [loadingWish, setLoadingWish] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [confirmFeedback, setConfirmFeedback] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'customers'), where('assignedStaffId', '==', currentUser.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    });
    return () => unsubscribe();
  }, [currentUser.id]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pendingTasks = useMemo(() => {
    const tasks: Task[] = [];
    customers.forEach(c => {
      const eventDate = new Date(today.getFullYear(), c.month, c.day);
      
      const checkTask = (dueDays: number, isDone: boolean, m: Milestone) => {
        const targetDate = new Date(eventDate);
        targetDate.setDate(targetDate.getDate() + dueDays);
        
        if (!isDone && today >= targetDate) {
          tasks.push({
            customer: c,
            milestone: m,
            isOverdue: today > targetDate
          });
        }
      };

      checkTask(-7, c.tracking.messaged, 'MESSAGE');
      checkTask(-3, c.tracking.called, 'CALL');
      checkTask(0, c.tracking.greeted, 'GREET');
      checkTask(2, c.tracking.followedUp, 'FOLLOWUP');
    });
    return tasks;
  }, [customers, today]);

  const closeModal = () => {
    setWishModal({ isOpen: false, content: '', customer: null, milestone: null });
    setConfirmFeedback(false);
    setCopyFeedback(false);
  };

  const handleAction = async (customer: Customer, milestone: Milestone) => {
    if (milestone === 'MESSAGE' || milestone === 'GREET') {
      setLoadingWish(true);
      setWishModal({ 
        isOpen: true, 
        content: 'Crafting the perfect message...', 
        customer, 
        milestone 
      });
      try {
        const wish = await generateWish(customer);
        setWishModal(prev => ({ ...prev, content: wish }));
      } catch (error) {
        setWishModal(prev => ({ ...prev, content: "Happy Celebration from VPP Jewellers! Wishing you a wonderful day filled with joy." }));
      }
      setLoadingWish(false);
    } else {
      markMilestoneComplete(customer.id, milestone);
    }
  };

  const markMilestoneComplete = async (customerId: string, milestone: Milestone) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    setConfirmFeedback(true);
    const newTracking = { ...customer.tracking };
    if (milestone === 'MESSAGE') newTracking.messaged = true;
    if (milestone === 'CALL') newTracking.called = true;
    if (milestone === 'GREET') newTracking.greeted = true;
    if (milestone === 'FOLLOWUP') newTracking.followedUp = true;

    try {
      const customerRef = doc(db, 'customers', customerId);
      await updateDoc(customerRef, { tracking: newTracking });
      
      setTimeout(() => {
        closeModal();
      }, 700);
    } catch (error) {
      alert("Error updating status. Please check your internet connection.");
      setConfirmFeedback(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[40px] p-10 text-white shadow-2xl overflow-hidden relative">
        <div className="relative z-10">
          <h2 className="text-4xl font-black">Hello, {currentUser.username}!</h2>
          <p className="mt-3 text-indigo-100 text-lg opacity-90">
            {pendingTasks.length > 0 ? `Attention: You have ${pendingTasks.length} priority tasks.` : "All caught up with your customers!"}
          </p>
        </div>
      </div>

      <section>
        <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full animate-ping ${pendingTasks.some(t => t.isOverdue) ? 'bg-red-500' : 'bg-indigo-500'}`}></span>
          Priority Queue
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingTasks.map((task) => (
            <div key={`${task.customer.id}-${task.milestone}`} className={`bg-white p-8 rounded-[32px] shadow-sm border ${task.isOverdue ? 'border-red-200 bg-red-50/30' : 'border-slate-100'} hover:shadow-xl transition-all group`}>
              <div className="flex justify-between items-start mb-4">
                 <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${task.isOverdue ? 'bg-red-100 text-red-700' : 'bg-indigo-50 text-indigo-600'}`}>
                   {getMilestoneLabel(task.milestone)}
                 </span>
                 <p className="text-[10px] font-black text-indigo-600 uppercase">{task.customer.day} {MONTHS[task.customer.month]}</p>
              </div>
              <h4 className="text-2xl font-bold text-slate-900 truncate">{task.customer.name}</h4>
              <p className="text-slate-500 font-medium mb-8">{task.customer.phone}</p>
              <button 
                onClick={() => handleAction(task.customer, task.milestone)} 
                className={`w-full py-4 text-white font-black rounded-2xl transition-colors shadow-lg ${task.isOverdue ? 'bg-red-600' : 'bg-slate-900 group-hover:bg-indigo-600'}`}
              >
                {getActionLabel(task.milestone)}
              </button>
            </div>
          ))}
          {pendingTasks.length === 0 && (
            <div className="col-span-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-12 text-center text-slate-400">
              <p className="text-xl font-bold">Great job! All tasks completed.</p>
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-2xl font-black text-slate-900 mb-6">Customer List</h3>
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden overflow-x-auto">
           <table className="w-full text-left min-w-[600px]">
             <thead className="bg-slate-50 border-b">
               <tr>
                 <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase">Customer</th>
                 <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase">Event Date</th>
                 <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase text-center">Tracking (M/C/G/F)</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
               {customers.map(c => (
                 <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                   <td className="px-8 py-6">
                     <p className="font-bold text-slate-900">{c.name}</p>
                     <p className="text-[10px] text-slate-500 font-black uppercase">{c.eventType} • {c.phone}</p>
                   </td>
                   <td className="px-8 py-6 font-bold text-slate-700">{c.day} {MONTHS[c.month]}</td>
                   <td className="px-8 py-6">
                     <div className="flex justify-center gap-2">
                       <HistoryDot active={c.tracking.messaged} label="M" />
                       <HistoryDot active={c.tracking.called} label="C" />
                       <HistoryDot active={c.tracking.greeted} label="G" />
                       <HistoryDot active={c.tracking.followedUp} label="F" />
                     </div>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      </section>

      {wishModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6" onClick={closeModal}>
          <div className="bg-white rounded-[48px] w-full max-w-xl shadow-2xl p-12 text-center animate-in zoom-in duration-300 relative" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-3xl font-black mb-2">Celebration Wish</h3>
            <p className="text-slate-400 text-[10px] font-black uppercase mb-6 tracking-widest">For: {wishModal.customer?.name}</p>
            <div className="bg-indigo-50 rounded-3xl p-8 mb-10 text-slate-800 italic text-xl border-2 border-indigo-100 min-h-[160px] flex items-center justify-center relative overflow-hidden">
              {loadingWish ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="not-italic text-sm font-bold text-indigo-600 uppercase">Crafting...</span>
                </div>
              ) : wishModal.content}
              
              {copyFeedback && (
                <div className="absolute inset-0 bg-indigo-600/95 flex items-center justify-center text-white text-xl font-black animate-in fade-in zoom-in">Copied!</div>
              )}
              {confirmFeedback && (
                <div className="absolute inset-0 bg-emerald-600/95 flex items-center justify-center text-white text-xl font-black animate-in fade-in zoom-in">Marked Done!</div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleCopy(wishModal.content)} 
                disabled={loadingWish || confirmFeedback}
                className="bg-slate-100 text-slate-900 font-black py-5 rounded-2xl hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                Copy Text
              </button>
              <button 
                onClick={() => {
                  if (wishModal.customer && wishModal.milestone) {
                    markMilestoneComplete(wishModal.customer.id, wishModal.milestone);
                  }
                }} 
                disabled={loadingWish || confirmFeedback}
                className="bg-indigo-600 text-white font-black py-5 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 disabled:opacity-50"
              >
                Done
              </button>
            </div>
            
            <button 
              onClick={closeModal} 
              disabled={confirmFeedback}
              className="mt-8 py-3 px-8 bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-600 transition-all border-2 border-slate-100 rounded-2xl w-full"
            >
              Cancel for now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const getMilestoneLabel = (m: Milestone) => {
  if (m === 'MESSAGE') return '1st Reminder';
  if (m === 'CALL') return 'Tele Call';
  if (m === 'GREET') return 'Big Day Greet';
  if (m === 'FOLLOWUP') return 'Follow Up';
  return '';
};

const getActionLabel = (milestone: Milestone) => {
  if (milestone === 'MESSAGE') return "MESSAGE customer";
  if (milestone === 'CALL') return "TELE CALL customer";
  if (milestone === 'GREET') return "GREET ON BIG DAY";
  if (milestone === 'FOLLOWUP') return "FOLLOW UP reminder";
  return "";
};

const HistoryDot = ({ active, label }: any) => (
  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${active ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 border border-slate-200 text-slate-300 opacity-60'}`}>
    {label}
  </div>
);

export default StaffDashboard;
