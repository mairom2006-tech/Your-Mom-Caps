(function () {
    const paymentForm = document.getElementById("paymentForm");
    const authGate = document.getElementById("checkoutAuthGate");
    const sessionBadge = document.getElementById("sessionBadge");
    const loginModal = document.getElementById("loginModal");
    const registerModal = document.getElementById("registerModal");
    const legalModal = document.getElementById("legalModal");

    function showModal(modal) {
        if (!modal) return;
        modal.classList.remove("hidden");
        modal.style.setProperty("display", "flex", "important");
        modal.style.setProperty("opacity", "1", "important");
        modal.style.setProperty("visibility", "visible", "important");
        modal.style.setProperty("pointer-events", "auto", "important");
        modal.style.setProperty("z-index", "9999", "important");
    }

    function hideModal(modal) {
        if (!modal) return;
        modal.classList.add("hidden");
        modal.style.setProperty("display", "none", "important");
    }

    function hasActiveSession() {
        return Boolean(sessionBadge && !sessionBadge.classList.contains("hidden"));
    }

    function syncCheckoutVisibility() {
        const loggedIn = hasActiveSession();

        if (paymentForm) {
            paymentForm.classList.toggle("hidden", !loggedIn);
            paymentForm.style.setProperty("display", loggedIn ? "" : "none", "important");
            const payBtn = paymentForm.querySelector("button[type='submit']");
            if (payBtn) payBtn.disabled = !loggedIn;
        }

        if (authGate) {
            authGate.classList.toggle("hidden", loggedIn);
            authGate.style.setProperty("display", loggedIn ? "none" : "", "important");
        }
    }

    // Delegación de clics en fase de captura para que ningún otro script bloquee la apertura
    document.addEventListener("click", (e) => {
        const target = e.target;
        if (!target || typeof target.closest !== "function") return;

        if (target.closest("#btnOpenLogin, #btnGateLogin")) {
            e.preventDefault();
            hideModal(registerModal);
            showModal(loginModal);
            return;
        }

        if (target.closest("#btnOpenRegister, #btnGateRegister")) {
            e.preventDefault();
            hideModal(loginModal);
            showModal(registerModal);
            return;
        }

        if (target.closest("#openLegalPopup")) {
            e.preventDefault();
            showModal(legalModal);
            return;
        }

        if (target.closest("[data-close-modal='loginModal']")) {
            e.preventDefault();
            hideModal(loginModal);
            return;
        }

        if (target.closest("#btnCancelRegister")) {
            e.preventDefault();
            const regForm = document.getElementById("registerForm");
            if (regForm) regForm.reset();
            hideModal(registerModal);
            return;
        }

        if (target.closest("#btnCloseLegal, #btnAcceptLegalInside")) {
            e.preventDefault();
            if (target.closest("#btnAcceptLegalInside")) {
                const acceptCheckbox = document.getElementById("acceptLegal");
                if (acceptCheckbox) acceptCheckbox.checked = true;
            }
            hideModal(legalModal);
            return;
        }

        // Cerrar al hacer clic sobre el fondo oscuro del modal
        if (target === loginModal) hideModal(loginModal);
        if (target === registerModal) hideModal(registerModal);
        if (target === legalModal) hideModal(legalModal);
    }, true);

    // Sincroniza la sección de pago cuando cambia el estado de sesión
    if (sessionBadge) {
        const observer = new MutationObserver(syncCheckoutVisibility);
        observer.observe(sessionBadge, { attributes: true, attributeFilter: ["class"] });
    }

    // Bloquea envío de pago si no hay sesión activa
    if (paymentForm) {
        paymentForm.addEventListener("submit", (e) => {
            if (!hasActiveSession()) {
                e.preventDefault();
                e.stopImmediatePropagation();
                hideModal(registerModal);
                showModal(loginModal);
            }
        }, true);
    }

    // Conecta registro y login con los endpoints bcrypt en server.js
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", () => {
            const username = (document.getElementById("regEmail")?.value || "").trim();
            const password = document.getElementById("regPassword")?.value || "";
            if (!username || !password) return;

            fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            }).catch(() => {});
        });
    }

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", () => {
            const username = (document.getElementById("loginEmail")?.value || "").trim();
            const password = document.getElementById("loginPassword")?.value || "";
            if (!username || !password) return;

            fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            })
                .then((res) => res.json())
                .then((data) => {
                    if (data && data.ok) {
                        hideModal(loginModal);
                        syncCheckoutVisibility();
                    }
                })
                .catch(() => {});
        });
    }

    syncCheckoutVisibility();
})();