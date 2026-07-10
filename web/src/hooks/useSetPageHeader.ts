import { useEffect } from 'react';
import { usePageHeader } from '@/context/PageHeaderContext';

export function useSetPageHeader(title: string, subtitle?: string) {
  const { setHeader } = usePageHeader();
  useEffect(() => {
    setHeader({ title, subtitle });
  }, [title, subtitle, setHeader]);
}
