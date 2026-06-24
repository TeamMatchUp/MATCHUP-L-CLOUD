import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { AuthModal, AuthModalMode } from "./AuthModal";

type AuthModalContextValue = {
  open: (mode?: AuthModalMode) => void;
  close: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthModalMode>("signin");

  const open = useCallback((m: AuthModalMode = "signin") => {
    setMode(m);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <AuthModalContext.Provider value={{ open, close }}>
      {children}
      <AuthModal open={isOpen} mode={mode} onModeChange={setMode} onClose={close} />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}
