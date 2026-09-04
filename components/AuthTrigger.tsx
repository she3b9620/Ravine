"use client";

import AuthModal, { requestRavineAuth } from "./AuthModal";

type Props = { locale: "ar" | "en"; label: string; mode?: "signin" | "signup"; primary?: boolean };

export default function AuthTrigger({ locale, label, mode = "signin", primary = false }: Props) {
  return (
    <button
      type="button"
      className={`ravine-minor-link ravine-auth-trigger${primary ? " ravine-auth-trigger-primary" : ""}`}
      onClick={() => requestRavineAuth(`/${locale}`, mode)}
    >
      {label}
    </button>
  );
}

export { AuthModal };
