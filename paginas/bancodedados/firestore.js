import { getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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
            submitBtn.textContent = 'PROCESSANDO PEDIDO...';
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
            status: 'Aprovado (Simulação)'
        };

        try {
            const docRef = await addDoc(collection(db, "orders"), orderData);
            const orderId = 'DWY-' + docRef.id.substring(0, 6).toUpperCase();

            alert(`Pedido ${orderId} realizado com sucesso! Obrigado por apoiar a Dread Wyrm Esports.`);

            clearCartStorage();
            document.getElementById('checkoutModal')?.classList.remove('open');
            checkoutForm.reset();

        } catch (error) {
            console.error("Erro ao salvar pedido no Firestore:", error);
            alert("Não foi possível salvar o pedido no banco de dados. Verifique o console para mais detalhes.");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    });
});