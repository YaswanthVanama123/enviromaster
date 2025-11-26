// src/components/admin/Toast.tsx

import React, { useEffect } from "react";
import "./Toast.css";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "success",
  duration = 5000,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "⚠";
      case "info":
        return "ℹ";
      default:
        return "✓";
    }
  };

  const getColors = () => {
    switch (type) {
      case "success":
        return {
          bg: "#10b981",
          border: "#059669",
        };
      case "error":
        return {
          bg: "#ef4444",
          border: "#dc2626",
        };
      case "warning":
        return {
          bg: "#f59e0b",
          border: "#d97706",
        };
      case "info":
        return {
          bg: "#3b82f6",
          border: "#2563eb",
        };
      default:
        return {
          bg: "#10b981",
          border: "#059669",
        };
    }
  };

  const colors = getColors();

  return (
    <div style={styles.container}>
      <div
        style={{
          ...styles.toast,
          backgroundColor: colors.bg,
          borderLeft: `4px solid ${colors.border}`,
        }}
      >
        <span style={styles.icon}>{getIcon()}</span>
        <span style={styles.message}>{message}</span>
        <button style={styles.closeButton} onClick={onClose}>
          ✕
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 9999,
    animation: "slideDown 0.3s ease-out",
  },
  toast: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 20px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    color: "white",
    fontWeight: "500",
    fontSize: "14px",
    minWidth: "300px",
    maxWidth: "500px",
  },
  icon: {
    fontSize: "18px",
    fontWeight: "bold",
  },
  message: {
    flex: 1,
  },
  closeButton: {
    background: "transparent",
    border: "none",
    color: "white",
    fontSize: "16px",
    cursor: "pointer",
    padding: "0 4px",
    opacity: 0.8,
    transition: "opacity 0.2s",
  },
};
