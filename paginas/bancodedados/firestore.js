import { getApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

// URL da sua API na Vercel
const STRIPE_FUNCTION_URL = "https://dreadwyrm.vercel.app/api/checkout";

// Reutiliza o app do Firebase que já foi inicializado pelo auth-state.js
const app = getApp();
const db = getFirestore(app);
const auth = getAuth(app);

const CART_KEY = 'dwy_cart';

function getCartItems() {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch (e) {
        return [];
    }
}

function clearCartStorage() {
    localStorage.setItem(CART_KEY, JSON.stringify([]));
    const badge = document.getElementById('cartCount');
    if (badge) badge.textContent = '0';
    
    const cartItemsEl = document.getElementById('cartItems');
    if (cartItemsEl) cartItemsEl.innerHTML = '<div class="empty">Seu carrinho está vazio.</div>';
    
    const cartTotalEl = document.getElementById('cartTotal');
    if (cartTotalEl) cartTotalEl.textContent = 'R$ 0,00';
}

document.addEventListener('DOMContentLoaded', () => {
    // Verifica se o cliente acabou de voltar do pagamento na Stripe
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('pagamento') === 'sucesso') {
        const pedidoId = urlParams.get('pedido') || '';
        alert(`Pagamento Pix confirmado! Seu pedido ${pedidoId} foi recebido com sucesso pela Dread Wyrm Esports.`);
        // Limpa os parâmetros da URL para não repetir o alerta ao atualizar a página
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('pagamento') === 'cancelado') {
        alert('O pagamento Pix foi cancelado. Seu pedido continua registrado caso queira tentar novamente.');
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    const checkoutForm = document.getElementById('checkoutForm');
    if (!checkoutForm) return;

    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const cart = getCartItems();
        if (!cart.length) {
            alert('Seu carrinho está vazio!');
            return;
        }

        const submitBtn = checkoutForm.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent : 'Confirmar e Concluir Pedido';
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'GERANDO PIX...';
        }

        // Coleta os dados do formulário
        const custName = document.getElementById('custName').value.trim();
        const custCep = document.getElementById('custCep').value.trim();
        const custCity = document.getElementById('custCity').value.trim();
        const custAddress = document.getElementById('custAddress').value.trim();

        const activePayOption = document.querySelector('.pay-option.active');
        const paymentMethod = activePayOption ? activePayOption.textContent.trim() : 'Pix';

        const total = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
        const currentUser = auth.currentUser;

        const orderData = {
            userId: currentUser ? currentUser.uid : 'visitante',
            userEmail: currentUser ? currentUser.email : 'nao-logado',
            customerName: custName,
            cep: custCep,
            city: custCity,
            address: custAddress,
            items: cart,
            total: Number(total.toFixed(2)),
            paymentMethod: paymentMethod,
            createdAt: serverTimestamp(),
            status: 'Aguardando Pagamento Pix'
        };

        try {
            // 1. Salva o pedido no Firestore
            const docRef = await addDoc(collection(db, "orders"), orderData);
            const orderId = 'DWY-' + docRef.id.substring(0, 6).toUpperCase();

            // 2. Chama a API da Vercel para criar a sessão de Pix na Stripe
            const response = await fetch(STRIPE_FUNCTION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart,
                    orderId: orderId,
                    userEmail: orderData.userEmail,
                    returnUrl: window.location.origin + window.location.pathname
                })
            });

            const data = await response.json();

            if (!response.ok || !data.url) {
                throw new Error(data.error || 'Erro ao gerar o link de pagamento Pix.');
            }

            // 3. Limpa o carrinho e redireciona para o Checkout Pix da Stripe
            clearCartStorage();
            window.location.href = data.url;

        } catch (error) {
            console.error("Erro no checkout:", error);
            alert("Erro ao processar o pagamento: " + error.message);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    });
});