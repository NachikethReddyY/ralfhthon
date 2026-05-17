import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { usersApi, type ApiUser } from '../utils/apiClient';

type CancelRef = { current: boolean };

async function fetchCurrentUser(
  cancelRef: CancelRef | undefined,
  setUser: Dispatch<SetStateAction<ApiUser | null>>,
  setError: Dispatch<SetStateAction<string>>,
  setLoading: Dispatch<SetStateAction<boolean>>
) {
  const cancelled = () => cancelRef?.current === true;

  const token = localStorage.getItem('authToken');
  if (!token) {
    if (!cancelled()) {
      setLoading(false);
      setUser(null);
    }
    return;
  }

  try {
    const res = await usersApi.me();
    const data = (await res.json().catch(() => null)) as ApiUser | { error?: string } | null;
    if (cancelled()) return;
    if (!res.ok) {
      setError((data as { error?: string } | null)?.error || 'Could not load your account.');
      setUser(null);
    } else {
      setUser(data as ApiUser);
    }
  } catch {
    if (!cancelled()) {
      setError('Could not load your account.');
      setUser(null);
    }
  } finally {
    if (!cancelled()) setLoading(false);
  }
}

export function useCurrentUser() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = useCallback(async () => {
    await fetchCurrentUser(undefined, setUser, setError, setLoading);
  }, []);

  useEffect(() => {
    const cancelRef: CancelRef = { current: false };
    void fetchCurrentUser(cancelRef, setUser, setError, setLoading);
    return () => {
      cancelRef.current = true;
    };
  }, []);

  return { user, loading, error, setUser, refetch };
}

