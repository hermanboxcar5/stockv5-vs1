
declare global {
  interface Window {
    supabase: {
      createClient: (url: string, key: string) => any;
    };
  }
}

export {};
