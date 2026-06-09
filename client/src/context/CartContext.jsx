import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

const CART_STORAGE_KEY = 'cart_items';

const CartContext = createContext(null);

function readStoredItems() {
  try {
    const raw = sessionStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry) =>
        entry &&
        typeof entry === 'object' &&
        entry.product &&
        typeof entry.product.id === 'string'
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readStoredItems);

  useEffect(() => {
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((product) => {
    if (!product?.id) return;
    setItems((current) => {
      if (current.some((entry) => entry.product.id === product.id)) {
        return current;
      }
      return [...current, { product, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((productId) => {
    if (!productId) return;
    setItems((current) =>
      current.filter((entry) => entry.product.id !== productId)
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalCount = useMemo(() => items.length, [items]);

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      clearCart,
      totalCount
    }),
    [items, addItem, removeItem, clearCart, totalCount]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
