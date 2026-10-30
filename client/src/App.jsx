import { useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from './lib/api.js';
import SignIn from './pages/SignIn.jsx';
import PostTrip from './pages/PostTrip.jsx';
import Trips from './pages/Trips.jsx';
import TripDetail from './pages/TripDetail.jsx';

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const navigate = useNavigate();

  useEffect(() => { api.me().then((d) => setUser(d.user)).catch(() => setUser(null)); }, []);

  async function signOut() { await api.signOut(); setUser(null); navigate('/'); }

  if (user === undefined) return <main className="shell"><p>Loading…</p></main>;

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">Ru<span>There</span></Link>
        <nav>
          {user ? (<>
            <Link to="/trips">Trips</Link>
            <Link to="/post">Post a trip</Link>
            <button className="linkish" onClick={signOut}>Sign out ({user.email.split('@')[0]})</button>
          </>) : <Link to="/">Sign in</Link>}
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={user ? <Navigate to="/trips" /> : <SignIn onSignedIn={setUser} />} />
          <Route path="/trips" element={user ? <Trips /> : <Navigate to="/" />} />
          <Route path="/trips/:id" element={user ? <TripDetail user={user} /> : <Navigate to="/" />} />
          <Route path="/post" element={user ? <PostTrip /> : <Navigate to="/" />} />
        </Routes>
      </main>
      <footer>Split a ride with Rutgers students already headed where you're going.</footer>
    </div>
  );
}
