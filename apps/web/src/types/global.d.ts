interface CookieStore {
  set: (options: {
    name: string;
    value: string;
    path: string;
    maxAge: number;
  }) => Promise<void>;
}

declare global {
  interface Window {
    cookieStore?: CookieStore;
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}

export {};
