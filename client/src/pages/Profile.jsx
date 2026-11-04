import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import './Profile.css';

export default function Profile({ user, onUserChange }) {
  const [name, setName] = useState('');
  const [venmo, setVenmo] = useState('');
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Load the profile from the signed-in account
  useEffect(() => {
    setName(user?.displayName || '');
    setVenmo((user?.paymentHandle || '').replace(/^@/, ''));
  }, [user]);

  // Save profile information
  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);

    const cleanName = name.trim();
    const cleanVenmo = venmo.trim().replace(/^@/, '');

    if (!cleanName || !cleanVenmo) {
      setError('Please enter your name and Venmo handle.');
      return;
    }

    // Validate Venmo username
    if (!/^[A-Za-z0-9_-]{3,30}$/.test(cleanVenmo)) {
      setError('Please enter a valid Venmo username.');
      return;
    }

    const profile = {
      name: cleanName,
      venmo: cleanVenmo,
    };

    try {
      // Saved on the account, so riders in your group see the right handle
      const { user: updated } = await api.updateMe({ displayName: profile.name, paymentHandle: '@' + profile.venmo });
      onUserChange?.(updated);
      setName(cleanName);
      setVenmo(cleanVenmo);
      setEditing(false);
      setSaved(true);
    } catch {
      setError('Unable to save profile. Please try again.');
    }
  };

  const venmoLink = venmo
    ? `https://venmo.com/u/${encodeURIComponent(venmo)}`
    : '';

  return (
    <section className="profile-page">
      <div className="profile-header">
        <h1>My Profile</h1>
        <p className="muted">
          Manage your Rutgers ridesharing information.
        </p>
      </div>

      <div className="profile-card">

        {/* Profile Avatar */}
        <div className="profile-avatar">
          {name ? name.charAt(0).toUpperCase() : 'R'}
        </div>

        <h2>{name || 'Rutgers Student'}</h2>

        <p className="profile-subtitle">
          Rutgers Ridesharing Member
        </p>

        {saved && (
          <p className="profile-success" role="status">
            Profile updated successfully!
          </p>
        )}

        {error && (
          <p className="profile-error" role="alert">
            {error}
          </p>
        )}

        {!editing && name && venmo ? (
          <div className="profile-info">

            <div className="profile-field">
              <label>Full Name</label>
              <p>{name}</p>
            </div>

            <div className="profile-field">
              <label>Venmo Handle</label>
              <p>@{venmo}</p>
            </div>

            <a
              className="venmo-button"
              href={venmoLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Venmo Profile
            </a>

            <button
              type="button"
              className="edit-profile-button"
              onClick={() => {
                setEditing(true);
                setSaved(false);
              }}
            >
              Edit Profile
            </button>
          </div>
        ) : (
          <form
            className="profile-form"
            onSubmit={handleSave}
          >
            <div className="profile-field">
              <label htmlFor="profile-name">
                Full Name
              </label>

              <input
                id="profile-name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
              />
            </div>

            <div className="profile-field">
              <label htmlFor="profile-venmo">
                Venmo Handle
              </label>

              <div className="venmo-input">
                <span>@</span>

                <input
                  id="profile-venmo"
                  type="text"
                  placeholder="YourVenmoUsername"
                  value={venmo}
                  onChange={(e) =>
                    setVenmo(e.target.value)
                  }
                  autoCapitalize="none"
                  autoComplete="off"
                  maxLength={31}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="save-profile-button"
            >
              Save Profile
            </button>

            {editing && (
              <button
                type="button"
                className="cancel-profile-button"
                onClick={() => {
                  setName(user?.displayName || '');
                  setVenmo((user?.paymentHandle || '').replace(/^@/, ''));
                  setEditing(false);
                  setError('');
                }}
              >
                Cancel
              </button>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
