const Stripe = require('stripe');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const { items, orderId, userEmail, returnUrl } = req.body;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        const lineItems = items.map(item => ({
            price_data: {
                currency: 'brl',
                product_data: {
                    name: item.name,
                },
                unit_amount: Math.round(Number(item.price) * 100),
            },
            quantity: Number(item.qty),
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['pix'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${returnUrl}?pagamento=sucesso&pedido=${orderId}`,
            cancel_url: `${returnUrl}?pagamento=cancelado`,
            client_reference_id: orderId,
            customer_email: userEmail && userEmail !== "nao-logado" ? userEmail : undefined,
        });

        return res.status(200).json({ url: session.url });
    } catch (error) {
        console.error("Erro Stripe:", error);
        return res.status(500).json({ error: error.message });
    }
};