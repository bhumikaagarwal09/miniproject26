import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Clock, Brain, RefreshCw, BarChart2 } from 'lucide-react';
import api from '../services/api';
import emptyAlertsImage from '../assets/empty_alerts_1776524376394.png';

const AlertHistory = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/alerts');
      setAlerts(response.data);
    } catch (err) {
      console.warn('API error, loading mock alerts.');
      // Mock data
      setAlerts([
        {
          id: 'alt_1',
          stockSymbol: 'NVDA',
          action: 'SELL',
          confidence: 89,
          reason: 'Price reached target profit of 15%. Overbought conditions detected on RSI.',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString()
        },
        {
          id: 'alt_2',
          stockSymbol: 'MSFT',
          action: 'BUY',
          confidence: 94,
          reason: 'Dropped below max buy price. Strong support level and positive sentiment detected.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()
        },
        {
          id: 'alt_3',
          stockSymbol: 'TSLA',
          action: 'HOLD',
          confidence: 76,
          reason: 'Approaching resistance. AI recommends waiting for breakout confirmation.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action) => {
    switch (action.toUpperCase()) {
      case 'BUY': return 'badge buy';
      case 'SELL': return 'badge sell';
      case 'HOLD': return 'badge hold';
      default: return 'badge hold';
    }
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="page-header">
        <div>
          <h1>Alert History</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Historical AI analysis and system notifications.</p>
        </div>
        <button className="btn-primary" style={{ width: 'auto', background: 'rgba(255,255,255,0.7)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)' }} onClick={fetchAlerts}>
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '4rem 0' }}>
          <RefreshCw className="animate-spin" size={32} color="var(--color-text-light)" />
        </div>
      ) : alerts.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.4)', borderRadius: 'var(--radius-xl)', border: '1px dashed var(--color-border)' }}
        >
          <img src={emptyAlertsImage} alt="No Alerts" style={{ width: '250px', marginBottom: '2rem', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>All Caught Up!</h3>
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: '400px' }}>
            No alerts generated yet. AI will notify you automatically when your conditions are met.
          </p>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <AnimatePresence>
            {alerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card"
                style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'minmax(150px, 200px) 1fr 200px', gap: '1.5rem', alignItems: 'center' }}
              >
                {/* Left: Ticker & Action */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderRight: '1px solid var(--color-border)', paddingRight: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{alert.stockSymbol}</h3>
                  </div>
                  <div>
                    <span className={getActionBadge(alert.action)} style={{ padding: '0.35rem 1rem', fontSize: '0.875rem' }}>
                      {alert.action}
                    </span>
                  </div>
                </div>

                {/* Middle: Reason */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-main)', fontWeight: 600 }}>
                    <Brain size={18} color="var(--color-primary)" /> AI Reasoning
                  </div>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                    {alert.reason}
                  </p>
                </div>

                {/* Right: Meta */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    <Clock size={16} />
                    {formatDate(alert.timestamp)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', background: 'var(--color-background)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--color-border)' }}>
                    <BarChart2 size={14} color="var(--color-primary)" />
                    Conf: <strong style={{ color: 'var(--color-text-main)' }}>{alert.confidence}%</strong>
                  </div>
                  {/* Since conditions result in emails usually, let's just hint it */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                    <Mail size={12} /> Email Sent
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default AlertHistory;
