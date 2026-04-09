import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function AddLoanForm({ onSave, onCancel }) {
  const [name, setName] = useState('');
  
  // Use pure JS date for DatePicker, we will format it exactly later on submit.
  const [startDate, setStartDate] = useState(new Date());
  
  const [principal, setPrincipal] = useState('');
  const [interestPerWeek, setInterestPerWeek] = useState('');

  useEffect(() => {
    if (principal && !isNaN(principal)) {
      setInterestPerWeek(Math.floor(Number(principal) * 0.1).toString());
    }
  }, [principal]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !principal || !interestPerWeek || !startDate) return;

    // Final conversion to ensure strictly accurate Asia timezone string (YYYY-MM-DD) natively
    const tzDate = new Date(startDate.toLocaleString("en-US", {timeZone: "Asia/Dhaka"}));
    const yyyy = tzDate.getFullYear();
    const mm = String(tzDate.getMonth() + 1).padStart(2, '0');
    const dd = String(tzDate.getDate()).padStart(2, '0');
    const dbFormattedDate = `${yyyy}-${mm}-${dd}`;

    onSave({
      name,
      startDate: dbFormattedDate,
      principal: Number(principal),
      interestPerWeek: Number(interestPerWeek)
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-brand-gradient">নতুন লোন দিন</h2>
            <button onClick={onCancel} style={{background:'transparent', border:'none', color:'var(--text-muted)', fontSize:'2rem', cursor:'pointer', lineHeight: '1'}}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">যাকে টাকা দিচ্ছেন তার নাম</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="যেমন: রহিম মিয়া"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group date-picker-wrapper">
            <label className="form-label">টাকা দেওয়ার তারিখ</label>
            <DatePicker 
               selected={startDate} 
               onChange={(date) => setStartDate(date)} 
               className="form-input w-full"
               dateFormat="dd/MM/yyyy"
               placeholderText="তারিখ নির্বাচন করুন"
               required
            />
          </div>

          <div className="form-group">
            <label className="form-label">মোট টাকার পরিমাণ (৳)</label>
            <input 
              type="number" 
              className="form-input" 
              placeholder="যেমন: ২০০০০"
              value={principal}
              onChange={e => setPrincipal(e.target.value)}
              required
            />
          </div>

          <div className="form-group mb-8">
            <label className="form-label">সপ্তাহে লাভের পরিমাণ (৳)</label>
            <input 
              type="number" 
              className="form-input" 
              placeholder="যেমন: ২০০০"
              value={interestPerWeek}
              onChange={e => setInterestPerWeek(e.target.value)}
              required
            />
            <span className="text-xs text-brand-primary" style={{ marginLeft: '0.25rem', marginTop: '0.25rem', opacity: 0.9 }}>
              আপনি চাইলে যেকোনো পরিমাণ বসাতে পারেন, যা আপনি লাভ হিসেবে নিবেন।
            </span>
          </div>

          <button type="submit" className="btn btn-primary w-full text-lg shadow-glow">
             হিসাব সেভ করুন
          </button>
        </form>
      </div>
    </div>
  );
}
