// services/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify on startup
transporter.verify()
  .then(() => console.log('[Email] ✅ Gmail transporter ready'))
  .catch((err) => console.error('[Email] ❌ Transporter error:', err.message));

// ═══════════════════════════════════════════
// SELL Alert Email
// ═══════════════════════════════════════════
const sendSellAlertEmail = async ({ to, symbol, buyPrice, currentPrice, targetSellPrice, profitPercent, aiNote }) => {
  try {
    const mailOptions = {
      from: `"Algo Trading Bot 🤖" <${process.env.EMAIL_USER}>`,
      to,
      subject: `🚀 SELL ALERT: ${symbol} — Target Reached! (+${profitPercent}%)`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #22c55e; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">🚀 SELL ALERT</h1>
            <p style="color: #dcfce7; margin: 5px 0 0; font-size: 18px;">${symbol}</p>
          </div>
          <div style="padding: 25px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Buy Price</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${buyPrice}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Current Price</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #22c55e; font-weight: bold; font-size: 18px;">₹${currentPrice}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Target Price</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${targetSellPrice}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Profit</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #22c55e; font-weight: bold; font-size: 18px;">+${profitPercent}%</td>
              </tr>
            </table>
            <div style="margin-top: 20px; padding: 15px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #22c55e;">
              <p style="margin: 0; font-weight: bold;">🤖 AI Analysis:</p>
              <p style="margin: 8px 0 0; color: #374151; line-height: 1.5;">${aiNote || 'Target price reached. Consider selling.'}</p>
            </div>
            <p style="margin-top: 20px; color: #9ca3af; font-size: 12px; text-align: center;">
              Algo Trading Bot • ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] ✅ SELL email sent → ${to} for ${symbol}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] ❌ SELL email failed:`, error.message);
    return { success: false, error: error.message };
  }
};

// ═══════════════════════════════════════════
// DROP Alert Email
// ═══════════════════════════════════════════
const sendDropAlertEmail = async ({ to, symbol, buyPrice, currentPrice, dropPercent, aiNote }) => {
  try {
    const mailOptions = {
      from: `"Algo Trading Bot 🤖" <${process.env.EMAIL_USER}>`,
      to,
      subject: `🔴 DROP ALERT: ${symbol} — Down ${dropPercent}%!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #ef4444; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">🔴 DROP ALERT</h1>
            <p style="color: #fecaca; margin: 5px 0 0; font-size: 18px;">${symbol}</p>
          </div>
          <div style="padding: 25px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Buy Price</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${buyPrice}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Current Price</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #ef4444; font-weight: bold; font-size: 18px;">₹${currentPrice}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Drop</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #ef4444; font-weight: bold; font-size: 18px;">-${dropPercent}%</td>
              </tr>
            </table>
            <div style="margin-top: 20px; padding: 15px; background: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444;">
              <p style="margin: 0; font-weight: bold;">🤖 AI Analysis:</p>
              <p style="margin: 8px 0 0; color: #374151; line-height: 1.5;">${aiNote || 'Significant price drop detected. Review your position.'}</p>
            </div>
            <p style="margin-top: 20px; color: #9ca3af; font-size: 12px; text-align: center;">
              Algo Trading Bot • ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] ✅ DROP email sent → ${to} for ${symbol}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] ❌ DROP email failed:`, error.message);
    return { success: false, error: error.message };
  }
};

// ═══════════════════════════════════════════
// Daily Summary Email
// ═══════════════════════════════════════════
const sendDailySummaryEmail = async ({ to, conditions, aiCommentary }) => {
  try {
    let tableRows = '';
    conditions.forEach((c) => {
      const pnl = c.lastCheckedPrice
        ? parseFloat(((c.lastCheckedPrice - c.buyPrice) / c.buyPrice * 100).toFixed(2))
        : null;
      const pnlColor = pnl === null ? '#6b7280' : pnl > 0 ? '#22c55e' : '#ef4444';
      const pnlDisplay = pnl === null ? 'N/A' : (pnl > 0 ? `+${pnl}%` : `${pnl}%`);
      const targetPrice = (c.buyPrice * (1 + c.targetProfitPercent / 100)).toFixed(2);

      tableRows += `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${c.symbol}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${c.buyPrice}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${c.lastCheckedPrice || 'N/A'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${targetPrice}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; color: ${pnlColor}; font-weight: bold;">${pnlDisplay}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            <span style="background: ${c.status === 'ACTIVE' ? '#dcfce7' : '#fef9c3'}; color: ${c.status === 'ACTIVE' ? '#166534' : '#854d0e'}; padding: 3px 10px; border-radius: 12px; font-size: 12px;">${c.status}</span>
          </td>
        </tr>
      `;
    });

    const mailOptions = {
      from: `"Algo Trading Bot 🤖" <${process.env.EMAIL_USER}>`,
      to,
      subject: `📊 Daily Portfolio Summary — ${new Date().toLocaleDateString('en-IN')}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; border: 2px solid #3b82f6; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">📊 Daily Portfolio Summary</h1>
            <p style="color: #dbeafe; margin: 5px 0 0;">${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div style="padding: 25px;">
            <h3 style="margin-top: 0; color: #1e3a5f;">Active Conditions: ${conditions.length}</h3>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                  <tr style="background: #f1f5f9;">
                    <th style="padding: 10px; text-align: left;">Symbol</th>
                    <th style="padding: 10px; text-align: right;">Buy</th>
                    <th style="padding: 10px; text-align: right;">Current</th>
                    <th style="padding: 10px; text-align: right;">Target</th>
                    <th style="padding: 10px; text-align: right;">P&L</th>
                    <th style="padding: 10px; text-align: center;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows || '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #9ca3af;">No active conditions</td></tr>'}
                </tbody>
              </table>
            </div>
            <div style="margin-top: 20px; padding: 15px; background: #eff6ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <p style="margin: 0; font-weight: bold;">🤖 AI Portfolio Commentary:</p>
              <p style="margin: 8px 0 0; color: #374151; line-height: 1.5;">${aiCommentary}</p>
            </div>
            <p style="margin-top: 20px; color: #9ca3af; font-size: 12px; text-align: center;">
              Algo Trading Bot • ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] ✅ Daily summary sent → ${to}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] ❌ Daily summary failed:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendSellAlertEmail,
  sendDropAlertEmail,
  sendDailySummaryEmail,
};