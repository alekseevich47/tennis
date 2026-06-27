// @ts-check
import { useEffect } from 'react';
import useSWR from 'swr';
import pb from '../services/pb';
import { getCurrentUser } from '../services/auth';
import { listTrainings } from '../services/trainings';
import { error } from '../lib/log';

export function useTrainings() {
  const swr = useSWR(['trainings'], () => listTrainings());
  const { mutate } = swr;

  useEffect(() => {
    if (!getCurrentUser()?.id) return;

    pb.collection('trainings').subscribe('*', () => {
      mutate();
    }).catch((e) => {
      error('Ошибка подписки на тренировки:', e);
    });

    return () => {
      pb.collection('trainings').unsubscribe('*');
    };
  }, [mutate]);

  return swr;
}
