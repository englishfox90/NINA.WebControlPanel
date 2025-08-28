import { useEffect, useState } from 'react';
import { fetchNINAStatus } from '../services/ninaApi';
import { NINAStatusResponse } from '../types/nina';

export const useNINAData = () => {
  const [ninaData, setNinaData] = useState<NINAStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getNINAData = async () => {
      try {
        setLoading(true);
        const data = await fetchNINAStatus();
        setNinaData(data);
        setError(null); // Clear any previous errors
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch NINA data');
        console.error('NINA data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    getNINAData();
    const interval = setInterval(getNINAData, 10000); // Fetch data every 10 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  return { ninaData, loading, error };
};

export default useNINAData;