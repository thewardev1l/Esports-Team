/* =========================================================
   DREAD WYRM ESPORTS — MENU DE CONTA COMPARTILHADO
   autenticacao/account-menu.js
   ========================================================= */

(() => {
  const wrapper = document.getElementById("accountWrapper");
  const button = document.getElementById("accountButton");
  const menu = document.getElementById("accountMenu");

  if (!wrapper || !button || !menu) return;

  const nameEl = document.getElementById("accountMenuName");
  const emailEl = document.getElementById("accountMenuEmail");
  const statusEl = document.getElementById("accountMenuStatus");
  const loginEl = document.getElementById("accountMenuLogin");
  const accountEl = document.getElementById("accountMenuAccount");
  const logoutEl = document.getElementById("accountMenuLogout");

  function setOpen(open) {
    menu.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
  }

  function render(user) {
    if (!nameEl || !emailEl || !statusEl || !loginEl || !accountEl || !logoutEl) return;

    if (user) {
      const name = user.displayName || "Minha conta";
      nameEl.textContent = name;
      emailEl.textContent = user.email || "";

      if (user.emailVerified) {
        statusEl.textContent = "✓ E-MAIL VERIFICADO";
        statusEl.classList.add("verified");
      } else {
        statusEl.textContent = "E-MAIL AINDA NÃO VERIFICADO";
        statusEl.classList.remove("verified");
      }

      loginEl.hidden = true;
      accountEl.hidden = false;
      logoutEl.hidden = false;

      button.setAttribute("aria-label", `Minha conta — ${name}`);
      button.setAttribute("title", `Minha conta — ${name}`);
      return;
    }

    nameEl.textContent = "Você não está conectado";
    emailEl.textContent = "Entre para acessar sua conta.";
    statusEl.textContent = "SESSÃO NÃO INICIADA";
    statusEl.classList.remove("verified");

    loginEl.hidden = false;
    accountEl.hidden = true;
    logoutEl.hidden = true;

    button.setAttribute("aria-label", "Entrar ou criar conta");
    button.setAttribute("title", "Entrar ou criar conta");
  }

  render(null);

  button.addEventListener("click", async (event) => {
    event.stopPropagation();
    const open = !menu.hidden;
    setOpen(!open);

    if (!open && window.DWY_AUTH_READY) {
      try {
        render(await window.DWY_AUTH_READY);
      } catch (error) {
        console.error("Erro ao carregar estado da conta:", error);
        nameEl.textContent = "Não foi possível verificar a conta";
        emailEl.textContent = "Recarregue a página e tente novamente.";
        statusEl.textContent = "ERRO DE AUTENTICAÇÃO";
      }
    }
  });

  document.addEventListener("click", (event) => {
    if (!wrapper.contains(event.target)) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOpen(false);
      button.focus();
    }
  });

  logoutEl.addEventListener("click", async () => {
    if (typeof window.DWY_SIGN_OUT !== "function") {
      console.error("DWY_SIGN_OUT não está disponível.");
      return;
    }

    logoutEl.disabled = true;
    logoutEl.textContent = "SAINDO...";

    try {
      await window.DWY_SIGN_OUT();
      setOpen(false);
    } catch (error) {
      console.error("Erro ao sair da conta:", error);
      logoutEl.disabled = false;
      logoutEl.textContent = "SAIR";
    }
  });

  window.addEventListener("dwy-auth-changed", (event) => {
    render(event.detail?.user || null);
    logoutEl.disabled = false;
    logoutEl.textContent = "SAIR";
  });

  if (window.DWY_AUTH_READY) {
    window.DWY_AUTH_READY.then(render).catch((error) => {
      console.error("Erro ao inicializar menu de conta:", error);
    });
  }
})();
