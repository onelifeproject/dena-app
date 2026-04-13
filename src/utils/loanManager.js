export const generateId = () => Math.random().toString(36).substr(2, 9);

export const getLoans = () => {
  const data = localStorage.getItem('usuryLoans');
  return data ? JSON.parse(data) : [];
};

export const saveLoans = (loans) => {
  localStorage.setItem('usuryLoans', JSON.stringify(loans));
};

export const addLoan = (loanData) => {
  const loans = getLoans();
  const nextPaymentDate = new Date(loanData.startDate);
  nextPaymentDate.setDate(nextPaymentDate.getDate() + 7);

  const newLoan = {
    ...loanData,
    id: generateId(),
    status: 'ACTIVE', // ACTIVE, DONE
    nextPaymentDate: nextPaymentDate.toISOString(),
    payments: [] // Log of payments
  };

  loans.push(newLoan);
  saveLoans(loans);
  return getLoans();
};

export const collectPayment = (loanId, amount, isFullSettlement) => {
  const loans = getLoans();
  const loanIndex = loans.findIndex(l => l.id === loanId);
  
  if (loanIndex > -1) {
    const loan = loans[loanIndex];
    
    loan.payments.push({
      date: new Date().toISOString(),
      amount,
      type: isFullSettlement ? 'SETTLEMENT' : 'INTEREST'
    });

    if (isFullSettlement) {
      loan.status = 'DONE';
    } else {
      // Step the next payment date forward by 7 days from current nextPaymentDate
      const nextDate = new Date(loan.nextPaymentDate);
      nextDate.setDate(nextDate.getDate() + 7);
      loan.nextPaymentDate = nextDate.toISOString();
    }
    
    saveLoans(loans);
  }
  return getLoans();
};

export const deleteLoan = (loanId) => {
  const loans = getLoans();
  const filteredLoans = loans.filter(l => l.id !== loanId);
  saveLoans(filteredLoans);
  return getLoans();
};

export const calculateDaysLeft = (nextPaymentDateIso) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const paymentDate = new Date(nextPaymentDateIso);
  const nextPayment = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), paymentDate.getDate());
  
  const diffTime = nextPayment - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getAvailableYears = (loans) => {
   const years = new Set([new Date().getFullYear()]);
   loans.forEach(loan => {
      loan.payments.forEach(p => {
         years.add(new Date(p.date).getFullYear());
      });
   });
   return Array.from(years).sort((a,b) => b - a);
};

export const getSummaryStats = (loans, selectedYear, selectedMonth) => {
    let totalActivePrincipal = 0;
    let totalInterestCollected = 0;
    let monthlyInterest = 0;

    const currentSelYear = selectedYear !== undefined ? Number(selectedYear) : new Date().getFullYear();
    const currentSelMonth = selectedMonth !== undefined ? Number(selectedMonth) : new Date().getMonth();

    loans.forEach(loan => {
        if (loan.status === 'ACTIVE') {
            totalActivePrincipal += Number(loan.principal);
        }
        loan.payments.forEach(payment => {
            if (payment.type === 'INTEREST') {
                const amount = Number(payment.amount);
                totalInterestCollected += amount;
                
                const pDate = new Date(payment.date);
                if (pDate.getFullYear() === currentSelYear && pDate.getMonth() === currentSelMonth) {
                   monthlyInterest += amount;
                }
            }
        });
    });

    return { totalActivePrincipal, totalInterestCollected, monthlyInterest };
}
