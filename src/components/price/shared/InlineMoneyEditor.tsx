import React, { useState, useRef, useEffect } from "react";
import { money, unmoney } from "./money";

const inputStyle = {
  border: "1px solid #e6e6e6",
  borderRadius: 8,
  padding: "8px 10px",
  outline: "none",
  width: 140,
};

export default function InlineMoneyEditor({ value, display, onCommit }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(display ?? money(value ?? 0));
  const [cursorPosition, setCursorPosition] = useState(null);
  const inputRef = useRef(null);

  // ✅ FIX: Restore cursor position after state update
  useEffect(() => {
    if (editing && inputRef.current && cursorPosition !== null) {
      inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
      setCursorPosition(null); // Reset after applying
    }
  }, [text, editing, cursorPosition]);

  const handleChange = (e) => {
    // ✅ FIX: Store cursor position before updating state
    const currentPosition = e.target.selectionStart;
    setCursorPosition(currentPosition);
    setText(e.target.value);
  };

  const commit = () => {
    const v = unmoney(text);
    onCommit(v ?? value);
    setEditing(false);
  };

  return editing ? (
    <input
      ref={inputRef}
      style={inputStyle}
      value={text}
      onChange={handleChange}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
      autoFocus
    />
  ) : (
    <button
      type="button"
      onClick={() => {
        setText(display ?? money(value ?? 0));
        setEditing(true);
      }}
      title="Click to edit"
      style={{
        border: "1px dashed transparent",
        borderRadius: 8,
        padding: "6px 10px",
        cursor: "pointer",
        background: "#fff",
      }}
    >
      {display ?? money(value ?? 0)}
    </button>
  );
}
