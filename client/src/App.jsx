import './App.css';
import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import {
  Car, ParkingSquare, LayoutDashboard, LogOut, User, Plus,
  CalendarDays, MapPin, CreditCard, ShieldCheck, Clock,
  CheckCircle, XCircle, Search, Menu, Trash2, QrCode
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL ? `${API_BASE_URL}/api` : '/api'
});
api.interceptors.request.use(config => {
  const token = localStorage.getItem('parkingToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('parkingUser')); }
    catch { return null; }
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  function logout() {
    localStorage.removeItem('parkingToken');
    localStorage.removeItem('parkingUser');
    setUser(null);
    navigate('/login');
  }

  function loginSuccess(data) {
    localStorage.setItem('parkingToken', data.token);
    localStorage.setItem('parkingUser', JSON.stringify(data.user));
    setUser(data.user);
    navigate('/dashboard');
  }

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand"><span className="brand-icon"><ParkingSquare /></span> ParkSmart</Link>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}><Menu /></button>
        <nav className={menuOpen ? 'nav open' : 'nav'}>
          {user ? <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/spots">Find Parking</Link>
            <Link to="/vehicles">My Vehicles</Link>
            <Link to="/bookings">My Bookings</Link>
            {user.role === 'admin' && <Link to="/admin">Admin</Link>}
            <button className="nav-logout" onClick={logout}><LogOut size={16}/> Logout</button>
          </> : <>
            <Link to="/">Home</Link>
            <Link to="/login">Login</Link>
            <Link className="nav-cta" to="/register">Get Started</Link>
          </>}
        </nav>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home user={user}/>} />
          <Route path="/login" element={<Auth mode="login" onSuccess={loginSuccess}/>} />
          <Route path="/register" element={<Auth mode="register" onSuccess={loginSuccess}/>} />
          <Route path="/dashboard" element={<Protected user={user}><Dashboard user={user}/></Protected>} />
          <Route path="/spots" element={<Protected user={user}><Spots/></Protected>} />
          <Route path="/vehicles" element={<Protected user={user}><Vehicles/></Protected>} />
          <Route path="/bookings" element={<Protected user={user}><Bookings/></Protected>} />
          <Route path="/admin" element={<Protected user={user}><Admin user={user}/></Protected>} />
          <Route path="*" element={<Home user={user}/>} />
        </Routes>
      </main>

      <footer>© 2026 ParkSmart · Smarter parking, simpler journeys.</footer>
    </div>
  );
}

function Protected({ user, children }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!user || !localStorage.getItem('parkingToken')) navigate('/login');
  }, [user, navigate]);
  return user ? children : <div className="loading">Please log in to continue...</div>;
}

function Home({ user }) {
  return (
    <div className="hero">
      <div className="hero-copy">
        <span className="eyebrow">SMART PARKING MANAGEMENT</span>
        <h1>Parking made <span>simple.</span><br/>Journeys made smarter.</h1>
        <p>Find available parking, reserve your spot, verify entry with QR codes and always remember where you parked.</p>
        <div className="hero-actions">
          <Link className="btn primary" to={user ? '/spots' : '/register'}>Find a Parking Spot <span>→</span></Link>
          <Link className="btn secondary" to={user ? '/dashboard' : '/login'}>Explore Dashboard</Link>
        </div>
        <div className="hero-points">
          <span><CheckCircle size={16}/> Live slot availability</span>
          <span><CheckCircle size={16}/> Easy booking</span>
          <span><CheckCircle size={16}/> QR entry</span>
        </div>
      </div>
      <div className="hero-visual">
        <div className="parking-illustration">
          <div className="illustration-top"><span>SMART PARKING</span><span className="live-dot">● LIVE</span></div>
          <div className="parking-grid">
            {['A01','A02','A03','A04','A05','A06'].map((s,i)=><div className={`parking-cell ${i===1||i===4?'occupied':''}`} key={s}><Car size={25}/><b>{s}</b><small>{i===1||i===4?'Occupied':'Available'}</small></div>)}
          </div>
          <div className="illustration-bottom"><span><i className="legend-free"/> Available</span><span><i className="legend-busy"/> Occupied</span></div>
        </div>
        <div className="float-card"><CheckCircle color="#16a36a"/><div><b>Booking confirmed</b><small>Your spot is reserved!</small></div></div>
      </div>
    </div>
  );
}

function Auth({ mode, onSuccess }) {
  const [form, setForm] = useState({ name:'', email:'', password:'', phone:'' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const register = mode === 'register';

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post(`/auth/${register?'register':'login'}`, form);
      onSuccess(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to connect to server. Please try again.');
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-icon"><ParkingSquare/></div>
        <span className="eyebrow">{register?'CREATE YOUR ACCOUNT':'WELCOME BACK'}</span>
        <h2>{register?'Join ParkSmart':'Sign in'}</h2>
        <p>{register?'Create an account to reserve your parking spot.':'Log in to manage your parking.'}</p>
        {register && <label>Full name<input required placeholder="Your name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>}
        <label>Email address<input required type="email" placeholder="you@example.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
        {register && <label>Phone number<input placeholder="Phone number" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>}
        <label>Password<input required minLength="6" type="password" placeholder="At least 6 characters" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
        {error && <div className="error-msg">{error}</div>}
        <button className="btn primary full" disabled={loading}>{loading?'Please wait...':register?'Create Account':'Login'}</button>
        <div className="auth-switch">{register?'Already have an account?':'New to ParkSmart?'} <Link to={register?'/login':'/register'}>{register?'Login':'Create account'}</Link></div>
      </form>
    </div>
  );
}

function Dashboard({ user }) {
  const [spots,setSpots] = useState([]);
  const [bookings,setBookings] = useState([]);
  const [vehicles,setVehicles] = useState([]);
  const [error,setError] = useState('');

  useEffect(()=>{
    Promise.all([api.get('/spots'),api.get('/bookings'),api.get('/vehicles')])
      .then(([s,b,v])=>{setSpots(s.data);setBookings(b.data);setVehicles(v.data);})
      .catch(()=>setError('Unable to load dashboard information.'));
  },[]);

  const active = bookings.filter(b=>['confirmed','active'].includes(b.status));
  return (
    <>
      <PageHeading title={`Welcome, ${user?.name?.split(' ')[0] || 'there'}!`} subtitle="Here's what's happening with your parking."/>
      {error&&<div className="error-msg">{error}</div>}
      <div className="stats-grid">
        <Stat icon={<ParkingSquare/>} label="Total parking spots" value={spots.length}/>
        <Stat icon={<CheckCircle/>} label="Available spots" value={spots.filter(s=>s.status==='available').length}/>
        <Stat icon={<CalendarDays/>} label="My bookings" value={bookings.length}/>
        <Stat icon={<Car/>} label="My vehicles" value={vehicles.length}/>
      </div>
      <div className="section-heading"><div><h2>Quick actions</h2><p>Manage your parking in one place.</p></div></div>
      <div className="quick-grid">
        <Quick icon={<Search/>} title="Find parking" desc="Explore available slots" to="/spots"/>
        <Quick icon={<Car/>} title="Manage vehicles" desc="Add or remove vehicles" to="/vehicles"/>
        <Quick icon={<CalendarDays/>} title="My bookings" desc="View reservations and QR codes" to="/bookings"/>
      </div>
      <div className="section-heading"><div><h2>Upcoming bookings</h2><p>Your active reservations.</p></div><Link to="/bookings">View all →</Link></div>
      {active.length===0?<Empty text="No active bookings yet. Find a parking spot to get started."/>:
        <div className="booking-list">{active.slice(0,3).map(b=><BookingCard key={b._id} booking={b}/>)}</div>}
    </>
  );
}

function Stat({icon,label,value}) {
  return <div className="stat-card"><div className="stat-icon">{icon}</div><div><strong>{value}</strong><span>{label}</span></div></div>;
}

function Quick({icon,title,desc,to}) {
  return <Link to={to} className="quick-card"><div className="quick-icon">{icon}</div><h3>{title}</h3><p>{desc}</p><span className="quick-arrow">→</span></Link>;
}

function PageHeading({title,subtitle}) {
  return <div className="page-heading"><div><span className="eyebrow">PARKSMART</span><h1>{title}</h1><p>{subtitle}</p></div></div>;
}

function Spots() {
  const [spots,setSpots] = useState([]);
  const [vehicles,setVehicles] = useState([]);
  const [vehicleId,setVehicleId] = useState('');
  const [startTime,setStartTime] = useState('');
  const [endTime,setEndTime] = useState('');
  const [filter,setFilter] = useState('All');
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  const [selected,setSelected] = useState(null);
  const navigate = useNavigate();

  async function load() {
    try {
      const [s,v] = await Promise.all([api.get('/spots'),api.get('/vehicles')]);
      setSpots(s.data);setVehicles(v.data);
      if (!vehicleId && v.data.length) setVehicleId(v.data[0]._id);
    } catch { setError('Unable to load parking information.'); }
    finally { setLoading(false); }
  }
  useEffect(()=>{load();},[]);

  const chosenVehicle = vehicles.find(v=>v._id===vehicleId);
  const filtered = spots.filter(s=>filter==='All'||s.vehicleType===filter);

  async function book() {
    setError('');setMessage('');
    if (!vehicleId) return setError('Please add a vehicle first.');
    if (!startTime||!endTime) return setError('Choose your start and end times.');
    try {
      const {data}=await api.post('/bookings',{vehicleId,spotId:selected._id,startTime:new Date(startTime).toISOString(),endTime:new Date(endTime).toISOString()});
      setMessage(`Booking confirmed! Code: ${data.booking.bookingCode}`);
      setSelected(null);load();
      setTimeout(()=>navigate('/bookings'),1200);
    } catch(err) {setError(err.response?.data?.message||'Booking failed.');}
  }

  return <>
    <PageHeading title="Find your parking spot" subtitle="Choose a slot that matches your vehicle and schedule."/>
    <div className="filter-row">
      <div className="filter-buttons">{['All','2W','4W','EV'].map(f=><button key={f} className={filter===f?'filter active':'filter'} onClick={()=>setFilter(f)}>{f==='All'?'All vehicles':f}</button>)}</div>
      <span className="muted">{spots.filter(s=>s.status==='available').length} spots available</span>
    </div>
    {error&&<div className="error-msg">{error}</div>}{message&&<div className="success-msg">{message}</div>}
    {loading?<div className="loading">Loading parking spots...</div>:<>
      <div className="slot-legend"><span><i className="legend-free"/> Available</span><span><i className="legend-busy"/> Occupied / unavailable</span></div>
      <div className="slot-grid">{filtered.map(s=><button key={s._id} disabled={s.status!=='available'} onClick={()=>setSelected(s)} className={`slot-card ${s.status!=='available'?'unavailable':''} ${selected?._id===s._id?'selected':''}`}>
        <Car size={25}/><b>{s.spotNumber}</b><span>{s.vehicleType} · ₹{s.pricePerHour}/hr</span><small>{s.status==='available'?'Available':s.status}</small>
      </button>)}</div>
      {filtered.length===0&&<Empty text="No parking spots found for this category."/>}
    </>}
    {selected&&<div className="modal-backdrop"><div className="modal">
      <button className="modal-close" onClick={()=>setSelected(null)}>×</button>
      <span className="eyebrow">RESERVE YOUR SPACE</span><h2>Book {selected.spotNumber}</h2>
      <p>{selected.floor} · Section {selected.section} · ₹{selected.pricePerHour}/hour</p>
      <label>Select vehicle<select value={vehicleId} onChange={e=>setVehicleId(e.target.value)}><option value="">Choose vehicle</option>{vehicles.map(v=><option key={v._id} value={v._id}>{v.vehicleNumber} ({v.vehicleType})</option>)}</select></label>
      {vehicles.length===0&&<p className="error-msg">Please add a vehicle before booking. <Link to="/vehicles">Add vehicle</Link></p>}
      <label>Start time<input type="datetime-local" value={startTime} onChange={e=>setStartTime(e.target.value)}/></label>
      <label>End time<input type="datetime-local" value={endTime} onChange={e=>setEndTime(e.target.value)}/></label>
      <button className="btn primary full" disabled={!chosenVehicle||vehicles.length===0} onClick={book}>Confirm booking</button>
      {error&&<div className="error-msg">{error}</div>}
    </div></div>}
  </>;
}

function Vehicles() {
  const [vehicles,setVehicles]=useState([]);
  const [form,setForm]=useState({vehicleNumber:'',vehicleType:'2W',vehicleName:''});
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');

  async function load(){try{const {data}=await api.get('/vehicles');setVehicles(data);}catch{setError('Unable to load vehicles.');}}
  useEffect(()=>{load();},[]);

  async function add(e){
    e.preventDefault();setError('');setMessage('');
    try{await api.post('/vehicles',form);setForm({vehicleNumber:'',vehicleType:'2W',vehicleName:''});setMessage('Vehicle added successfully.');load();}
    catch(err){setError(err.response?.data?.message||'Unable to add vehicle.');}
  }
  async function remove(id){
    if(!window.confirm('Delete this vehicle?'))return;
    try{await api.delete(`/vehicles/${id}`);load();}
    catch(err){setError(err.response?.data?.message||'Unable to delete vehicle.');}
  }

  return <>
    <PageHeading title="My vehicles" subtitle="Register your vehicles before booking a parking spot."/>
    <div className="two-column">
      <form className="panel form-panel" onSubmit={add}><h2><Plus size={20}/> Add a vehicle</h2>
        <label>Vehicle number<input required placeholder="e.g. TN 37 AB 1234" value={form.vehicleNumber} onChange={e=>setForm({...form,vehicleNumber:e.target.value.toUpperCase()})}/></label>
        <label>Vehicle type<select value={form.vehicleType} onChange={e=>setForm({...form,vehicleType:e.target.value})}><option value="2W">Two wheeler</option><option value="4W">Four wheeler</option><option value="EV">Electric vehicle</option></select></label>
        <label>Vehicle name / model<input placeholder="e.g. Honda Activa" value={form.vehicleName} onChange={e=>setForm({...form,vehicleName:e.target.value})}/></label>
        {error&&<div className="error-msg">{error}</div>}{message&&<div className="success-msg">{message}</div>}
        <button className="btn primary full">Add vehicle</button>
      </form>
      <div className="panel"><h2>Registered vehicles ({vehicles.length})</h2>
        {vehicles.length===0?<Empty text="No vehicles added yet."/>:vehicles.map(v=><div className="vehicle-row" key={v._id}><div className="vehicle-icon"><Car/></div><div className="grow"><b>{v.vehicleNumber}</b><span>{v.vehicleName||'My vehicle'} · {v.vehicleType}</span></div><button className="icon-button danger" onClick={()=>remove(v._id)} title="Delete"><Trash2 size={17}/></button></div>)}
      </div>
    </div>
  </>;
}

function Bookings() {
  const [bookings,setBookings]=useState([]);
  const [error,setError]=useState('');
  const [selected,setSelected]=useState(null);

  async function load(){try{const {data}=await api.get('/bookings');setBookings(data);}catch{setError('Unable to load bookings.');}}
  useEffect(()=>{load();},[]);

  async function cancel(id){
    if(!window.confirm('Cancel this booking?'))return;
    try{await api.patch(`/bookings/${id}/cancel`);load();}
    catch(err){setError(err.response?.data?.message||'Unable to cancel booking.');}
  }
  async function pay(id){
    try{const {data}=await api.post(`/bookings/${id}/pay`);alert(`${data.message}\nBooking: ${data.receipt.bookingCode}\nAmount: ₹${data.receipt.amount}`);load();}
    catch(err){setError(err.response?.data?.message||'Payment failed.');}
  }

  return <>
    <PageHeading title="My bookings" subtitle="Your parking reservations, QR codes and payment receipts."/>
    {error&&<div className="error-msg">{error}</div>}
    {bookings.length===0?<Empty text="You haven't made any bookings yet."/>:
      <div className="booking-list">{bookings.map(b=><BookingCard key={b._id} booking={b} onCancel={()=>cancel(b._id)} onPay={()=>pay(b._id)} onQR={()=>setSelected(b)}/>)}</div>}
    {selected&&<div className="modal-backdrop"><div className="modal qr-modal"><button className="modal-close" onClick={()=>setSelected(null)}>×</button><span className="eyebrow">PARKING ENTRY PASS</span><h2>Your QR code</h2><div className="qr-box"><QRCodeSVG value={selected.bookingCode} size={190}/></div><b>{selected.bookingCode}</b><p>Show this code at the parking entry for verification.</p></div></div>}
  </>;
}

function BookingCard({booking:b,onCancel,onPay,onQR}) {
  const status=b.status||'confirmed';
  return <div className="booking-card">
    <div className="booking-main"><div className="booking-icon"><ParkingSquare/></div><div className="grow"><b>{b.parkingSpot?.spotNumber||'Parking spot'}</b><span>{b.vehicle?.vehicleNumber||'Vehicle'} · {b.vehicle?.vehicleType||''}</span><small>{new Date(b.startTime).toLocaleString()} – {new Date(b.endTime).toLocaleString()}</small></div><span className={`status ${status}`}>{status}</span></div>
    <div className="booking-details"><span><MapPin size={15}/>{b.findMyVehicle?.floor||b.parkingSpot?.floor}, Section {b.findMyVehicle?.section||b.parkingSpot?.section}</span><span><CreditCard size={15}/>₹{b.estimatedFee}</span><span>{b.paymentStatus==='paid'?'Paid':'Payment pending'}</span></div>
    <div className="booking-actions">
      {onQR&&<button className="btn secondary small" onClick={onQR}><QrCode size={15}/> Show QR</button>}
      {onPay&&b.paymentStatus!=='paid'&&status!=='cancelled'&&<button className="btn primary small" onClick={onPay}>Pay now</button>}
      {onCancel&&['confirmed','active'].includes(status)&&<button className="btn danger-btn small" onClick={onCancel}>Cancel</button>}
      <button className="btn secondary small" onClick={()=>alert(`Find your vehicle:\nFloor: ${b.findMyVehicle?.floor}\nSection: ${b.findMyVehicle?.section}\nSpot: ${b.findMyVehicle?.spotNumber}`)}><MapPin size={15}/> Find my vehicle</button>
    </div>
  </div>;
}

function Admin({user}) {
  const [stats,setStats]=useState(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    api.get('/admin/stats').then(r=>setStats(r.data)).catch(e=>setError(e.response?.data?.message||'Unable to load admin dashboard.'));
  },[]);
  if(user?.role!=='admin')return <div className="panel"><h2>Admin access required</h2><p>This page is available only to administrator accounts.</p></div>;
  return <>
    <PageHeading title="Admin dashboard" subtitle="Monitor parking operations and revenue."/>
    {error&&<div className="error-msg">{error}</div>}
    {!stats?<div className="loading">Loading statistics...</div>:<div className="stats-grid">
      <Stat icon={<User/>} label="Total users" value={stats.totalUsers}/>
      <Stat icon={<Car/>} label="Registered vehicles" value={stats.totalVehicles}/>
      <Stat icon={<ParkingSquare/>} label="Total parking spots" value={stats.totalSpots}/>
      <Stat icon={<CheckCircle/>} label="Available spots" value={stats.availableSpots}/>
      <Stat icon={<CalendarDays/>} label="Total bookings" value={stats.totalBookings}/>
      <Stat icon={<CreditCard/>} label="Total revenue" value={`₹${stats.revenue}`}/>
    </div>}
  </>;
}

function Empty({text}) {
  return <div className="empty-state"><ParkingSquare size={30}/><p>{text}</p></div>;
}

export default App;
