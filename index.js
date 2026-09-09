// ================================================================
//  STATE
// ================================================================
let budget = 0;
let balance = 0;
let incomes = [];
let expenses = [];
let recurringIncomes = [];
let accounts = [];
let categoryBudgets = {};
let goals = [];
let reminders = [];
let nextId = 1;
let trendChart = null;
let chartPeriod = 'monthly';
let lastRecurringDate = '';

// ================================================================
//  HELPERS
// ================================================================
const save = () => {
  localStorage.setItem('financialData', JSON.stringify({
    budget, balance, incomes, expenses, recurringIncomes, accounts,
    categoryBudgets, goals, reminders, nextId, lastRecurringDate
  }));
};

const load = () => {
  const data = localStorage.getItem('financialData');
  if (data) {
    const parsed = JSON.parse(data);
    budget = parsed.budget || 0;
    balance = parsed.balance !== undefined ? parsed.balance : budget;
    incomes = parsed.incomes || [];
    expenses = parsed.expenses || [];
    recurringIncomes = parsed.recurringIncomes || [];
    accounts = parsed.accounts || [];
    categoryBudgets = parsed.categoryBudgets || {};
    goals = parsed.goals || [];
    reminders = parsed.reminders || [];
    nextId = parsed.nextId || 1;
    lastRecurringDate = parsed.lastRecurringDate || '';
  }
};

const format = (num) => new Intl.NumberFormat('fa-IR').format(num) + ' تومان';
const today = () => new Date().toISOString().slice(0, 10);
const genId = () => nextId++;
const getMonthName = () => ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'][new Date().getMonth()];

// ================================================================
//  INPUT NUMBER - فقط همین تابع کافیه! (هم فارسی هم انگلیسی)
// ================================================================
function getRawNumber(input) {
  // هر چی غیر از عدد (فارسی و انگلیسی) رو حذف کن
  let raw = input.value.replace(/[^0-9۰-۹]/g, '');
  if (raw === '') return NaN;
  
  // اعداد فارسی رو به انگلیسی تبدیل کن
  let englishNumber = raw.replace(/[۰-۹]/g, function(digit) {
    return String.fromCharCode(digit.charCodeAt(0) - 1728);
  });
  
  return parseInt(englishNumber, 10);
}

// ================================================================
//  TAB SWITCH
// ================================================================
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tabName).classList.add('active');
  document.querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`).classList.add('active');
}

// ================================================================
//  DARK MODE
// ================================================================
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

// ================================================================
//  BUDGET
// ================================================================
function setBudget() {
  const val = getRawNumber(document.getElementById('budgetInput'));
  if (isNaN(val) || val < 0) return alert('مبلغ معتبر وارد کنید.');
  budget = val;
  balance = val;
  document.getElementById('budgetInput').value = '';
  save();
  renderAll();
}

// ================================================================
//  INCOME
// ================================================================
function addIncome() {
  const date = document.getElementById('incomeDate').value || today();
  const desc = document.getElementById('incomeDesc').value.trim();
  const cat = document.getElementById('incomeCategory').value;
  const val = getRawNumber(document.getElementById('incomeValue'));
  const accId = parseInt(document.getElementById('incomeAccount').value);
  if (!desc || isNaN(val) || val <= 0) return alert('اطلاعات معتبر وارد کنید.');
  incomes.push({ id: genId(), date, desc, category: cat, value: val, accountId: accId });
  balance += val;
  if (accId > 0) { const acc = accounts.find(a => a.id === accId); if (acc) acc.balance += val; }
  save();
  renderAll();
  document.getElementById('incomeDesc').value = '';
  document.getElementById('incomeValue').value = '';
}

function deleteIncome(id) {
  const idx = incomes.findIndex(i => i.id === id);
  if (idx === -1) return;
  if (!confirm('حذف شود؟')) return;
  const item = incomes[idx];
  balance -= item.value;
  if (item.accountId > 0) { const acc = accounts.find(a => a.id === item.accountId); if (acc) acc.balance -= item.value; }
  incomes.splice(idx, 1);
  save();
  renderAll();
}

function editIncome(id) {
  const item = incomes.find(i => i.id === id);
  if (!item) return;
  document.getElementById('incomeDate').value = item.date;
  document.getElementById('incomeDesc').value = item.desc;
  document.getElementById('incomeCategory').value = item.category;
  document.getElementById('incomeValue').value = item.value.toString();
  document.getElementById('incomeAccount').value = item.accountId || 0;
  deleteIncome(id);
}

function renderIncomes() {
  const container = document.getElementById('incomeList');
  container.innerHTML = incomes.map(i => {
    const accName = accounts.find(a => a.id === i.accountId)?.name || 'عمومی';
    return `<div class="item">
      <span>${i.date} | ${i.desc} | ${i.category} | ${format(i.value)} (${accName})</span>
      <div class="item-actions">
        <button class="edit-btn" onclick="editIncome(${i.id})">ویرایش</button>
        <button class="delete-btn" onclick="deleteIncome(${i.id})">حذف</button>
      </div>
    </div>`;
  }).join('');
}

// ================================================================
//  EXPENSE
// ================================================================
function addExpense() {
  const date = document.getElementById('expenseDate').value || today();
  const desc = document.getElementById('expenseDesc').value.trim();
  const cat = document.getElementById('expenseCategory').value;
  const val = getRawNumber(document.getElementById('expenseValue'));
  const accId = parseInt(document.getElementById('expenseAccount').value);
  if (!desc || isNaN(val) || val <= 0) return alert('اطلاعات معتبر وارد کنید.');
  if (balance < val && accId === 0) return alert('موجودی کافی نیست!');
  expenses.push({ id: genId(), date, desc, category: cat, value: val, accountId: accId });
  balance -= val;
  if (accId > 0) { const acc = accounts.find(a => a.id === accId); if (acc) acc.balance -= val; }
  save();
  renderAll();
  document.getElementById('expenseDesc').value = '';
  document.getElementById('expenseValue').value = '';
}

function deleteExpense(id) {
  const idx = expenses.findIndex(e => e.id === id);
  if (idx === -1) return;
  if (!confirm('حذف شود؟')) return;
  const item = expenses[idx];
  balance += item.value;
  if (item.accountId > 0) { const acc = accounts.find(a => a.id === item.accountId); if (acc) acc.balance += item.value; }
  expenses.splice(idx, 1);
  save();
  renderAll();
}

function editExpense(id) {
  const item = expenses.find(e => e.id === id);
  if (!item) return;
  document.getElementById('expenseDate').value = item.date;
  document.getElementById('expenseDesc').value = item.desc;
  document.getElementById('expenseCategory').value = item.category;
  document.getElementById('expenseValue').value = item.value.toString();
  document.getElementById('expenseAccount').value = item.accountId || 0;
  deleteExpense(id);
}

function renderExpenses() {
  const container = document.getElementById('expenseList');
  container.innerHTML = expenses.map(e => {
    const accName = accounts.find(a => a.id === e.accountId)?.name || 'عمومی';
    return `<div class="item">
      <span>${e.date} | ${e.desc} | ${e.category} | ${format(e.value)} (${accName})</span>
      <div class="item-actions">
        <button class="edit-btn" onclick="editExpense(${e.id})">ویرایش</button>
        <button class="delete-btn" onclick="deleteExpense(${e.id})">حذف</button>
      </div>
    </div>`;
  }).join('');
}

// ================================================================
//  ACCOUNTS
// ================================================================
function addAccount() {
  const name = document.getElementById('accountName').value.trim();
  const type = document.getElementById('accountType').value;
  const bal = getRawNumber(document.getElementById('accountBalance'));
  if (!name || isNaN(bal) || bal < 0) return alert('اطلاعات معتبر وارد کنید.');
  accounts.push({ id: genId(), name, type, balance: bal });
  save();
  renderAll();
  document.getElementById('accountName').value = '';
  document.getElementById('accountBalance').value = '';
}

function deleteAccount(id) {
  if (!confirm('حذف حساب؟')) return;
  accounts = accounts.filter(a => a.id !== id);
  save();
  renderAll();
}

function renderAccounts() {
  const container = document.getElementById('accountList');
  container.innerHTML = accounts.map(a => `
    <div class="item">
      <span>🏦 ${a.name} (${a.type === 'bank' ? 'بانکی' : a.type === 'cash' ? 'نقدی' : 'اعتباری'}) - ${format(a.balance)}</span>
      <div class="item-actions">
        <button class="delete-btn" onclick="deleteAccount(${a.id})">حذف</button>
      </div>
    </div>
  `).join('');
  const fromSel = document.getElementById('transferFrom');
  const toSel = document.getElementById('transferTo');
  fromSel.innerHTML = '<option value="">انتخاب مبدا</option>' + accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  toSel.innerHTML = '<option value="">انتخاب مقصد</option>' + accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  const incAcc = document.getElementById('incomeAccount');
  const expAcc = document.getElementById('expenseAccount');
  const opts = accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  incAcc.innerHTML = `<option value="0">انتخاب حساب</option>` + opts;
  expAcc.innerHTML = `<option value="0">انتخاب حساب</option>` + opts;
}

function transferMoney() {
  const fromId = parseInt(document.getElementById('transferFrom').value);
  const toId = parseInt(document.getElementById('transferTo').value);
  const amount = getRawNumber(document.getElementById('transferAmount'));
  if (!fromId || !toId) return alert('لطفاً هر دو حساب را انتخاب کنید.');
  if (fromId === toId) return alert('حساب مبدا و مقصد یکسان است!');
  if (isNaN(amount) || amount <= 0) return alert('مبلغ معتبر وارد کنید.');
  const fromAcc = accounts.find(a => a.id === fromId);
  const toAcc = accounts.find(a => a.id === toId);
  if (!fromAcc || !toAcc) return alert('حساب پیدا نشد.');
  if (fromAcc.balance < amount) return alert('موجودی حساب مبدا کافی نیست!');
  fromAcc.balance -= amount;
  toAcc.balance += amount;
  save();
  renderAll();
  document.getElementById('transferAmount').value = '';
  alert('✅ انتقال وجه با موفقیت انجام شد.');
}

// ================================================================
//  CATEGORY BUDGET
// ================================================================
function setCategoryBudget() {
  const cat = document.getElementById('categoryBudgetSelect').value;
  const val = getRawNumber(document.getElementById('categoryBudgetInput'));
  if (isNaN(val) || val < 0) return alert('سقف معتبر وارد کنید.');
  categoryBudgets[cat] = val;
  save();
  renderAll();
  document.getElementById('categoryBudgetInput').value = '';
}

function renderCategoryBudgets() {
  const container = document.getElementById('categoryBudgetList');
  container.innerHTML = Object.entries(categoryBudgets).map(([cat, limit]) => {
    const spent = expenses.filter(e => e.category === cat).reduce((s, e) => s + e.value, 0);
    const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
    const warn = pct > 80 ? '⚠️' : '✅';
    return `<div class="item">${warn} ${cat}: سقف ${format(limit)} | مصرف ${format(spent)} (${pct.toFixed(0)}%)</div>`;
  }).join('');
}

// ================================================================
//  RECURRING INCOME
// ================================================================
function addRecurringIncome() {
  const title = document.getElementById('recurringIncomeTitle').value.trim();
  const period = document.getElementById('recurringIncomePeriod').value;
  const amount = getRawNumber(document.getElementById('recurringIncomeAmount'));
  if (!title || isNaN(amount) || amount <= 0) return alert('اطلاعات معتبر وارد کنید.');
  recurringIncomes.push({ id: genId(), title, period, amount, active: true });
  save();
  renderAll();
  document.getElementById('recurringIncomeTitle').value = '';
  document.getElementById('recurringIncomeAmount').value = '';
}

function toggleRecurring(id) {
  const item = recurringIncomes.find(r => r.id === id);
  if (item) { item.active = !item.active;
    save();
    renderAll(); }
}

function deleteRecurring(id) {
  recurringIncomes = recurringIncomes.filter(r => r.id !== id);
  save();
  renderAll();
}

function renderRecurringIncomes() {
  const container = document.getElementById('recurringIncomeList');
  container.innerHTML = recurringIncomes.map(r => `
    <div class="item ${!r.active ? 'inactive' : ''}">
      <span>${r.title} - ${r.period === 'daily' ? 'روزانه' : r.period === 'weekly' ? 'هفتگی' : 'ماهانه'} - ${format(r.amount)}</span>
      <div class="item-actions">
        <button class="${r.active ? 'disable-btn' : 'enable-btn'}" onclick="toggleRecurring(${r.id})">${r.active ? 'غیرفعال' : 'فعال'}</button>
        <button class="delete-btn" onclick="deleteRecurring(${r.id})">حذف</button>
      </div>
    </div>
  `).join('');
}

function applyRecurring() {
  const todayStr = today();
  if (lastRecurringDate === todayStr) return;
  let applied = false;
  const now = new Date();
  const dow = now.getDay();
  const day = now.getDate();
  recurringIncomes.forEach(r => {
    if (!r.active || r.amount <= 0) return;
    let should = false;
    if (r.period === 'daily') should = true;
    else if (r.period === 'weekly' && dow === 0) should = true;
    else if (r.period === 'monthly' && day === 1) should = true;
    if (should) { balance += r.amount;
      applied = true; }
  });
  if (applied) { lastRecurringDate = todayStr;
    save(); }
}
// ================================================================
//  GOAL
// ================================================================
function setGoal() {
  const amount = getRawNumber(document.getElementById('goalInput'));
  const deadline = document.getElementById('goalDeadline').value;
  if (isNaN(amount) || amount <= 0) return alert('مبلغ هدف معتبر وارد کنید.');
  goals.push({ id: genId(), amount, deadline, saved: 0 });
  save();
  renderAll();
  document.getElementById('goalInput').value = '';
  document.getElementById('goalDeadline').value = '';
}

function updateGoalUI() {
  if (goals.length === 0) {
    document.getElementById('goalProgressText').textContent = '۰%';
    document.getElementById('goalFill').style.width = '0%';
    document.getElementById('currentSavings').textContent = '۰';
    document.getElementById('goalAmountDisplay').textContent = '۰';
    document.getElementById('goalDeadlineDisplay').textContent = 'تعیین نشده';
    return;
  }
  const goal = goals[goals.length - 1];
  const totalInc = incomes.reduce((s, i) => s + i.value, 0);
  const totalExp = expenses.reduce((s, e) => s + e.value, 0);
  const savings = totalInc - totalExp;
  goal.saved = savings;
  const pct = goal.amount > 0 ? Math.min(100, (savings / goal.amount) * 100) : 0;
  document.getElementById('goalFill').style.width = pct + '%';
  document.getElementById('goalProgressText').textContent = pct.toFixed(0) + '%';
  document.getElementById('currentSavings').textContent = format(savings);
  document.getElementById('goalAmountDisplay').textContent = format(goal.amount);
  document.getElementById('goalDeadlineDisplay').textContent = goal.deadline || 'تعیین نشده';
  save();
}

// ================================================================
//  REMINDERS
// ================================================================
function addReminder() {
  const title = document.getElementById('reminderTitle').value.trim();
  const date = document.getElementById('reminderDate').value;
  const amount = getRawNumber(document.getElementById('reminderAmount'));
  if (!title || !date) return alert('عنوان و تاریخ را وارد کنید.');
  reminders.push({ id: genId(), title, date, amount: isNaN(amount) ? 0 : amount, done: false });
  save();
  renderAll();
  document.getElementById('reminderTitle').value = '';
  document.getElementById('reminderDate').value = '';
  document.getElementById('reminderAmount').value = '';
}

function toggleReminder(id) {
  const item = reminders.find(r => r.id === id);
  if (item) { item.done = !item.done;
    save();
    renderAll(); }
}

function deleteReminder(id) {
  reminders = reminders.filter(r => r.id !== id);
  save();
  renderAll();
}

function renderReminders() {
  const container = document.getElementById('reminderList');
  const todayStr = today();
  container.innerHTML = reminders.map(r => `
    <div class="item ${r.done ? 'inactive' : ''}" style="${r.date < todayStr && !r.done ? 'border-color:#ef4444;' : ''}">
      <span>${r.done ? '✅' : '⏰'} ${r.title} - ${r.date} ${r.amount > 0 ? format(r.amount) : ''}</span>
      <div class="item-actions">
        <button class="${r.done ? 'enable-btn' : 'disable-btn'}" onclick="toggleReminder(${r.id})">${r.done ? 'فعال' : 'انجام شد'}</button>
        <button class="delete-btn" onclick="deleteReminder(${r.id})">حذف</button>
      </div>
    </div>
  `).join('');
}

// ================================================================
//  STATS & SUGGESTIONS
// ================================================================
function renderStats() {
  const totalInc = incomes.reduce((s, i) => s + i.value, 0);
  const totalExp = expenses.reduce((s, e) => s + e.value, 0);
  document.getElementById('totalIncome').textContent = format(totalInc);
  document.getElementById('totalExpense').textContent = format(totalExp);
  document.getElementById('balanceDisplay').textContent = format(balance);
  document.getElementById('initialBudgetDisplay').textContent = format(budget);
  const pct = budget > 0 ? Math.min(100, (totalExp / budget) * 100) : 0;
  const fill = document.querySelector('#budgetProgress .fill');
  fill.style.width = pct + '%';
  fill.className = 'fill' + (pct > 80 ? ' danger' : pct > 60 ? ' warning' : '');
  document.getElementById('budgetSub').textContent = pct.toFixed(0) + '% مصرف شده';
  let health = 100;
  if (totalInc > 0 && totalExp > 0) {
    const ratio = totalExp / totalInc;
    if (ratio > 0.8) health = 40;
    else if (ratio > 0.6) health = 60;
    else if (ratio > 0.4) health = 80;
    else health = 95;
  } else if (totalExp === 0 && balance > 0) health = 100;
  else if (balance === 0 && totalExp === 0) health = 50;
  if (balance < 0) health = 20;
  document.getElementById('healthScore').textContent = health;
  generateSuggestions(totalInc, totalExp, balance, pct);
}

function generateSuggestions(totalInc, totalExp, balance, pct) {
  const s1 = document.getElementById('suggestion1');
  const s2 = document.getElementById('suggestion2');
  const s3 = document.getElementById('suggestion3');
  const sAI = document.getElementById('suggestionAI');
  if (balance < 0) { s1.textContent = '⚠️ موجودی منفی است!';
    s1.parentElement.className = 'suggestion-item danger'; } else if (pct > 80) { s1.textContent = '⚠️ بیش از ۸۰٪ بودجه مصرف شد!';
    s1.parentElement.className = 'suggestion-item warning'; } else if (pct > 50) { s1.textContent = '✅ وضعیت خوب است، با دقت هزینه کنید.';
    s1.parentElement.className = 'suggestion-item success'; } else { s1.textContent = '✅ عالی! هزینه‌ها تحت کنترل است.';
    s1.parentElement.className = 'suggestion-item success'; }
  if (balance > 0 && totalInc > 0) {
    const savePct = ((balance / totalInc) * 100).toFixed(0);
    if (savePct > 20) { s2.textContent = `💰 ${savePct}% پس‌انداز، سرمایه‌گذاری کنید.`;
      s2.parentElement.className = 'suggestion-item success'; } else if (savePct > 10) { s2.textContent = `💰 ${savePct}% پس‌انداز، عالی است!`;
      s2.parentElement.className = 'suggestion-item success'; } else { s2.textContent = '💡 حداقل ۱۰٪ درآمد را پس‌انداز کنید.';
      s2.parentElement.className = 'suggestion-item warning'; }
  } else { s2.textContent = '💡 برای پس‌انداز، درآمد ثبت کنید.';
    s2.parentElement.className = 'suggestion-item warning'; }
  if (expenses.length > 0) {
    const catExp = expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.value; return acc; }, {});
    const sorted = Object.entries(catExp).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const top = sorted[0];
      const topPct = ((top[1] / totalExp) * 100).toFixed(0);
      if (topPct > 40) { s3.textContent = `📊 بیشترین هزینه: ${top[0]} (${topPct}%)`;
        s3.parentElement.className = 'suggestion-item warning'; } else { s3.textContent = '📊 هزینه‌ها متعادل هستند.';
        s3.parentElement.className = 'suggestion-item success'; }
    }
  } else { s3.textContent = '📊 هنوز هزینه‌ای ثبت نشده است.';
    s3.parentElement.className = 'suggestion-item success'; }
  if (expenses.length > 5) {
    const avgExp = totalExp / expenses.length;
    const predicted = (avgExp * 30).toFixed(0);
    sAI.textContent = `🤖 پیش‌بینی ماه آینده: ${format(parseInt(predicted))}`;
  } else {
    sAI.textContent = '🤖 حداقل ۵ هزینه ثبت کنید.';
  }
}

// ================================================================
//  CHART
// ================================================================
function getChartData(period) {
  const labels = [],
    incomeData = [],
    expenseData = [];
  const now = new Date();
  let count = period === 'weekly' ? 7 : 12;
  if (period === 'weekly') {
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('fa-IR'));
      const dayStr = d.toISOString().slice(0, 10);
      incomeData.push(incomes.filter(x => x.date === dayStr).reduce((s, x) => s + x.value, 0));
      expenseData.push(expenses.filter(x => x.date === dayStr).reduce((s, x) => s + x.value, 0));
    }
  } else {
    for (let i = count - 1; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(getMonthName(m.getMonth()) + ' ' + m.getFullYear());
      const monthStr = m.getFullYear() + '-' + String(m.getMonth() + 1).padStart(2, '0');
      incomeData.push(incomes.filter(x => x.date && x.date.startsWith(monthStr)).reduce((s, x) => s + x.value, 0));
      expenseData.push(expenses.filter(x => x.date && x.date.startsWith(monthStr)).reduce((s, x) => s + x.value, 0));
    }
  }
  return { labels, incomeData, expenseData };
}

function renderTrendChart(period = 'monthly') {
  const data = getChartData(period);
  const ctx = document.getElementById('trendChart').getContext('2d');
  if (trendChart) trendChart.destroy();
  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels.length ? data.labels : ['بدون داده'],
      datasets: [
        { label: 'درآمد', data: data.incomeData.length ? data.incomeData : [0], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.3 },
        { label: 'هزینه', data: data.expenseData.length ? data.expenseData : [0], borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.3 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } }, tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + format(ctx.parsed.y) } } },
      scales: { y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString('fa-IR') } } }
    }
  });
  const data2 = expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.value; return acc; }, {});
  const sorted = Object.entries(data2).sort((a, b) => b[1] - a[1]);
  document.getElementById('expenseAnalysisList').innerHTML = sorted.map(([cat, total]) => `<div class="analysis-item"><span>${cat}</span> <span>${format(total)}</span></div>`).join('');
}

function setChartPeriod(period) { chartPeriod = period;
  renderTrendChart(period); }

function compareMonths() {
  const now = new Date();
  const thisMonth = now.getMonth(),
    thisYear = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear;
  const m1 = thisYear + '-' + String(thisMonth + 1).padStart(2, '0');
  const m2 = lastYear + '-' + String(lastMonth + 1).padStart(2, '0');
  const inc1 = incomes.filter(x => x.date && x.date.startsWith(m1)).reduce((s, x) => s + x.value, 0);
  const exp1 = expenses.filter(x => x.date && x.date.startsWith(m1)).reduce((s, x) => s + x.value, 0);
  const inc2 = incomes.filter(x => x.date && x.date.startsWith(m2)).reduce((s, x) => s + x.value, 0);
  const exp2 = expenses.filter(x => x.date && x.date.startsWith(m2)).reduce((s, x) => s + x.value, 0);
  alert(`📊 مقایسه ماه جاری با ماه قبل:\n\nدرآمد: ${format(inc1)} vs ${format(inc2)}\nهزینه: ${format(exp1)} vs ${format(exp2)}\nمانده: ${format(inc1 - exp1)} vs ${format(inc2 - exp2)}`);
}

// ================================================================
//  EXPORT / IMPORT / RESET
// ================================================================
function exportData() {
  const data = { budget, balance, incomes, expenses, recurringIncomes, accounts, categoryBudgets, goals, reminders, nextId, lastRecurringDate };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'financial_data.json';
  a.click();
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.budget !== undefined) {
          budget = data.budget || 0;
          balance = data.balance !== undefined ? data.balance : budget;
          incomes = data.incomes || [];
          expenses = data.expenses || [];
          recurringIncomes = data.recurringIncomes || [];
          accounts = data.accounts || [];
          categoryBudgets = data.categoryBudgets || {};
          goals = data.goals || [];
          reminders = data.reminders || [];
          nextId = data.nextId || 1;
          lastRecurringDate = data.lastRecurringDate || '';
          save();
          renderAll();
          alert('✅ داده‌ها با موفقیت وارد شدند.');
        } else { alert('فرمت فایل معتبر نیست.'); }
      } catch { alert('خطا در خواندن فایل.'); }
    };
    reader.readAsText(file);
  };
  input.click();
}

function resetAll() {
  if (!confirm('همه داده‌ها پاک می‌شوند. ادامه؟')) return;
  budget = 0;
  balance = 0;
  incomes = [];
  expenses = [];
  recurringIncomes = [];
  accounts = [];
  categoryBudgets = {};
  goals = [];
  reminders = [];
  nextId = 1;
  lastRecurringDate = '';
  save();
  renderAll();
}

// ================================================================
//  RENDER ALL
// ================================================================
function renderAll() {
  renderStats();
  renderIncomes();
  renderExpenses();
  renderRecurringIncomes();
  renderAccounts();
  renderCategoryBudgets();
  renderReminders();
  updateGoalUI();
  renderTrendChart(chartPeriod);
  if (!document.getElementById('incomeDate').value) document.getElementById('incomeDate').value = today();
  if (!document.getElementById('expenseDate').value) document.getElementById('expenseDate').value = today();
}

// ================================================================
//  TOUR
// ================================================================
(function() {
  const tourMessages = {
    'budget-card': { title: '💰 بودجه', message: 'مبلغ اولیه بودجه را وارد کنید.' },
    'income-card': { title: '📥 ثبت درآمد', message: 'درآمد خود را با شرح و دسته ثبت کنید.' },
    'expense-card': { title: '📤 ثبت هزینه', message: 'هزینه‌ها را ثبت کنید، سیستم از موجودی کم می‌کند.' },
    'chart-card': { title: '📊 تحلیل', message: 'نمودار روند و تحلیل دسته‌بندی را ببینید.' },
    'recurring-card': { title: '🔄 درآمد دوره‌ای', message: 'درآمد روزانه/هفتگی/ماهانه تنظیم کنید.' },
    'goal-card': { title: '🎯 هدف مالی', message: 'هدف با ضرب‌الاجل تعیین کنید و پیشرفت را ببینید.' },
    'accounts-card': { title: '🏦 حساب‌ها', message: 'چند حساب بسازید و بین آنها انتقال دهید.' },
    'category-budget-card': { title: '🏷️ بودجه دسته‌ها', message: 'برای هر دسته هزینه سقف تعیین کنید.' },
    'reminder-card': { title: '🔔 یادآوری', message: 'برای قبوض و پرداخت‌ها یادآوری بسازید.' }
  };

  function showTour(cardId) {
    const data = tourMessages[cardId];
    if (!data || localStorage.getItem('tour_seen_' + cardId) === 'true') return;
    const card = document.getElementById(cardId);
    if (!card) return;
    card.style.boxShadow = '0 0 0 3px #8b5cf6, 0 8px 30px rgba(139,92,246,0.4)';
    const overlay = document.createElement('div');
    overlay.id = 'tour-overlay';
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; display:flex; justify-content:center; align-items:center;';
    const box = document.createElement('div');
    box.style.cssText = 'background:#1e293b; color:#fff; padding:24px 20px; border-radius:20px; max-width:340px; width:90%; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.6);';
    box.innerHTML = `
        <div style="font-size:40px; margin-bottom:4px;">${data.title.split(' ')[0]}</div>
        <h3 style="font-size:17px; margin-bottom:8px;">${data.title}</h3>
        <p style="font-size:13px; line-height:1.6; color:#cbd5e1; margin-bottom:16px;">${data.message}</p>
        <button onclick="closeTour('${cardId}')" style="background:linear-gradient(135deg,#8b5cf6,#6d28d9); color:#fff; border:none; padding:10px 24px; border-radius:40px; font-size:14px; font-weight:600; cursor:pointer; width:100%;">✅ متوجه شدم</button>
      `;
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  window.closeTour = function(cardId) {
    localStorage.setItem('tour_seen_' + cardId, 'true');
    const card = document.getElementById(cardId);
    if (card) { card.style.boxShadow = ''; }
    const overlay = document.getElementById('tour-overlay');
    if (overlay) overlay.remove();
  };

  document.addEventListener('DOMContentLoaded', function() {
    const ids = ['budget-card', 'income-card', 'expense-card', 'chart-card', 'recurring-card', 'goal-card', 'accounts-card', 'category-budget-card', 'reminder-card'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', function(e) {
          if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
          showTour(id);
        });
      }
    });
  });
})();

// ================================================================
//  INIT
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
  }

  load();
  applyRecurring();
  renderAll();

  if (!document.getElementById('incomeDate').value) document.getElementById('incomeDate').value = today();
  if (!document.getElementById('expenseDate').value) document.getElementById('expenseDate').value = today();

  setInterval(() => {
    const backup = JSON.stringify({ budget, balance, incomes, expenses, recurringIncomes, accounts, categoryBudgets, goals, reminders, nextId, lastRecurringDate });
    localStorage.setItem('autoBackup', backup);
  }, 1800000);

  const title = document.querySelector('.header h1');
  if (title) {
    let clickCount = 0;
    title.addEventListener('click', function() {
      clickCount++;
      if (clickCount >= 5) {
        const keys = ['budget-card', 'income-card', 'expense-card', 'chart-card', 'recurring-card', 'goal-card', 'accounts-card', 'category-budget-card', 'reminder-card'];
        keys.forEach(id => localStorage.removeItem('tour_seen_' + id));
        alert('✅ تور راهنما ریست شد! حالا روی هر کارت کلیک کن تا راهنما رو ببینی.');
        clickCount = 0;
      }
    });
  }
});