import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertCircle, Activity, Brain } from 'lucide-react';
import api from '../services/api';

const mockChartData = [
  { time: '09:30', price: 150 },
  { time: '10:00', price: 152 },
  { time: '10:30', price: 148 },
  { time: '11:00', price: 155 },
  { time: '11:30', price: 158 },
  { time: '12:00', price: 154 },
  { time: '12:30', price: 159 },
  { time: '13:00', price: 162 },
  { time: '13:30', price: 160 },
  { time: '14:00', price: 165 },
  { time: '14:30', price: 168 },
  { time: '15:00', price: 167 },
  { time: '15:30', price: 172 },
  { time: '16:00', price: 175 },
];

const mockDecisions = [
  { id: 1, stock: 'AAPL', action: 'BUY', reason: 'Strong upward momentum detected with RSI indicating oversold conditions.', confidence: 92, time: '10 mins ago' },
  { id: 2, stock: 'TSLA', action: 'SELL', reason: 'Resistance level breached, sentiment analysis shows negative trends.', confidence: 85, time: '1 hour ago' },
  { id: 3, stock: 'MSFT', action: 'HOLD', reason: 'Market consolidation phase. Waiting for clearer breakout signals.', confidence: 78, time: '3 hours ago' },
];

const Dashboard = () => {
  const [stats, setStats] = useState({ activeStocks: 12, totalAlerts: 34, profitPercentage: '+14.5%' });
  const [decisions, setDecisions] = useState(mockDecisions);
  const [chartData, setChartData] = useState(mockChartData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Attempt to fetch real data
        const [statsRes, decisionsRes] = await Promise.all([
          api.get('/dashboard/stats').catch(() => null),
          api.get('/dashboard/ai-decisions').catch(() => null)
        ]);

        if (statsRes?.data) setStats(statsRes.data);
        if (decisionsRes?.data) setDecisions(decisionsRes.data);
      } catch (err) {
        console.warn('Using mock data. Backend disconnected.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getActionBadge = (action) => {
    switch (action.toUpperCase()) {
      case 'BUY': return 'badge buy';
      case 'SELL': return 'badge sell';
      case 'HOLD': return 'badge hold';
      default: return 'badge hold';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants}
    >
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Welcome back. Here's your trading overview.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid-cards">
        <motion.div variants={itemVariants} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'var(--color-primary-light)', padding: '1rem', borderRadius: 'var(--radius-lg)', color: 'var(--color-primary)' }}>
            <Activity size={28} />
          </div>
          <div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Active Stocks</p>
            <h2 style={{ fontSize: '1.875rem' }}>{stats.activeStocks}</h2>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'var(--color-buy-bg)', padding: '1rem', borderRadius: 'var(--radius-lg)', color: 'var(--color-buy)' }}>
            <TrendingUp size={28} />
          </div>
          <div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Profit Overview</p>
            <h2 style={{ fontSize: '1.875rem', color: 'var(--color-buy)' }}>{stats.profitPercentage}</h2>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'var(--color-sell-bg)', padding: '1rem', borderRadius: 'var(--radius-lg)', color: 'var(--color-sell)' }}>
            <AlertCircle size={28} />
          </div>
          <div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Total Alerts</p>
            <h2 style={{ fontSize: '1.875rem' }}>{stats.totalAlerts}</h2>
          </div>
        </motion.div>
      </div>

      {/* Chart and AI Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem' }}>
        <motion.div variants={itemVariants} className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Portfolio Performance</h3>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Today</span>
          </div>
          <div style={{ width: '100%', height: '350px' }}>
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} dx={-10} domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip 
                  contentStyle={{ borderRadius: 'var(--radius-md)', border: 'none', boxShadow: 'var(--shadow-lg)' }}
                  labelStyle={{ color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}
                />
                <Area type="monotone" dataKey="price" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Brain color="var(--color-primary)" size={24} />
            <h3 style={{ fontSize: '1.25rem' }}>AI Insights</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto' }}>
            {decisions.map((decision) => (
              <motion.div 
                key={decision.id} 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.02 }}
                style={{ 
                  background: 'rgba(255,255,255,0.5)', 
                  padding: '1rem', 
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>{decision.stock}</span>
                  <span className={getActionBadge(decision.action)}>{decision.action}</span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                  {decision.reason}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                  <span>Confidence: <strong style={{ color: 'var(--color-text-main)' }}>{decision.confidence}%</strong></span>
                  <span>{decision.time}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
