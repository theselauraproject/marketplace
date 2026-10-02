"use client";

import { useEffect } from "react";

// Bumped whenever the service worker file itself changes, so the browser
// re-fetches and re-installs it rather than serving a stale copy from an
// old registration made during earlier testing.
const SW_URL = "/sw.js?v=3";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let refreshed = false;

    // If a new service worker takes control mid-session (first install, or
    // an update), reload once so the current page actually gets the
    // caching behavior instead of only the *next* navigation getting it.
    function handleControllerChange() {
      if (refreshed) {
        return;
      }
      refreshed = true;
      window.location.reload();
    }

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    const register = () => {
      navigator.serviceWorker.register(SW_URL).catch(() => {
        // Offline support is a progressive enhancement — if registration
        // fails, the app still works, just without the offline/faster
        // repeat-navigation behavior.
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      window.removeEventListener("load", register);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
    };
  }, []);

  return null;
}
