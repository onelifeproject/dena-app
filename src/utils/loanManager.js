export const generateId = () => Math.random().toString(36).substr(2, 9);
const PROFIT_INTERVAL_KEY = 'usuryProfitIntervalDays';
const DEFAULT_PROFIT_INTERVAL_DAYS = 7;

const normalizeProfitIntervalDays = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return DEFAULT_PROFIT_INTERVAL_DAYS;
  return Math.min(365, Math.max(1, parsed));
};

export const getLoans = () => {
  const data = localStorage.getItem('usuryLoans');
  return data ? JSON.parse(data) : [];
};

export const saveLoans = (loans) => {
  localStorage.setItem('usuryLoans', JSON.stringify(loans));
};

export const getProfitIntervalDays = () => {
  const raw = localStorage.getItem(PROFIT_INTERVAL_KEY);
  if (!raw) return DEFAULT_PROFIT_INTERVAL_DAYS;
  return normalizeProfitIntervalDays(raw);
};

export const saveProfitIntervalDays = (days) => {
  const normalized = normalizeProfitIntervalDays(days);
  localStorage.setItem(PROFIT_INTERVAL_KEY, String(normalized));
  return normalized;
};

const toStartOfDay = (dateValue) => {
  const date = new Date(dateValue);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const getAnchorDateForLoan = (loan) => {
  if (loan.payments?.length) {
    return loan.payments[loan.payments.length - 1].date;
  }
  return loan.startDate;
};

const buildNextPaymentDate = (anchorDateValue, intervalDays) => {
  const nextDate = toStartOfDay(anchorDateValue);
  nextDate.setDate(nextDate.getDate() + intervalDays);

  const today = toStartOfDay(new Date());
  while (nextDate < today) {
    nextDate.setDate(nextDate.getDate() + intervalDays);
  }

  return nextDate.toISOString();
};

export const addLoan = (loanData) => {
  const loans = getLoans();
  const intervalDays = getProfitIntervalDays();
  const nextPaymentDate = buildNextPaymentDate(loanData.startDate, intervalDays);

  const newLoan = {
    ...loanData,
    id: generateId(),
    status: 'ACTIVE', // ACTIVE, DONE
    nextPaymentDate,
    payments: [] // Log of payments
  };

  loans.push(newLoan);
  saveLoans(loans);
  return getLoans();
};

export const collectPayment = (loanId, amount, isFullSettlement) => {
  const loans = getLoans();
  const intervalDays = getProfitIntervalDays();
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
      // Step the next payment date forward by configured interval days
      loan.nextPaymentDate = buildNextPaymentDate(loan.nextPaymentDate, intervalDays);
    }
    
    saveLoans(loans);
  }
  return getLoans();
};

export const applyProfitIntervalToActiveLoans = (days) => {
  const intervalDays = saveProfitIntervalDays(days);
  const loans = getLoans();

  const updatedLoans = loans.map((loan) => {
    if (loan.status !== 'ACTIVE') return loan;
    const anchorDateValue = getAnchorDateForLoan(loan);
    return {
      ...loan,
      nextPaymentDate: buildNextPaymentDate(anchorDateValue, intervalDays),
    };
  });

  saveLoans(updatedLoans);
  return { intervalDays, loans: getLoans() };
};

export const deleteLoan = (loanId) => {
  const loans = getLoans();
  const filteredLoans = loans.filter(l => l.id !== loanId);
  saveLoans(filteredLoans);
  return getLoans();
};

export const updateLoan = (loanId, loanData) => {
  const loans = getLoans();
  const loanIndex = loans.findIndex((loan) => loan.id === loanId);

  if (loanIndex > -1) {
    loans[loanIndex] = {
      ...loans[loanIndex],
      name: loanData.name,
      startDate: loanData.startDate,
      principal: Number(loanData.principal),
      interestPerWeek: Number(loanData.interestPerWeek),
      proofImage: loanData.proofImage || null,
    };
    saveLoans(loans);
  }

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
