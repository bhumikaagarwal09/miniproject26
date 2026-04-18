import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Eye, Settings, Bell, LogOut, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';

const Layout = () => {
  const navigate = useNavigate();
  // We'll mock a simple user name for now as pure jwt decoding is optional for the UI demo
  const [userName, setUserName] = useState('Investor');

  useEffect(() => {
    const name = localStorage.getItem('userName');
    if (name) setUserName(name);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    navigate('/login');
  };

  const navLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/watchlist', icon: Eye, label: 'Watchlist' },
    { to: '/conditions', icon: Settings, label: 'Conditions' },
    { to: '/alerts', icon: Bell, label: 'Alert History' },
  ];

  return (
    <div className="layout-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <Activity color="var(--color-primary)" size={28} />
          <span>AITrade</span>
        </div>

        <nav className="nav-links">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <link.icon size={20} />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="user-profile">
          <div className="avatar">{userName.charAt(0).toUpperCase()}</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{userName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Pro Member</div>
          </div>
          <button onClick={handleLogout} title="Logout" style={{ color: 'var(--color-text-muted)' }}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
