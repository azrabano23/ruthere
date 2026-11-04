import { useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from './lib/api.js';
import SignIn from './pages/SignIn.jsx';
import PostTrip from './pages/PostTrip.jsx';
import Trips from './pages/Trips.jsx';
import TripDetail from './pages/TripDetail.jsx';
import MyTrips from './pages/MyTrips.jsx';
import DriverDashboard from './pages/DriverDashboard.jsx';
import Profile from './pages/Profile.jsx';

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem('ruthere-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('ruthere-theme', theme); }, [theme]);
  function signedIn(nextUser) { setUser(nextUser); navigate(sessionStorage.getItem('ruthere-role') === 'driver' ? '/post' : '/trips'); }


  useEffect(() => { api.me().then((d) => setUser(d.user)).catch(() => setUser(null)); }, []);

  async function signOut() { await api.signOut(); setUser(null); navigate('/'); }

  if (user === undefined) return <main className="shell"><p>Loading…</p></main>;

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">Ru<span>There</span></Link>
        <nav>
          <button className="theme-toggle" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? '☾' : '☀'}<span>{theme === 'light' ? 'Dark' : 'Light'}</span></button>
          {user ? (<>
            <Link to="/trips">Trips</Link>
            <Link to="/my-trips">My trips</Link>
            <Link to="/driver-dashboard">Driver Dashboard</Link>
            <Link to="/post">Post a trip</Link>
            <Link to="/profile">Profile</Link>
            <button className="linkish" onClick={signOut}>Sign out ({user.email.split('@')[0]})</button>
          </>) : <a href="#signin">Sign in <span aria-hidden="true">↗</span></a>}
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={user ? <Navigate to="/trips" /> : <SignIn onSignedIn={signedIn} />} />
          <Route path="/trips" element={user ? <Trips /> : <Navigate to="/" />} />
          <Route path="/trips/:id" element={user ? <TripDetail user={user} onUserChange={setUser} /> : <Navigate to="/" />} />
          <Route path="/my-trips" element={user ? <MyTrips /> : <Navigate to="/" />} />
          <Route path="/profile" element={user ? <Profile user={user} onUserChange={setUser} /> : <Navigate to="/" />} />
          <Route path="/driver-dashboard" element={user ? <DriverDashboard /> : <Navigate to="/" />} />
          <Route path="/post" element={user ? <PostTrip /> : <Navigate to="/" />} />
        </Routes>
      </main>
      <footer>Made for the way Rutgers moves. · Campus and beyond.</footer>
    </div>
  );
}
