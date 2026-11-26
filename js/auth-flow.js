import { hashPasswordSHA256, encryptSensitivePayload } from "./crypto-vault.js";

let currentSession = null;
const registeredUsers = new Map();

const authActionsEl = document.getElementById("authActions");
const sessionBadgeEl = document.getElementById("sessionBadge");
const activeUserLabelEl = document.getElementById("activeUserLabel");

const loginModal = document.getElementById("loginModal");
const registerModal = document.getElementById("registerModal");
const legalModal = document.getElementById("legalModal");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const regNameInput = document.getElementById("regName");
const regEmailInput = document.getElementById("regEmail");
const regPasswordInput = document.getElementById("regPassword");
const regConfirmInput = document.getElementById("regConfirmPassword");
const acceptLegalCheckbox = document.getElementById("acceptLegal");
const btnSubmitRegister = document.getElementById("btnSubmitRegister");
const confirmMatchMsg = document.getElementById("confirmMatchMsg");

const ruleLengthEl = document.getElementById("rule-length");
const ruleLowerEl = document.getElementById("rule-lower");
const ruleUpperEl = document.getElementById("rule-upper");
const ruleNumberEl = document.getElementById("rule-number");
const ruleSymbolEl = document.getElementById("rule-symbol");

function toggleModal(modalEl, show) {
  modalEl.classList.toggle("hidden", !show);
}

function resetPasswordVisibilityIcons() {
  document.querySelectorAll(".btn-toggle-pwd").forEach((btn) => {
    const targetInput = document.getElementById(btn.dataset.targetPwd);
    if (targetInput) {
      targetInput.type = "password";
      btn.textContent = "👁";
    }
  });
}

function setRuleState(el, valid, text) {
  el.classList.toggle("is-valid", valid);
  el.textContent = `${valid ? "✓" : "✗"} ${text}`;
}

function evaluatePasswordRules(pwd) {
  const len = pwd.length;
  const hasExactLength = len === 10;
  const hasLower = /[a-z]/.test(pwd);
  const hasUpper = /[A-Z]/.test(pwd);
  const hasNumber = /\d/.test(pwd);
  const hasSymbol = /[^A-Za-z0-9]/.test(pwd);

  setRuleState(ruleLengthEl, hasExactLength, `Exactamente 10 caracteres (${len}/10)`);
  setRuleState(ruleLowerEl, hasLower, "Al menos una letra minúscula (a-z)");
  setRuleState(ruleUpperEl, hasUpper, "Al menos una letra mayúscula (A-Z)");
  setRuleState(ruleNumberEl, hasNumber, "Al menos un número (0-9)");
  setRuleState(ruleSymbolEl, hasSymbol, "Al menos un símbolo (ej. #, @, !, $)");

  return hasExactLength && hasLower && hasUpper && hasNumber && hasSymbol;
}

function validateRegistrationForm() {
  const nameOk = regNameInput.value.trim().length > 0;
  const emailOk = regEmailInput.value.trim().length > 0 && regEmailInput.checkValidity();
  const pwd = regPasswordInput.value;
  const confirmPwd = regConfirmInput.value;

  const passwordValid = evaluatePasswordRules(pwd);
  const passwordsMatch = pwd.length > 0 && pwd === confirmPwd;

  if (confirmPwd.length === 0) {
    confirmMatchMsg.textContent = "";
  } else if (passwordsMatch) {
    confirmMatchMsg.textContent = "✓ Las contraseñas coinciden";
  } else {
    confirmMatchMsg.textContent = "✗ Las contraseñas no coinciden";
  }

  const legalAccepted = acceptLegalCheckbox.checked;
  const allValid = nameOk && emailOk && passwordValid && passwordsMatch && legalAccepted;

  btnSubmitRegister.disabled = !allValid;
  return allValid;
}

function syncSessionUI() {
  window.dispatchEvent(new CustomEvent("ymc-session-change", { detail: { loggedIn: Boolean(currentSession) } }));
  const isLoggedIn = Boolean(currentSession);
  authActionsEl.classList.toggle("hidden", isLoggedIn);
  sessionBadgeEl.classList.toggle("hidden", !isLoggedIn);

  if (isLoggedIn) {
    activeUserLabelEl.textContent = `SESIÓN ACTIVA: ${currentSession.displayName}`;
  } else {
    activeUserLabelEl.textContent = "";
  }
}

function discardRegistrationDraft() {
  registerForm.reset();
  regNameInput.value = "";
  regEmailInput.value = "";
  regPasswordInput.value = "";
  regConfirmInput.value = "";
  acceptLegalCheckbox.checked = false;
  document.getElementById("registerFeedback").textContent = "";
  confirmMatchMsg.textContent = "";
  resetPasswordVisibilityIcons();
  validateRegistrationForm();
  toggleModal(registerModal, false);
}

document.querySelectorAll(".btn-toggle-pwd").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetInput = document.getElementById(btn.dataset.targetPwd);
    if (!targetInput) return;
    const showText = targetInput.type === "password";
    targetInput.type = showText ? "text" : "password";
    btn.textContent = showText ? "🙈" : "👁";
  });
});

[regNameInput, regEmailInput, regPasswordInput, regConfirmInput, acceptLegalCheckbox].forEach((el) => {
  el.addEventListener("input", validateRegistrationForm);
  el.addEventListener("change", validateRegistrationForm);
});

document.getElementById("btnGateLogin")?.addEventListener("click", () => {
  document.getElementById("btnOpenLogin").click();
});
document.getElementById("btnGateRegister")?.addEventListener("click", () => {
  document.getElementById("btnOpenRegister").click();
});

document.getElementById("btnOpenLogin").addEventListener("click", () => {
  loginForm.reset();
  document.getElementById("loginFeedback").textContent = "";
  resetPasswordVisibilityIcons();
  toggleModal(loginModal, true);
});

document.getElementById("btnOpenRegister").addEventListener("click", () => {
  discardRegistrationDraft();
  toggleModal(registerModal, true);
});

document.querySelector('[data-close-modal="loginModal"]').addEventListener("click", () => {
  loginForm.reset();
  resetPasswordVisibilityIcons();
  toggleModal(loginModal, false);
});

document.getElementById("btnCancelRegister").addEventListener("click", discardRegistrationDraft);

document.getElementById("openLegalPopup").addEventListener("click", () => {
  toggleModal(legalModal, true);
});

document.getElementById("btnCloseLegal").addEventListener("click", () => {
  toggleModal(legalModal, false);
});

document.getElementById("btnAcceptLegalInside").addEventListener("click", () => {
  acceptLegalCheckbox.checked = true;
  validateRegistrationForm();
  toggleModal(legalModal, false);
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;

  if (!email || password.length < 6) {
    document.getElementById("loginFeedback").textContent = "Verifica tu correo y contraseña.";
    return;
  }

  const pwdHash = await hashPasswordSHA256(password);
  const savedUser = registeredUsers.get(email);

  if (savedUser && savedUser.pwdHash !== pwdHash) {
    document.getElementById("loginFeedback").textContent = "Contraseña incorrecta para este usuario.";
    return;
  }

  const username = savedUser
    ? savedUser.displayName
    : email.split("@")[0].replace(/[^A-Za-z0-9_-]/g, "").toUpperCase() || "USUARIO";

  currentSession = {
    displayName: username,
    tokenDigest: pwdHash.slice(0, 16)
  };

  loginForm.reset();
  resetPasswordVisibilityIcons();
  toggleModal(loginModal, false);
  syncSessionUI();
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateRegistrationForm()) {
    document.getElementById("registerFeedback").textContent =
      "Completa todos los campos, cumple las reglas de contraseña y acepta los términos.";
    return;
  }

  const name = regNameInput.value.trim();
  const email = regEmailInput.value.trim().toLowerCase();
  const password = regPasswordInput.value;

  const pwdHash = await hashPasswordSHA256(password);
  const encryptedProfile = await encryptSensitivePayload({ email, pwdHash });

  registeredUsers.set(email, {
    displayName: name.toUpperCase(),
    pwdHash
  });

  currentSession = {
    displayName: name.toUpperCase(),
    vaultRef: encryptedProfile.ivHex
  };

  discardRegistrationDraft();
  syncSessionUI();
});

document.getElementById("btnLogout").addEventListener("click", () => {
  currentSession = null;
  syncSessionUI();
});

syncSessionUI();
validateRegistrationForm();