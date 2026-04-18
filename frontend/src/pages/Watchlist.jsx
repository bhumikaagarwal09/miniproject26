import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Trash2, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import api from '../services/api';
import emptyWatchlistImage from '../assets/empty_watchlist_1776524281664.png';

const Watchlist = () => {
  const [watchlist, setWatchlist] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    setLoading(true);
    try {
      const response = await api.get('/watchlist');
      setWatchlist(response.data);
    } catch (err) {
      console.warn('API error, loading mock watchlist.');
      // Mock data for UI demonstration
      setWatchlist([
        { id: 1, symbol: 'AAPL', name: 'Apple Inc.', price: 173.50, change: 1.25, isNasdaq: true },
        { id: 2, symbol: 'RELIANCE', name: 'Reliance Industries', price: 2950.40, change: -0.85, isNasdaq: false },
        { id: 3, symbol: 'NVDA', name: 'NVIDIA Corp.', price: 890.10, change: 3.45, isNasdaq: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setAdding(true);
    try {
      const response = await api.post('/watchlist', { symbol: searchQuery.toUpperCase() });
      if (response.data) {
        setWatchlist([...watchlist, response.data]);
      }
    } catch (err) {
      console.warn('API error during add, using mock update.');
      const mockNewStock = {
        id: Date.now(),
        symbol: searchQuery.toUpperCase(),
        name: searchQuery.toUpperCase() + ' (Mock)',
        price: (Math.random() * 500).toFixed(2),
        change: (Math.random() * 5 - 2.5).toFixed(2),
        isNasdaq: Math.random() > 0.5
      };
      setWatchlist([...watchlist, mockNewStock]);
    } finally {
      setSearchQuery('');
      setAdding(false);
    }
  };

  const handleRemoveStock = async (id) => {
    try {
      await api.delete(`/watchlist/${id}`);
      setWatchlist(watchlist.filter(stock => stock.id !== id));
    } catch (err) {
      console.warn('API error during delete, using mock update.');
      setWatchlist(watchlist.filter(stock => stock.id !== id));
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="page-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1>Watchlist</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Track your favorite NSE and NASDAQ stocks.</p>
        </div>
        
        <form onSubmit={handleAddStock} style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '400px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
            <input 
              type="text" 
              placeholder="Search symbol (e.g. AAPL, INF)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.5rem', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)' }}
            />
          </div>
          <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={adding || !searchQuery.trim()}>
            {adding ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
            <span>Add</span>
          </button>
        </form>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '4rem 0' }}>
          <RefreshCw className="animate-spin" size={32} color="var(--color-text-light)" />
        </div>
      ) : watchlist.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.4)', borderRadius: 'var(--radius-xl)', border: '1px dashed var(--color-border)' }}
        >
          <img src={emptyWatchlistImage} alt="Empty Watchlist" style={{ width: '250px', marginBottom: '2rem', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Your watchlist is empty</h3>
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: '400px' }}>
            Start building your portfolio by searching for NSE or NASDAQ stock symbols above.
          </p>
        </motion.div>
      ) : (
        <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          <AnimatePresence>
            {watchlist.map(stock => (
              <motion.div
                key={stock.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className="glass-card"
                style={{ position: 'relative', overflow: 'hidden' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stock.symbol}</h3>
                      <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'var(--color-border)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        {stock.isNasdaq ? 'NASDAQ' : 'NSE'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{stock.name}</span>
                  </div>
                  <button 
                    onClick={() => handleRemoveStock(stock.id)}
                    style={{ color: 'var(--color-text-light)', padding: '0.4rem', borderRadius: 'var(--radius-md)' }}
                    onMouseOver={(e) => { e.currentTarget.style.color = 'var(--color-sell)'; e.currentTarget.style.background = 'var(--color-sell-bg)' }}
                    onMouseOut={(e) => { e.currentTarget.style.color = 'var(--color-text-light)'; e.currentTarget.style.background = 'none' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1.5rem' }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                    {stock.isNasdaq ? '$' : '₹'}{stock.price}
                  </div>
                  <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600,
                    color: stock.change >= 0 ? 'var(--color-buy)' : 'var(--color-sell)',
                    background: stock.change >= 0 ? 'var(--color-buy-bg)' : 'var(--color-sell-bg)',
                    padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-md)'
                  }}>
                    {stock.change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {stock.change > 0 ? '+' : ''}{stock.change}%
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

export default Watchlist;
