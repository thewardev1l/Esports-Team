import { getApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

const app = getApp();
const db = getFirestore(app);
const auth = getAuth(app);

const CART_KEY = 'dwy_cart';

// --- CONFIGURAÇÃO DO SEU PIX ---
const MINHA_CHAVE_PIX = "contact@dwyesports.gg"; // Coloque aqui sua chave do Nubank
const NOME_RECEBEDOR = "DREAD WYRM ESPORTS";
const CIDADE_RECEBEDOR = "SAO PAULO";

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

function gerarPayloadPix(chave, nome, cidade, valor, txid) {
    const formatarCampo = (id, conteudo) => {
        const tamanho = String(conteudo.length).padStart(2, '0');
        return `${id}${tamanho}${conteudo}`;
    };

    const gui = formatarCampo('00', 'br.gov.bcb.pix');
    const chavePix = formatarCampo('01', chave);
    const infoConta = formatarCampo('26', gui + chavePix);

    const valorFormatado = Number(valor).toFixed(2);
    const txidLimpo = txid.replace(/[^a-zA-Z0-9]/g, '').substring(0, 25) || 'DWY2026';
    const infoAdicional = formatarCampo('62', formatarCampo('05', txidLimpo));

    let payload = 
        formatarCampo('00', '01') +
        infoConta +
        formatarCampo('52', '0000') +
        formatarCampo('53', '986') +
        formatarCampo('54', valorFormatado) +
        formatarCampo('58', 'BR') +
        formatarCampo('59', nome.substring(0, 25)) +
        formatarCampo('60', cidade.substring(0, 15)) +
        infoAdicional +
        '6304';

    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        }
    }
    const crcHex = (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    return payload + crcHex;
}

document.addEventListener('DOMContentLoaded', () => {
    const checkoutForm = document.getElementById('checkoutForm');
    if (!checkoutForm) return;

    const pixInfo = document.getElementById('pixInfo');
    const cardFields = document.getElementById('cardFields');
    const cardNumberInput = document.getElementById('cardNumber');
    const cardExpiryInput = document.getElementById('cardExpiry');
    const cardCvvInput = document.getElementById('cardCvv');
    const cardHolderInput = document.getElementById('cardHolder');

    // Alterna os campos visíveis entre Pix e Cartão de Crédito
    document.querySelectorAll('.pay-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const isCard = opt.dataset.method === 'cartao';
            if (pixInfo) pixInfo.style.display = isCard ? 'none' : 'block';
            if (cardFields) cardFields.style.display = isCard ? 'block' : 'none';

            // Torna os campos de cartão obrigatórios apenas quando Cartão estiver selecionado
            if (cardNumberInput) cardNumberInput.required = isCard;
            if (cardHolderInput) cardHolderInput.required = isCard;
            if (cardExpiryInput) cardExpiryInput.required = isCard;
            if (cardCvvInput) cardCvvInput.required = isCard;
        });
    });

    // Máscara automática para Número do Cartão (0000 0000 0000 0000)
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '').substring(0, 16);
            e.target.value = v.replace(/(\d{4})(?=\d)/g, '$1 ');
        });
    }

    // Máscara automática para Validade (MM/AA)
    if (cardExpiryInput) {
        cardExpiryInput.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '').substring(0, 4);
            if (v.length >= 3) v = v.substring(0, 2) + '/' + v.substring(2);
            e.target.value = v;
        });
    }

    // Apenas números no CVV
    if (cardCvvInput) {
        cardCvvInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
        });
    }

    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const cart = getCartItems();
        if (!cart.length) {
            alert('Seu carrinho está vazio!');
            return;
        }

        const activePayOption = document.querySelector('.pay-option.active');
        const method = activePayOption ? activePayOption.dataset.method : 'pix';
        const isCard = method === 'cartao';

        // Validação básica do cartão
        let cardLast4 = '';
        let installments = '';
        if (isCard) {
            const rawCard = cardNumberInput.value.replace(/\s/g, '');
            if (rawCard.length < 13) {
                alert('Por favor, digite um número de cartão válido.');
                cardNumberInput.focus();
                return;
            }
            cardLast4 = rawCard.slice(-4);
            installments = document.getElementById('cardInstallments')?.value || '1x sem juros';
        }

        const submitBtn = checkoutForm.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent : 'Confirmar e Concluir Pedido';
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = isCard ? 'PROCESSANDO CARTÃO...' : 'GERANDO QR CODE PIX...';
        }

        const custName = document.getElementById('custName').value.trim();
        const custCep = document.getElementById('custCep').value.trim();
        const custCity = document.getElementById('custCity').value.trim();
        const custAddress = document.getElementById('custAddress').value.trim();

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
            paymentMethod: isCard ? `Cartão de Crédito (Final ${cardLast4} - ${installments})` : 'Pix',
            createdAt: serverTimestamp(),
            status: isCard ? 'Pagamento Aprovado (Cartão)' : 'Pedido Registrado (Aguardando Pix)'
        };

        try {
            // Simula um pequeno tempo de resposta da operadora se for cartão
            if (isCard) {
                await new Promise(resolve => setTimeout(resolve, 1200));
            }

            // Salva o pedido no Firestore
            const docRef = await addDoc(collection(db, "orders"), orderData);
            const orderId = 'DWY' + docRef.id.substring(0, 6).toUpperCase();
            const totalFormatado = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            clearCartStorage();
            const checkoutBox = document.querySelector('.checkout-box');

            if (isCard) {
                // TELA DE SUCESSO DO CARTÃO DE CRÉDITO
                checkoutBox.innerHTML = `
                    <button class="checkout-close" onclick="document.getElementById('checkoutModal').classList.remove('open'); location.reload();">×</button>
                    <div style="text-align: center; padding: 15px 0;">
                        <div style="width: 56px; height: 56px; background: #18854a; color: #fff; border-radius: 50%; display: grid; place-items: center; font-size: 28px; margin: 0 auto 15px;">✓</div>
                        <span style="color: #18854a; font-size: 11px; font-weight: 900; letter-spacing: 2px;">PAGAMENTO AUTORIZADO</span>
                        <h2 style="border: none; margin: 8px 0 5px; font-size: 22px;">Pedido #${orderId} Confirmado!</h2>
                        <p style="font-size: 13px; color: #555; margin-bottom: 20px;">Obrigado pela compra, <strong>${custName}</strong>! Seu pedido já está sendo preparado.</p>
                        
                        <div style="text-align: left; background: #f5f5f5; padding: 15px; border-left: 3px solid #18854a; margin-bottom: 20px; font-size: 12px; line-height: 1.8;">
                            <div><strong>Valor Total:</strong> ${totalFormatado} (${installments})</div>
                            <div><strong>Cartão:</strong> •••• •••• •••• ${cardLast4}</div>
                            <div><strong>Entrega:</strong> ${custAddress} — ${custCity} (${custCep})</div>
                        </div>

                        <button type="button" onclick="document.getElementById('checkoutModal').classList.remove('open'); location.reload();" style="width: 100%; background: #111; color: #fff; padding: 14px; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; cursor: pointer;">
                            Voltar para a Loja
                        </button>
                    </div>
                `;
            } else {
                // TELA DO QR CODE PIX
                const codigoPix = gerarPayloadPix(
                    MINHA_CHAVE_PIX,
                    NOME_RECEBEDOR,
                    CIDADE_RECEBEDOR,
                    total,
                    orderId
                );

                checkoutBox.innerHTML = `
                    <button class="checkout-close" onclick="document.getElementById('checkoutModal').classList.remove('open'); location.reload();">×</button>
                    <div style="text-align: center; padding: 10px 0;">
                        <span style="color: #ff0000; font-size: 11px; font-weight: 900; letter-spacing: 2px;">PEDIDO #${orderId} REGISTRADO</span>
                        <h2 style="border: none; margin: 8px 0 5px; font-size: 22px;">Pague com Pix</h2>
                        <p style="font-size: 13px; color: #555; margin-bottom: 20px;">Escaneie o QR Code abaixo ou copie o código para pagar <strong>${totalFormatado}</strong></p>
                        
                        <div id="qrcodeContainer" style="display: inline-block; padding: 15px; background: #fff; border: 2px solid #111; margin-bottom: 20px;"></div>
                        
                        <div style="text-align: left; background: #f5f5f5; padding: 12px; border-left: 3px solid #ff0000; margin-bottom: 15px;">
                            <label style="font-size: 10px; font-weight: 800; color: #666; display: block; margin-bottom: 5px;">PIX COPIA E COLA:</label>
                            <input type="text" id="pixCopiaColaInput" value="${codigoPix}" readonly style="width: 100%; border: 1px solid #ddd; padding: 8px; font-family: monospace; font-size: 11px; background: #fff;">
                        </div>

                        <button type="button" id="btnCopiarPix" style="width: 100%; background: #111; color: #fff; padding: 14px; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; margin-bottom: 10px;">
                            Copiar Código Pix
                        </button>
                        <button type="button" onclick="document.getElementById('checkoutModal').classList.remove('open'); location.reload();" style="width: 100%; background: #eee; color: #111; padding: 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; cursor: pointer;">
                            Concluir e Voltar à Loja
                        </button>
                    </div>
                `;

                new QRCode(document.getElementById("qrcodeContainer"), {
                    text: codigoPix,
                    width: 200,
                    height: 200,
                    colorDark: "#111111",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.M
                });

                document.getElementById('btnCopiarPix').addEventListener('click', () => {
                    const input = document.getElementById('pixCopiaColaInput');
                    input.select();
                    navigator.clipboard.writeText(input.value);
                    const btn = document.getElementById('btnCopiarPix');
                    btn.textContent = 'CÓDIGO COPIADO ✓';
                    btn.style.background = '#18854a';
                });
            }

        } catch (error) {
            console.error("Erro ao finalizar pedido:", error);
            alert("Erro ao registrar pedido: " + error.message);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    });
});