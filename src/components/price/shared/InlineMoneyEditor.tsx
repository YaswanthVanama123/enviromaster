import React, { useState } from "react";
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

  const commit = () => {
    const v = unmoney(text);
    onCommit(v ?? value);
    setEditing(false);
  };

  return editing ? (
    <input
      style={inputStyle}
      value={text}
      onChange={(e) => setText(e.target.value)}
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
