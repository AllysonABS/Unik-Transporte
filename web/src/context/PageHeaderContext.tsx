import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface PageHeaderData {
  title: string;
  subtitle?: string;
}

interface PageHeaderContextValue extends PageHeaderData {
  setHeader: (data: PageHeaderData) => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue>({
  title: '',
  subtitle: undefined,
  setHeader: () => {},
});

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeaderState] = useState<PageHeaderData>({ title: '' });

  const setHeader = useCallback((data: PageHeaderData) => {
    setHeaderState(data);
  }, []);

  return (
    <PageHeaderContext.Provider value={{ ...header, setHeader }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  return useContext(PageHeaderContext);
}
