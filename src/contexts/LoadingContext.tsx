import React, {
  createContext,
  useState,
  useContext,
  useMemo,
  ReactNode,
  FC,
  useCallback,
} from 'react';

interface ILoadingContext {
  isLoading: boolean;
  showLoading: () => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<ILoadingContext | undefined>(undefined);

export const useLoading = (): ILoadingContext => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading hook must be used within a LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: FC<LoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const showLoading = useCallback(() => {
    setIsLoading(true);
  }, []);

  const hideLoading = useCallback(() => {
    setIsLoading(false);
  }, []);
  const value = useMemo(
    () => ({
      isLoading,
      showLoading,
      hideLoading,
    }),
    [isLoading, showLoading, hideLoading]
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};