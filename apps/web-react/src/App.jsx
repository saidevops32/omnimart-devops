import React, { useState, useEffect } from 'react';

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({ items: [], subtotal: 0, totalPayable: 0 });
  const [order, setOrder] = useState(null);
  const [riderGps, setRiderGps] = useState(null);
  const userId = "USER-AZURE-STUDENT";

  useEffect(() => {
    fetch('/api/catalog/items')
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(() => {
        setProducts([
          { id: 'PROD-001', name: 'Fresh Bananas (Robusta)', category: 'Fresh Fruits', price: 48, unit: '1 kg', rating: 4.8 },
          { id: 'PROD-002', name: 'Full Cream Milk', category: 'Dairy & Eggs', price: 33, unit: '500 ml', rating: 4.9 },
          { id: 'PROD-003', name: 'Artisan Multigrain Sourdough', category: 'Bakery', price: 55, unit: '400 g', rating: 4.7 }
        ]);
      });
  }, []);

  const addToCart = (product) => {
    fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, productId: product.id, name: product.name, price: product.price, quantity: 1 })
    })
    .then(res => res.json())
    .then(summary => setCart(summary))
    .catch(() => {
      const existing = cart.items ? cart.items.find(i => i.productId === product.id) : null;
      const items = existing
        ? cart.items.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...(cart.items || []), { ...product, productId: product.id, quantity: 1 }];
      const subtotal = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      setCart({ items, subtotal, totalPayable: subtotal + 30 });
    });
  };

  const handleCheckout = () => {
    fetch('/api/checkout/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        deliveryAddress: "Flat 502, Silicon Towers, HITEC City, Hyderabad",
        paymentMethod: "UPI Instant"
      })
    })
    .then(res => res.json())
    .then(confirmedOrder => {
      setOrder(confirmedOrder);
      setCart({ items: [], subtotal: 0, totalPayable: 0 });
      connectTrackingWs();
    });
  };

  const connectTrackingWs = () => {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${wsProto}//${window.location.host}/ws/tracking/stream`);
    ws.onmessage = (e) => {
      try {
        setRiderGps(JSON.parse(e.data));
      } catch (err) {}
    };
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div>
          <h1 style={{ margin: 0, color: '#10b981', fontSize: '24px' }}>⚡ OmniMart Express</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '13px' }}>Enterprise Polyglot Microservices on Azure AKS</p>
        </div>
        <div style={{ fontWeight: 'bold', color: '#374151' }}>
          🛒 Cart: {cart.items ? cart.items.reduce((acc, i) => acc + i.quantity, 0) : 0} items (₹{cart.totalPayable || 0})
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginTop: '24px' }}>
        <div>
          <h2 style={{ fontSize: '18px', color: '#1f2937' }}>Fresh Catalog</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            {products.map(p => (
              <div key={p.id} style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>{p.category}</span>
                  <h3 style={{ fontSize: '15px', margin: '6px 0', color: '#111827' }}>{p.name}</h3>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>{p.unit} · ★ {p.rating}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 'bold' }}>₹{p.price}</span>
                  <button onClick={() => addToCart(p)} style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>+ ADD</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: 'fit-content' }}>
          <h2 style={{ fontSize: '18px', margin: '0 0 16px', color: '#1f2937' }}>Checkout & Order</h2>
          {cart.items && cart.items.length > 0 ? (
            <div>
              {cart.items.map(item => (
                <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: '14px' }}>
                  <span>{item.name} × {item.quantity}</span>
                  <strong>₹{item.price * item.quantity}</strong>
                </div>
              ))}
              <div style={{ marginTop: '16px', fontSize: '13px', color: '#4b5563' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}><span>Subtotal:</span><span>₹{cart.subtotal}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0' }}><span>Taxes & Fees:</span><span>₹30.00</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 0 0', fontWeight: 'bold', fontSize: '16px', color: '#111827', borderTop: '2px solid #e5e7eb', paddingTop: '8px' }}>
                  <span>Total:</span><span>₹{cart.totalPayable}</span>
                </div>
              </div>
              <button onClick={handleCheckout} style={{ width: '100%', backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', marginTop: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
                Place Order (Pay ₹{cart.totalPayable})
              </button>
            </div>
          ) : (
            <div style={{ color: '#9ca3af', textAlign: 'center', padding: '24px 0' }}>Cart is empty. Select items to checkout.</div>
          )}

          {order && (
            <div style={{ marginTop: '24px', backgroundColor: '#ecfdf5', border: '1px solid #10b981', padding: '16px', borderRadius: '8px' }}>
              <div style={{ color: '#065f46', fontWeight: 'bold' }}>✅ Confirmed: {order.orderId}</div>
              <div style={{ fontSize: '12px', color: '#047857', marginTop: '4px' }}>ETA: 12 Minutes to Hyderabad Address</div>
              {riderGps ? (
                <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#fff', borderRadius: '6px', fontSize: '12px' }}>
                  🚴 <strong>Erlang BEAM GPS:</strong> Lat {riderGps.lat}, Lng {riderGps.lng}
                  <br/>Status: <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{riderGps.status} ({riderGps.eta})</span>
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>Streaming live telemetry via WebSocket...</div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
