// @ts-check
import PocketBase from 'pocketbase';
import { PB_URL } from '../config';

// Единый инстанс PocketBase для всего приложения. authStore сериализуется в localStorage.
const pb = new PocketBase(PB_URL);

export default pb;
