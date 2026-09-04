"use client";

import AuthModal, { requestRavineAuth } from "./AuthModal";

export default function AuthTrigger({ locale, label }: { locale: "ar" | "en"; label: string }) {
  return (
    <button
      type="button"
      className="ravine-minor-link ravine-auth-trigger"
      onClick={() => requestRavineAuth(`/${locale}`)}
    >
      {label}
    </button>
  );
}

export { AuthModal };
