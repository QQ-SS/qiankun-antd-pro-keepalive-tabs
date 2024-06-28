import { useLocalStorageState } from 'ahooks';
import type { Options } from 'ahooks/lib/createUseStorageState';
import { useEffect, useState } from 'react';

const useLocalStorageStateEx = <T>(
  storageKey: string,
  key: string,
  options?: Omit<Options<T>, 'serializer' | 'deserializer'>,
): [T | undefined, React.Dispatch<React.SetStateAction<T | undefined>>] => {
  const [cache, setCache] = useLocalStorageState<Record<string, T>>(storageKey, {
    ...options,
    defaultValue: options?.defaultValue
      ? {
          [key]:
            typeof options.defaultValue === 'function'
              ? (options.defaultValue as () => T)()
              : options.defaultValue,
        }
      : {},
  });
  const [state, setState] = useState<T | undefined>(cache?.[key]);

  useEffect(() => {
    if (!state) {
      if (cache?.hasOwnProperty(key)) {
        delete cache[key];
        setCache({ ...cache });
      }
    } else {
      setCache({ ...cache, [key]: state });
    }
  }, [state]);

  return [state, setState];
};
export default useLocalStorageStateEx;
