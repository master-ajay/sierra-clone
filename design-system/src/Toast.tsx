'use client'

import { createContext, useCallback, useContext, useState, ReactNode, useRef } from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastInput {
  message: string
  variant?: ToastVariant
  duration?: number
}

interface ToastItem extends Required<ToastInput> {
  id: number
}

interface ToastContextValue {
  showToast: (toast: ToastInput) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: 'border-status-success/30 text-status-success',
  error: 'border-status-error/30 text-status-error',
  info: 'border-status-info/30 text-status-info',
}

const DEFAULT_DURATION = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const showToast = useCallback((toast: ToastInput) => {
    const id = nextId.current++
    const duration = toast.duration ?? DEFAULT_DURATION
    const item: ToastItem = {
      id,
      message: toast.message,
      variant: toast.variant ?? 'info',
      duration,
    }
    setToasts((prev) => [...prev, item])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`rounded-md border bg-bg-surface px-4 py-2.5 text-sm shadow-md ${VARIANT_CLASSES[toast.variant]}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}
