"use client";

import { useEffect } from "react";
import { PLATFORM_PRIMARY_HEX } from "@/lib/platform-theme";

/**
 * Ensures `<meta name="theme-color">` is present and correct for Safari / WebKit
 * (viewport export alone is sometimes missing or ignored in dev).
 */
export function PlatformChromeMeta() {
  useEffect(() => {
    const themeMetas = document.querySelectorAll('meta[name="theme-color"]');
    if (themeMetas.length === 0) {
      const el = document.createElement("meta");
      el.setAttribute("name", "theme-color");
      el.setAttribute("content", PLATFORM_PRIMARY_HEX);
      document.head.appendChild(el);
    } else {
      themeMetas.forEach((el) => el.setAttribute("content", PLATFORM_PRIMARY_HEX));
    }

    const ensureMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    ensureMeta("msapplication-TileColor", PLATFORM_PRIMARY_HEX);
  }, []);

  return null;
}
