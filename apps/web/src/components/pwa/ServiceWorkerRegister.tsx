"use client";

import { useEffect } from "react";

const SW_URL = "/sw.js?v=5";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let refreshed = false;

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
