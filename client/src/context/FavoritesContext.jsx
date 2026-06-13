import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

const FAVORITES_STORAGE_KEY = 'favorite_items';

const FavoritesContext = createContext(null);

function readStoredItems() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
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

export function FavoritesProvider({ children }) {
  const [items, setItems] = useState(readStoredItems);

  useEffect(() => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items));
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

  const clearFavorites = useCallback(() => {
    setItems([]);
  }, []);

  const totalCount = useMemo(() => items.length, [items]);

  const isFavorite = useCallback(
    (productId) => {
      if (!productId) return false;
      return items.some((entry) => entry.product.id === productId);
    },
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      clearFavorites,
      totalCount,
      isFavorite
    }),
    [items, addItem, removeItem, clearFavorites, totalCount, isFavorite]
  );

  return (
    <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return context;
}
