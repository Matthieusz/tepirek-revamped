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

  type CSSProperties = Record<`--${string}`, string | number | undefined>;
}


