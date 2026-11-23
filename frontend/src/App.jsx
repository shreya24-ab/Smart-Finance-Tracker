import { useMemo, useState } from 'react'
import './App.css'

const categories = ['Food', 'Transport', 'Education', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Other']
const starterTransactions = [
  { id: 't1', title: 'Monthly salary', category: 'Salary', date: '2026-11-21', amount: 4200, type: 'income', account: 'Main account' },
  { id: 't2', title: 'Weekly groceries', category: 'Food', date: '2026-11-22', amount: 86.4, type: 'expense', account: 'Everyday card' },
  { id: 't3', title: 'Metro pass', category: 'Transport', date: '2026-11-20', amount: 42, type: 'expense', account: 'Everyday card' },
  { id: 't4', title: 'Freelance project', category: 'Freelance', date: '2026-11-19', amount: 640, type: 'income', account: 'Main account' },
  { id: 't5', title: 'Electricity bill', category: 'Bills', date: '2026-11-18', amount: 74.2, type: 'expense', account: 'Main account' },
  { id: 't6', title: 'Running shoes', category: 'Shopping', date: '2026-11-16', amount: 118, type: 'expense', account: 'Everyday card' },
  { id: 't7', title: 'Online course', category: 'Education', date: '2026-11-14', amount: 49, type: 'expense', account: 'Everyday card' },
]
const initialBudgets = { Food: 500, Transport: 220, Education: 180, Shopping: 350, Entertainment: 160, Bills: 420, Health: 120, Other: 200 }

function encodeBytes(bytes) {
  return btoa(String.fromCharCode(...bytes))
}

async function passwordRecord(password, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, key, 256)
  return { salt: encodeBytes(salt), hash: encodeBytes(new Uint8Array(hash)) }
}

function readAccounts() {
  try { return JSON.parse(localStorage.getItem('ledgerly-accounts')) || [] } catch { return [] }
}

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    list: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M3 9h18M16 14h2" /><path d="M6 5V3h12v2" /></>,
    chart: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-5 3 2 5-7" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16Z" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function money(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value)
}

function App() {
  const [transactions, setTransactions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ledgerly-transactions')) || starterTransactions } catch { return starterTransactions }
  })
  const [budgets, setBudgets] = useState(() => {
    try { return { ...initialBudgets, ...JSON.parse(localStorage.getItem('ledgerly-budgets')) } } catch { return initialBudgets }
  })
  const [activeTab, setActiveTab] = useState('Overview')
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All categories')
  const [typeFilter, setTypeFilter] = useState('All types')
  const [modal, setModal] = useState(null)
  const [notice, setNotice] = useState(false)
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('ledgerly-session')) } catch { return null }
  })
  const [authOpen, setAuthOpen] = useState(() => !sessionStorage.getItem('ledgerly-session'))
  const [authMode, setAuthMode] = useState('login')
  const [authError, setAuthError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)

  const totals = useMemo(() => transactions.reduce((sum, item) => {
    sum[item.type] += Number(item.amount)
    return sum
  }, { income: 0, expense: 0 }), [transactions])
  const filteredTransactions = useMemo(() => transactions.filter((item) => {
    const matchesText = `${item.title} ${item.category} ${item.account}`.toLowerCase().includes(query.toLowerCase())
    return matchesText && (categoryFilter === 'All categories' || item.category === categoryFilter) && (typeFilter === 'All types' || item.type === typeFilter.toLowerCase())
  }).sort((a, b) => b.date.localeCompare(a.date)), [transactions, query, categoryFilter, typeFilter])
  const spentByCategory = useMemo(() => transactions.filter((item) => item.type === 'expense').reduce((result, item) => {
    result[item.category] = (result[item.category] || 0) + Number(item.amount)
    return result
  }, {}), [transactions])
  const spent = totals.expense
  const remaining = Math.max(0, Object.values(budgets).reduce((sum, amount) => sum + Number(amount), 0) - spent)

  function persistTransactions(next) {
    setTransactions(next)
    localStorage.setItem('ledgerly-transactions', JSON.stringify(next))
  }

  function persistBudgets(next) {
    setBudgets(next)
    localStorage.setItem('ledgerly-budgets', JSON.stringify(next))
  }

  async function submitAuth(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = data.get('email').toString().trim().toLowerCase()
    const password = data.get('password').toString()
    setAuthError('')
    setAuthBusy(true)
    try {
      const accounts = readAccounts()
      if (authMode === 'register') {
        const name = data.get('name').toString().trim()
        if (password !== data.get('confirmPassword').toString()) {
          setAuthError('The passwords do not match. Please check and try again.')
          return
        }
        if (accounts.some((account) => account.email === email)) {
          setAuthError('An account with this email already exists. Sign in instead.')
          return
        }
        const credentials = await passwordRecord(password)
        const account = { name, email, ...credentials }
        localStorage.setItem('ledgerly-accounts', JSON.stringify([...accounts, account]))
        finishSignIn({ name, email })
        return
      }

      const account = accounts.find((item) => item.email === email)
      if (!account) {
        setAuthError('Login unsuccessful. No account is registered with this email. Create an account first.')
        return
      }
      const salt = Uint8Array.from(atob(account.salt), (character) => character.charCodeAt(0))
      const credentials = await passwordRecord(password, salt)
      if (credentials.hash !== account.hash) {
        setAuthError('Login unsuccessful. The email or password is incorrect.')
        return
      }
      finishSignIn({ name: account.name, email: account.email })
    } catch {
      setAuthError('Could not complete sign-in in this browser. Please try again.')
    } finally {
      setAuthBusy(false)
    }
  }

  function finishSignIn(user) {
    sessionStorage.setItem('ledgerly-session', JSON.stringify(user))
    setCurrentUser(user)
    setAuthError('')
    setAuthOpen(false)
    setNotice(true)
  }

  function signOut() {
    sessionStorage.removeItem('ledgerly-session')
    setCurrentUser(null)
    setAuthMode('login')
    setAuthError('')
    setAuthOpen(true)
  }

  function saveTransaction(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const transaction = {
      id: modal?.item?.id || `t${Date.now()}`,
      title: data.get('title').toString().trim(),
      type: data.get('type').toString(),
      category: data.get('category').toString(),
      amount: Number(data.get('amount')),
      date: data.get('date').toString(),
      account: data.get('account').toString().trim() || 'Main account',
    }
    const next = modal?.item ? transactions.map((item) => item.id === transaction.id ? transaction : item) : [transaction, ...transactions]
    persistTransactions(next)
    setModal(null)
  }

  function deleteTransaction(id) {
    persistTransactions(transactions.filter((item) => item.id !== id))
  }

  const navItems = [
    { label: 'Overview', icon: 'grid' },
    { label: 'Transactions', icon: 'list' },
    { label: 'Budgets', icon: 'wallet' },
    { label: 'Reports', icon: 'chart' },
  ]
  const pageCopy = {
    Overview: ['Your money, in focus', 'A little clarity goes a long way. Here’s your financial snapshot.'],
    Transactions: ['Every transaction, together', 'Search, review, and manage your income and expenses.'],
    Budgets: ['Budgets that work for you', 'Keep category spending aligned with your monthly plan.'],
    Reports: ['Your spending, at a glance', 'Understand where your money goes and spot helpful patterns.'],
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="Ledgerly home"><span className="brand-mark">L</span><span>ledgerly<span className="brand-dot">.</span></span></a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map((item) => <button key={item.label} className={`nav-link ${activeTab === item.label ? 'active' : ''}`} onClick={() => setActiveTab(item.label)}><Icon name={item.icon} size={18} />{item.label}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="upgrade-card"><span className="upgrade-icon"><Icon name="sparkle" size={17} /></span><strong>Make money make sense.</strong><p>Your finances, finally in one clear place.</p><button onClick={() => setAuthOpen(true)}>Explore your account <Icon name="arrow" size={14} /></button></div>
          <button className="profile-row" onClick={() => setAuthOpen(true)}><span className="avatar">{currentUser?.name.slice(0, 2).toUpperCase() || 'JD'}</span><span className="profile-copy"><strong>{currentUser?.name || 'Guest account'}</strong><small>{currentUser ? currentUser.email : 'Sign in required'}</small></span><Icon name="more" size={18} /></button>
        </div>
      </aside>

      <main className="main-area" id="overview">
        <header className="topbar"><div className="breadcrumb">Workspace <Icon name="chevron" size={14} /> <span>{activeTab}</span></div><div className="top-actions"><span className="demo-mode-badge">LOCAL DEMO</span><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotice(!notice)}><Icon name="bell" /><i /></button>{notice && <div className="notification-popover"><strong>{currentUser ? 'Login successful' : 'Login unsuccessful'}</strong><span>{currentUser ? `Signed in as ${currentUser.email}.` : 'Please sign in to continue.'}</span></div>}<button className="top-avatar" onClick={() => setAuthOpen(true)} aria-label="Account settings">{currentUser?.name.slice(0, 2).toUpperCase() || 'JD'}</button></div></header>

        <div className="page-content">
          <section className="page-heading"><div><div className="eyebrow">MONDAY, NOVEMBER 23, 2026</div><h1>{pageCopy[activeTab][0]}<span>.</span></h1><p>{pageCopy[activeTab][1]}</p></div>{activeTab !== 'Budgets' && <button className="primary-button" onClick={() => setModal({ type: 'transaction' })}><Icon name="plus" size={17} /> Add transaction</button>}</section>

          {(activeTab === 'Overview' || activeTab === 'Reports') && <section className="metric-grid" aria-label="Financial summary">
            <article className="metric-card balance-card"><div className="metric-top"><span>Total balance</span><span className="metric-icon balance-icon"><Icon name="wallet" size={17} /></span></div><div className="metric-value">{money(totals.income - totals.expense)}</div><div className="metric-foot"><span className="trend-pill">↗ 8.2%</span><span>vs. last month</span><svg className="mini-spark" viewBox="0 0 105 36" aria-label="Balance trend"><path d="M1 29 13 25 25 27 37 15 49 19 61 10 73 15 85 5 104 8" /></svg></div></article>
            <article className="metric-card"><div className="metric-top"><span>Income</span><span className="metric-icon income-icon"><Icon name="arrow" size={16} /></span></div><div className="metric-value">{money(totals.income)}</div><div className="metric-foot"><span className="metric-caption">This month</span><span className="metric-note">{transactions.filter((t) => t.type === 'income').length} sources recorded</span></div></article>
            <article className="metric-card"><div className="metric-top"><span>Expenses</span><span className="metric-icon expense-icon"><Icon name="arrow" size={16} /></span></div><div className="metric-value">{money(totals.expense)}</div><div className="metric-foot"><span className="metric-caption">This month</span><span className="metric-note">Across {Object.keys(spentByCategory).length} categories</span></div></article>
            <article className="metric-card"><div className="metric-top"><span>Left to budget</span><span className="metric-icon budget-icon"><Icon name="chart" size={17} /></span></div><div className="metric-value">{money(remaining)}</div><div className="metric-foot"><span className="metric-caption">Monthly plan</span><span className="metric-note">{Math.max(0, 100 - Math.round(spent / Object.values(budgets).reduce((a, b) => a + Number(b), 0) * 100))}% available</span></div></article>
          </section>}

          {(activeTab === 'Overview' || activeTab === 'Budgets' || activeTab === 'Reports') && <section className={`overview-grid ${activeTab === 'Budgets' ? 'budgets-view-grid' : ''}`}>
            {activeTab !== 'Budgets' && <article className="panel spending-panel"><div className="panel-heading"><div><h2>Spending overview</h2><p>Your activity across the month</p></div><select aria-label="Chart timeframe" className="period-select"><option>Last 30 days</option><option>This year</option></select></div><div className="chart-legend"><span><i className="legend-dot income-dot" />Income</span><span><i className="legend-dot expense-dot" />Expenses</span></div><div className="chart-wrap"><div className="chart-y-labels"><span>₹5k</span><span>₹3.5k</span><span>₹2k</span><span>₹0</span></div><svg className="main-chart" viewBox="0 0 680 190" preserveAspectRatio="none" role="img" aria-label="Income and spending chart"><defs><linearGradient id="incomeFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#b8d9cb" stopOpacity=".42" /><stop offset="1" stopColor="#b8d9cb" stopOpacity="0" /></linearGradient></defs><path className="chart-gridline" d="M0 12H680M0 65H680M0 118H680M0 171H680" /><path className="chart-area" d="M0 96 C30 90 38 62 70 70 S113 94 140 76 S183 38 210 55 S250 66 280 48 S320 68 350 59 S392 26 420 41 S460 62 490 40 S530 49 560 34 S620 39 680 18 V171H0Z" /><path className="income-line" d="M0 96 C30 90 38 62 70 70 S113 94 140 76 S183 38 210 55 S250 66 280 48 S320 68 350 59 S392 26 420 41 S460 62 490 40 S530 49 560 34 S620 39 680 18" /><path className="expense-line" d="M0 147 C28 137 48 145 70 125 S114 139 140 119 S184 132 210 110 S252 128 280 106 S324 117 350 108 S392 130 420 98 S462 117 490 94 S532 107 560 87 S622 102 680 72" /></svg></div><div className="chart-x-labels"><span>Oct 25</span><span>Nov 01</span><span>Nov 08</span><span>Nov 15</span><span>Nov 23</span></div></article>}

            <article className={`panel budgets-panel ${activeTab === 'Budgets' ? 'all-budgets-panel' : ''}`}><div className="panel-heading"><div><h2>Monthly budgets</h2><p>Keep your goals in sight</p></div>{activeTab !== 'Budgets' && <button className="text-button" onClick={() => setActiveTab('Budgets')}>See all <Icon name="chevron" size={14} /></button>}</div><div className="budget-list">{(activeTab === 'Budgets' ? categories : ['Food', 'Shopping', 'Transport', 'Bills']).map((category) => {
              const value = spentByCategory[category] || 0
              const limit = Number(budgets[category] || 0)
              const pct = Math.min(100, Math.round(value / limit * 100))
              return <div className="budget-item" key={category}><div className="budget-label"><span><i className={`category-dot dot-${category.toLowerCase()}`} />{category}</span><span><strong>{money(value)}</strong><small> / {money(limit)}</small></span></div><div className="progress-track"><div className={`progress-fill ${pct >= 85 ? 'near-limit' : ''}`} style={{ width: `${pct}%` }} /></div></div>
            })}</div><button className="budget-footer" onClick={() => setModal({ type: 'budgets' })}>Adjust category budgets <Icon name="arrow" size={14} /></button></article>
          </section>}

          {(activeTab === 'Overview' || activeTab === 'Transactions') && <section className="panel transactions-panel"><div className="panel-heading transactions-heading"><div><h2>{activeTab === 'Transactions' ? 'All transactions' : 'Recent transactions'}</h2><p>{activeTab === 'Transactions' ? 'Every income and expense in one place' : 'Your latest money moves'}</p></div>{activeTab === 'Overview' && <button className="text-button" onClick={() => setActiveTab('Transactions')}>View all <Icon name="chevron" size={14} /></button>}</div><div className="table-tools"><label className="search-box"><Icon name="search" size={17} /><input placeholder="Search transactions" value={query} onChange={(event) => setQuery(event.target.value)} /></label><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter by category"><option>All categories</option>{[...new Set([...categories, 'Salary', 'Freelance'])].map((category) => <option key={category}>{category}</option>)}</select><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter by type"><option>All types</option><option value="income">Income</option><option value="expense">Expense</option></select></div><div className="transaction-table-wrap"><table className="transaction-table"><thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th>ACCOUNT</th><th className="amount-col">AMOUNT</th><th aria-label="Actions" /></tr></thead><tbody>{filteredTransactions.slice(0, activeTab === 'Transactions' ? undefined : 6).map((item) => <tr key={item.id}><td><div className="transaction-name"><span className={`transaction-avatar ${item.type}`}>{item.type === 'income' ? '↙' : item.category.slice(0, 1)}</span><strong>{item.title}</strong></div></td><td><span className="category-label">{item.category}</span></td><td className="date-cell">{new Date(`${item.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td><td className="account-cell">{item.account}</td><td className={`amount-cell ${item.type}`}>{item.type === 'income' ? '+' : '−'}{money(item.amount)}</td><td><div className="row-actions"><button title="Edit transaction" aria-label={`Edit ${item.title}`} onClick={() => setModal({ type: 'transaction', item })}>Edit</button><button title="Delete transaction" aria-label={`Delete ${item.title}`} onClick={() => deleteTransaction(item.id)}><Icon name="close" size={15} /></button></div></td></tr>)}</tbody></table>{filteredTransactions.length === 0 && <div className="empty-state">No transactions match these filters.</div>}</div><div className="table-bottom"><span>Showing {activeTab === 'Transactions' ? filteredTransactions.length : Math.min(filteredTransactions.length, 6)} of {filteredTransactions.length} transactions</span>{activeTab === 'Overview' && <button onClick={() => setActiveTab('Transactions')}>All transactions <Icon name="arrow" size={13} /></button>}</div></section>}

          {(activeTab === 'Overview' || activeTab === 'Reports') && <section className="insight-strip"><div className="insight-symbol"><Icon name="sparkle" size={20} /></div><div className="insight-copy"><span className="insight-kicker">A NOTE FROM YOUR MONEY COACH</span><p>{spentByCategory.Food ? `You’ve spent ${money(spentByCategory.Food)} on food this month. ` : 'Start tracking your expenses to get tailored suggestions. '}{spentByCategory.Food > (budgets.Food || 500) * 0.7 ? 'You’re close to your food budget. Planning a few meals ahead could help keep the rest of the month comfortable.' : 'You’re on track with your food budget. Nice work keeping your everyday spending in check.'}</p></div>{activeTab === 'Overview' && <button onClick={() => setActiveTab('Reports')}>Explore insights <Icon name="arrow" size={14} /></button>}</section>}
          <footer className="page-footer"><span>Made for a clearer kind of money.</span><span>Your data stays in this browser</span></footer>
        </div>
      </main>

      {modal?.type === 'transaction' && <div className="modal-backdrop" onClick={() => setModal(null)}><form className="modal-card" onSubmit={saveTransaction} onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">YOUR MONEY, YOUR CALL</span><h2>{modal.item ? 'Edit transaction' : 'Add transaction'}</h2></div><button type="button" className="icon-button" onClick={() => setModal(null)} aria-label="Close"><Icon name="close" /></button></div><label>Transaction name<input name="title" required defaultValue={modal.item?.title} placeholder="e.g. Weekly groceries" /></label><div className="form-grid"><label>Type<select name="type" defaultValue={modal.item?.type || 'expense'}><option value="expense">Expense</option><option value="income">Income</option></select></label><label>Amount<input name="amount" type="number" min="0.01" step="0.01" required defaultValue={modal.item?.amount} placeholder="0.00" /></label></div><div className="form-grid"><label>Category<select name="category" defaultValue={modal.item?.category || 'Food'}>{[...categories, 'Salary', 'Freelance'].map((category) => <option key={category}>{category}</option>)}</select></label><label>Date<input name="date" type="date" required defaultValue={modal.item?.date || new Date().toISOString().slice(0, 10)} /></label></div><label>Account or income source<input name="account" defaultValue={modal.item?.account} placeholder="e.g. Main account, freelance" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(null)}>Cancel</button><button className="primary-button" type="submit">Save transaction</button></div></form></div>}

      {modal?.type === 'budgets' && <div className="modal-backdrop" onClick={() => setModal(null)}><form className="modal-card budget-modal" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const next = Object.fromEntries(categories.map((category) => [category, Number(data.get(category)) || 0])); persistBudgets(next); setModal(null) }} onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">A PLAN THAT FEELS LIKE YOU</span><h2>Monthly budgets</h2></div><button type="button" className="icon-button" onClick={() => setModal(null)} aria-label="Close"><Icon name="close" /></button></div><div className="budget-form-grid">{categories.map((category) => <label key={category}>{category}<div className="currency-input"><span>₹</span><input name={category} type="number" min="0" step="10" defaultValue={budgets[category]} /></div></label>)}</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(null)}>Cancel</button><button className="primary-button" type="submit">Save budgets</button></div></form></div>}

      {authOpen && <div className="modal-backdrop" onClick={() => currentUser && setAuthOpen(false)}><div className="modal-card auth-card" onClick={(event) => event.stopPropagation()}>{currentUser ? <><div className="modal-header"><div><span className="eyebrow">ACCOUNT</span><h2>{currentUser.name}</h2></div><button type="button" className="icon-button" onClick={() => setAuthOpen(false)} aria-label="Close"><Icon name="close" /></button></div><p className="auth-description">Signed in as {currentUser.email}. This prototype keeps account data in this browser only.</p><button className="secondary-button sign-out-button" type="button" onClick={signOut}>Sign out</button></> : <form onSubmit={submitAuth}><div className="modal-header"><div><span className="eyebrow">LEDGERLY LOCAL PREVIEW</span><h2>{authMode === 'login' ? 'Sign in to your account' : 'Create your account'}</h2></div></div><p className="auth-description">{authMode === 'login' ? 'Sign in with an account you created on this browser. New here? Create an account first.' : 'Create a local preview account to open your finance dashboard. Your password is stored as a hash on this device.'}</p>{authMode === 'register' && <label>Your name<input name="name" type="text" required autoComplete="name" placeholder="Name" /></label>}<label>Email address<input name="email" type="email" required autoComplete="username" placeholder="you@example.com" /></label><label>Password<input name="password" type="password" required minLength="8" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} placeholder="At least 8 characters" /></label>{authMode === 'register' && <label>Confirm password<input name="confirmPassword" type="password" required minLength="8" autoComplete="new-password" placeholder="Enter the password again" /></label>}{authError && <p className="auth-error" role="alert">{authError}</p>}<p className="auth-security-note">Local prototype only. This is not secure production authentication and does not sync accounts between devices.</p><button className="primary-button auth-submit" type="submit" disabled={authBusy}><Icon name="user" size={16} />{authBusy ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'}</button><button type="button" className="auth-switch" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError('') }}>{authMode === 'login' ? 'New user? Create an account' : 'Already registered? Sign in'}</button></form>}</div></div>}
    </div>
  )
}

export default App
