// src/components/common/SanitizedInput.tsx

import React, { useState } from 'react';
import { sanitizeText, detectProblematicCharacters, getReplacementSummary } from '../../utils/textSanitizer';

interface SanitizedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  showWarning?: boolean;
  label?: string;
}

/**
 * Input component with automatic text sanitization on blur
 * Use this instead of regular <input> to prevent LaTeX errors
 */
export const SanitizedInput: React.FC<SanitizedInputProps> = ({
  value,
  onChange,
  showWarning = true,
  label,
  ...props
}) => {
  const [warning, setWarning] = useState<string | null>(null);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const original = e.target.value;
    const detection = detectProblematicCharacters(original);

    if (detection.hasProblems) {
      console.warn('🧹 [SANITIZE] Cleaned input:', {
        field: label || props.name,
        original,
        cleaned: detection.cleaned,
        problems: detection.problems,
      });

      const changes = getReplacementSummary(original, detection.cleaned);

      if (showWarning && changes.length > 0) {
        setWarning(changes.join(', '));
        setTimeout(() => setWarning(null), 5000); // Clear after 5 seconds
      }

      onChange(detection.cleaned);
    }

    // Call original onBlur if provided
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
      />
      {warning && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#fef3c7',
            color: '#92400e',
            padding: '8px',
            fontSize: '12px',
            borderRadius: '4px',
            marginTop: '4px',
            border: '1px solid #fbbf24',
            zIndex: 10,
          }}
        >
          ⚠️ {warning}
        </div>
      )}
    </div>
  );
};

interface SanitizedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  showWarning?: boolean;
  label?: string;
}

/**
 * Textarea component with automatic text sanitization on blur
 * Use this instead of regular <textarea> to prevent LaTeX errors
 */
export const SanitizedTextarea: React.FC<SanitizedTextareaProps> = ({
  value,
  onChange,
  showWarning = true,
  label,
  ...props
}) => {
  const [warning, setWarning] = useState<string | null>(null);

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const original = e.target.value;
    const detection = detectProblematicCharacters(original);

    if (detection.hasProblems) {
      console.warn('🧹 [SANITIZE] Cleaned textarea:', {
        field: label || props.name,
        original,
        cleaned: detection.cleaned,
        problems: detection.problems,
      });

      const changes = getReplacementSummary(original, detection.cleaned);

      if (showWarning && changes.length > 0) {
        setWarning(changes.join(', '));
        setTimeout(() => setWarning(null), 5000);
      }

      onChange(detection.cleaned);
    }

    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <textarea
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
      />
      {warning && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#fef3c7',
            color: '#92400e',
            padding: '8px',
            fontSize: '12px',
            borderRadius: '4px',
            marginTop: '4px',
            border: '1px solid #fbbf24',
            zIndex: 10,
          }}
        >
          ⚠️ {warning}
        </div>
      )}
    </div>
  );
};
