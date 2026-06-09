import React, { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import Avatar from '../../components/ui/Avatar';
import IconButton from '../../components/ui/IconButton';
import { useAlertDialog } from '../../components/ui/AlertDialog';
import { useOrders } from '../../hooks/useOrders';
import { isModerator } from '../../services/auth';
import {
  deleteOrder,
  removeOrderItem,
  updateOrderStatus
} from '../../services/catalog';
import pb from '../../services/pb';
import { getMediaThumbUrl } from '../../lib/media';
import { error } from '../../lib/log';
import './OrdersModal.css';

/** @type {Record<'pending' | 'completed' | 'cancelled', string>} */
const MODERATOR_STATUS_LABELS = {
  pending: 'Ожидает',
  completed: 'Выполнено',
  cancelled: 'Удалено'
};

/** @type {Record<'completed' | 'cancelled', string>} */
const ORDER_STATUS_LABELS = {
  completed: 'Выполнен',
  cancelled: 'Отменён'
};

/**
 * @param {import('../../services/catalog').OrderItemRecord} item
 * @returns {string | null}
 */
function getOrderItemThumbUrl(item) {
  if (!item.imageFileName || !item.productId) return null;

  const record = {
    id: item.productId,
    collectionId: item.collectionId || item.productCollectionId || 'products'
  };

  return getMediaThumbUrl(record, 'products', item.imageFileName, '400x0');
}

/**
 * @param {{
 *   item: import('../../services/catalog').OrderItemRecord,
 *   canEdit: boolean,
 *   isBusy: boolean,
 *   onRemove: () => void
 * }} props
 */
function OrderItemRow({ item, canEdit, isBusy, onRemove }) {
  const thumbUrl = getOrderItemThumbUrl(item);

  return (
    <div className="orders-modal__item">
      {thumbUrl ? (
        <img src={thumbUrl} alt="" className="orders-modal__item-thumb" />
      ) : (
        <div className="orders-modal__item-thumb orders-modal__item-thumb--empty" aria-hidden="true" />
      )}
      <div className="orders-modal__item-info">
        <span className="orders-modal__item-title">{item.title}</span>
        {typeof item.price === 'number' ? (
          <span className="orders-modal__item-price">{item.price} ₽</span>
        ) : null}
      </div>
      {canEdit ? (
        <button
          type="button"
          className="orders-modal__item-remove"
          aria-label={`Удалить ${item.title || 'товар'} из заказа`}
          disabled={isBusy}
          onClick={onRemove}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

/**
 * @param {{
 *   order: import('../../services/catalog').OrderRecord,
 *   moderator: boolean,
 *   busyOrderId: string | null,
 *   onRemoveItem: (orderId: string, itemIndex: number, itemsCount: number) => void,
 *   onDeleteOrder: (orderId: string) => void,
 *   onCompleteOrder: (orderId: string) => void,
 *   onCancelOrder: (orderId: string) => void
 * }} props
 */
function OrderCard({
  order,
  moderator,
  busyOrderId,
  onRemoveItem,
  onDeleteOrder,
  onCompleteOrder,
  onCancelOrder
}) {
  const items = Array.isArray(order.items) ? order.items : [];
  const canEdit = order.status === 'pending';
  const isBusy = busyOrderId === order.id;
  const orderUser = /** @type {import('../../services/catalog').PlayerRecord | undefined} */ (
    order.expand?.user
  );
  const statusLabel =
    order.status === 'completed' || order.status === 'cancelled'
      ? ORDER_STATUS_LABELS[order.status]
      : null;

  return (
    <article className="orders-modal__card">
      <div className="orders-modal__card-header">
        {moderator && orderUser ? (
          <div className="orders-modal__user">
            <Avatar user={orderUser} size="sm" />
            <span className="orders-modal__user-name">
              {orderUser.full_name || orderUser.name || 'Пользователь'}
            </span>
          </div>
        ) : (
          <span className="orders-modal__card-spacer" aria-hidden="true" />
        )}

        <div className="orders-modal__card-actions">
          {statusLabel ? (
            <span
              className={clsx(
                'orders-modal__status',
                order.status === 'completed' && 'orders-modal__status--completed',
                order.status === 'cancelled' && 'orders-modal__status--cancelled'
              )}
            >
              {statusLabel}
            </span>
          ) : null}

          {canEdit && !moderator ? (
            <IconButton
              ariaLabel="Удалить заказ"
              variant="ghost"
              size="sm"
              className="orders-modal__delete-order"
              disabled={isBusy}
              onClick={() => onDeleteOrder(order.id)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </IconButton>
          ) : null}

          {canEdit && moderator ? (
            <>
              <IconButton
                ariaLabel="Отметить заказ выполненным"
                variant="ghost"
                size="sm"
                className="orders-modal__complete-order"
                disabled={isBusy}
                onClick={() => onCompleteOrder(order.id)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </IconButton>
              <IconButton
                ariaLabel="Отменить заказ"
                variant="ghost"
                size="sm"
                className="orders-modal__delete-order"
                disabled={isBusy}
                onClick={() => onCancelOrder(order.id)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
              </IconButton>
            </>
          ) : null}
        </div>
      </div>

      <div className="orders-modal__items">
        {items.map((item, index) => (
          <OrderItemRow
            key={`${order.id}-${item.productId}-${index}`}
            item={item}
            canEdit={canEdit}
            isBusy={isBusy}
            onRemove={() => onRemoveItem(order.id, index, items.length)}
          />
        ))}
      </div>
    </article>
  );
}

/**
 * @param {{ isOpen: boolean, onClose: () => void }} props
 */
export default function OrdersModal({ isOpen, onClose }) {
  const moderator = isModerator();
  const userId = pb.authStore.model?.id;
  const { alert } = useAlertDialog();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [busyOrderId, setBusyOrderId] = useState(null);

  const { data: orders = [], isLoading, mutate } = useOrders(
    moderator
      ? { status: statusFilter, enabled: isOpen }
      : { userId, enabled: isOpen && !!userId }
  );

  useEffect(() => {
    if (!isOpen) {
      setStatusFilter('pending');
      setBusyOrderId(null);
    }
  }, [isOpen]);

  const runOrderAction = useCallback(
    async (orderId, action) => {
      if (busyOrderId) return;

      setBusyOrderId(orderId);
      try {
        await action();
        await mutate();
      } catch (err) {
        error('Действие с заказом:', err);
        await alert({
          title: 'Не удалось обновить заказ',
          message: 'Попробуйте ещё раз чуть позже.'
        });
      } finally {
        setBusyOrderId(null);
      }
    },
    [busyOrderId, mutate, alert]
  );

  const handleRemoveItem = useCallback(
    (orderId, itemIndex, itemsCount) => {
      runOrderAction(orderId, () =>
        itemsCount === 1 ? deleteOrder(orderId) : removeOrderItem(orderId, itemIndex)
      );
    },
    [runOrderAction]
  );

  const handleDeleteOrder = useCallback(
    (orderId) => {
      runOrderAction(orderId, () => deleteOrder(orderId));
    },
    [runOrderAction]
  );

  const handleCompleteOrder = useCallback(
    (orderId) => {
      runOrderAction(orderId, () => updateOrderStatus(orderId, 'completed'));
    },
    [runOrderAction]
  );

  const handleCancelOrder = useCallback(
    (orderId) => {
      runOrderAction(orderId, () => updateOrderStatus(orderId, 'cancelled'));
    },
    [runOrderAction]
  );

  const showEmpty = !isLoading && orders.length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Мои заказы"
      size="large"
      className="orders-modal"
    >
      {moderator ? (
        <div className="orders-modal__filter">
          <label htmlFor="orders-status-filter" className="visually-hidden">
            Фильтр по статусу
          </label>
          <select
            id="orders-status-filter"
            className="orders-modal__filter-select"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(/** @type {'pending' | 'completed' | 'cancelled'} */ (event.target.value))
            }
          >
            {Object.entries(MODERATOR_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {isLoading ? (
        <Spinner label="Загрузка заказов..." />
      ) : showEmpty ? (
        <EmptyState title="У вас пока нет заказов" />
      ) : (
        <div className="orders-modal__list">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              moderator={moderator}
              busyOrderId={busyOrderId}
              onRemoveItem={handleRemoveItem}
              onDeleteOrder={handleDeleteOrder}
              onCompleteOrder={handleCompleteOrder}
              onCancelOrder={handleCancelOrder}
            />
          ))}
        </div>
      )}
    </Modal>
  );
}
