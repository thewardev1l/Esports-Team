/* =========================================================
   DREAD WYRM ESPORTS — AUTENTICAÇÃO COMPARTILHADA
   auth-state.js
   ========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

/* =========================================================
   CONFIGURAÇÃO DO FIREBASE
   ========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyBdhLso_vhEZeRAD25fEx91aJszkX4gnk4",
  authDomain: "dread-wyrm-store.firebaseapp.com",
  projectId: "dread-wyrm-store",
  storageBucket: "dread-wyrm-store.firebasestorage.app",
  messagingSenderId: "215207618467",
  appId: "1:215207618467:web:5b3af43da6fe44bca95c16",
  measurementId: "G-K4P0YJ92N0"
};

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = "pt-BR";

/* =========================================================
   DISPONIBILIZA O AUTH GLOBALMENTE
   ========================================================= */

window.DWY_AUTH = auth;
window.DWY_AUTH_USER = null;

/* =========================================================
   PROMISE DE AUTENTICAÇÃO
   ========================================================= */

window.DWY_AUTH_READY = new Promise((resolve) => {
  onAuthStateChanged(auth, (user) => {
    window.DWY_AUTH_USER = user || null;

    updateAccountLinks(user);

    document.documentElement.dataset.auth =
      user ? "authenticated" : "guest";

    window.dispatchEvent(
      new CustomEvent("dwy-auth-changed", {
        detail: {
          user: user || null
        }
      })
    );

    resolve(user || null);
  });
});

/* =========================================================
   ATUALIZA OS LINKS DE LOGIN / CONTA
   ========================================================= */

function updateAccountLinks(user) {
  const accountLinks = document.querySelectorAll(
    'a[href="login.html"], a[href^="login.html?"]'
  );

  accountLinks.forEach((link) => {
    if (user) {
      link.setAttribute("aria-label", "Minha conta");
      link.setAttribute(
        "title",
        user.displayName
          ? `Minha conta — ${user.displayName}`
          : "Minha conta"
      );
      link.dataset.authenticated = "true";
    } else {
      link.setAttribute("aria-label", "Entrar ou criar conta");
      link.setAttribute("title", "Entrar ou criar conta");
      link.dataset.authenticated = "false";
    }
  });
}

/* =========================================================
   FUNÇÃO AUXILIAR PARA SABER SE ESTÁ LOGADO
   ========================================================= */

window.DWY_IS_AUTHENTICATED = function () {
  return !!window.DWY_AUTH_USER;
};

/* =========================================================
   FUNÇÃO AUXILIAR PARA OBTER O USUÁRIO
   ========================================================= */

window.DWY_GET_USER = function () {
  return window.DWY_AUTH_USER || null;
};

/* =========================================================
   FUNÇÃO AUXILIAR PARA ESPERAR O FIREBASE CARREGAR
   ========================================================= */

window.DWY_WAIT_FOR_AUTH = async function () {
  return await window.DWY_AUTH_READY;
};

/* =========================================================
   FUNÇÃO GLOBAL PARA SAIR DA CONTA
   ========================================================= */

window.DWY_SIGN_OUT = async function () {
  await signOut(auth);
};

/* =========================================================
   EVENTO GLOBAL DE AUTENTICAÇÃO
   ========================================================= */

window.addEventListener(
  "dwy-auth-changed",
  (event) => {
    const user = event.detail?.user || null;
    window.DWY_AUTH_USER = user;
  }
);
