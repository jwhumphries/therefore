import { useEffect } from "react";

const JSONLD_ID = "jsonld-structured-data";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useJsonLd(data: Record<string, any> | null) {
  useEffect(() => {
    if (!data) return;

    let script = document.getElementById(JSONLD_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = JSONLD_ID;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);

    return () => {
      const el = document.getElementById(JSONLD_ID);
      if (el) el.remove();
    };
  }, [data]);
}
