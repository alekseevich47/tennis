import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { mutate as mutateSWR } from 'swr';
import pb from '../services/pb';
import { adjustProductFavoritesCount } from '../services/catalog';
import { error } from '../lib/log';

const FavoritesContext = createContext(null);

/** @param {string} productId @param {1 | -1} delta */
function patchProductsFavoritesCount(productId, delta) {
  mutateSWR(
    (key) => Array.isArray(key) && key[0] === 'products',
    (curr) => {
      if (!Array.isArray(curr)) return curr;
      return curr.map((product) => {
        if (product.id !== productId) return product;
        return {
          ...product,
          favorites_count: Math.max(0, (Number(product.favorites_count) || 0) + delta)
        };
      });
    },
    false
  );
}

async function loadFavoriteProducts(productIds, signal) {
  const ids = productIds.filter(Boolean);
  if (ids.length === 0) return [];

  const filter = ids.map((id) => pb.filter('id = {:id}', { id })).join(' || ');
  const products = await pb.collection('products').getFullList({
    filter: `(${filter}) && is_deleted = false`,
    requestKey: null,
    signal
  });

  const byId = new Map(products.map((product) => [product.id, product]));
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((product) => ({ product, quantity: 1 }));
}

export function FavoritesProvider({ children, userId, initialProductIds = [] }) {
  const [items, setItems] = useState([]);
  const initialIdsKey = initialProductIds.join(',');

  useEffect(() => {
    if (!userId) {
      setItems([]);
      return undefined;
    }

    const controller = new AbortController();

    (async () => {
      try {
        const loaded = await loadFavoriteProducts(initialProductIds, controller.signal);
        if (!controller.signal.aborted) {
          setItems(loaded);
        }
      } catch (err) {
        if (err?.name === 'AbortError') return;
        error('Ошибка загрузки избранного:', err);
      }
    })();

    return () => controller.abort();
  }, [userId, initialIdsKey]);

  const addItem = useCallback(
    (product) => {
      if (!product?.id || !userId) return;
      setItems((current) => {
        if (current.some((entry) => entry.product.id === product.id)) {
          return current;
        }
        return [...current, { product, quantity: 1 }];
      });
      patchProductsFavoritesCount(product.id, 1);
      pb.collection('users')
        .update(userId, { 'favorite_products+': product.id })
        .then(() => adjustProductFavoritesCount(product.id, 1))
        .catch((err) => {
          error('Ошибка добавления в избранное:', err);
          patchProductsFavoritesCount(product.id, -1);
          setItems((current) =>
            current.filter((entry) => entry.product.id !== product.id)
          );
        });
    },
    [userId]
  );

  const removeItem = useCallback(
    (productId) => {
      if (!productId || !userId) return;
      let removed = null;
      setItems((current) => {
        removed = current.find((entry) => entry.product.id === productId);
        if (!removed) return current;
        return current.filter((entry) => entry.product.id !== productId);
      });
      if (!removed) return;
      patchProductsFavoritesCount(productId, -1);
      pb.collection('users')
        .update(userId, { 'favorite_products-': productId })
        .then(() => adjustProductFavoritesCount(productId, -1))
        .catch((err) => {
          error('Ошибка удаления из избранного:', err);
          patchProductsFavoritesCount(productId, 1);
          setItems((prev) => {
            if (prev.some((entry) => entry.product.id === productId)) return prev;
            return [...prev, removed];
          });
        });
    },
    [userId]
  );

  const clearFavorites = useCallback(() => {
    if (!userId) return;
    let snapshot = [];
    setItems((current) => {
      snapshot = [...current];
      return [];
    });
    pb.collection('users')
      .update(userId, { favorite_products: [] })
      .catch((err) => {
        error('Ошибка очистки избранного:', err);
        setItems(snapshot);
      });
  }, [userId]);

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
