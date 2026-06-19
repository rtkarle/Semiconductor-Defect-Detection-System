import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

/**
 * Generic async hook that tracks loading/error state for any API call.
 *
 * Usage:
 *   const { data, loading, execute } = useApi(scansAPI.list);
 *   await execute({ page: 1 });
 */
export function useApi(apiFn) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFn(...args);
        setData(res.data);
        return res.data;
      } catch (err) {
        const message =
          err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          'Something went wrong.';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiFn]
  );

  return { data, loading, error, execute, setData };
}

/**
 * Extracts a user-friendly error message from an Axios error.
 */
export function getErrorMessage(err) {
  if (err?.response?.data?.detail) {
    const detail = err.response.data.detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => d.msg || d.message || JSON.stringify(d)).join(', ');
    }
    return detail;
  }
  return err?.message || 'An unexpected error occurred.';
}

/**
 * Wraps an async function with error-toast handling.
 */
export function withToast(fn, successMessage) {
  return async (...args) => {
    try {
      const result = await fn(...args);
      if (successMessage) toast.success(successMessage);
      return result;
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    }
  };
}
