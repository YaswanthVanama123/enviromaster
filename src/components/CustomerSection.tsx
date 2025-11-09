import { useState } from "react";
import "./CustomerSection.css";
import logo from "../assets/em-logo.png";

const initialFieldsFromAPI = [
  { id: "customerName",    label: "CUSTOMER NAME :",     value: "", builtIn: true },
  { id: "customerContact", label: "CUSTOMER CONTACT :",  value: "", builtIn: true },
  { id: "customerNumber",  label: "CUSTOMER NUMBER :",   value: "", builtIn: true },
  { id: "pocEmail",        label: "POC EMAIL :",         value: "", builtIn: true },
  { id: "pocPhone",        label: "POC PHONE :",         value: "", builtIn: true },
];

export default function CustomerSection() {
  const [fields, setFields] = useState(initialFieldsFromAPI);

  const changeValue = (id, next) =>
    setFields(prev => prev.map(f => (f.id === id ? { ...f, value: next } : f)));

  const changeLabel = (id, next) =>
    setFields(prev => prev.map(f => (f.id === id ? { ...f, label: next } : f)));

  const addField = () => {
    const n = Date.now().toString(36);
    setFields(prev => [
      ...prev,
      { id: `custom_${n}`, label: "LOREM IPSUM :", value: "", builtIn: false },
    ]);
  };

  const removeField = (id) =>
    setFields(prev => prev.filter(f => f.id !== id));

  return (
    <section className="cua2">
      <div className="cua2__logo">
        <img src={logo} alt="Enviro-Master Logo" className="cua2__logo-img" />
      </div>

      <div className="cua2__right">
        <div className="cua2__headerRow">
          <h1 className="cua2__title">Customer Update Addendum</h1>
          <button type="button" className="cua2__addBtn" onClick={addField}>
            + Add field
          </button>
        </div>

        <div className="cua2__fields">
          {fields.map((f) => (
            <FieldRow
              key={f.id}
              field={f}
              onChangeLabel={(val) => changeLabel(f.id, val)}
              onChangeValue={(val) => changeValue(f.id, val)}
              onRemove={() => removeField(f.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FieldRow({ field, onChangeLabel, onChangeValue, onRemove }) {
  return (
    <div className="cua2__field">
      <div className="cua2__labelCell">
        {field.builtIn ? (
          <span className="cua2__labelText">{field.label}</span>
        ) : (
<input
  className="cua2__labelEdit"
  value={field.label}
  size={Math.min(Math.max((field.label ?? "").trimEnd().length, 1), 26)}
  maxLength={26}
  onChange={(e) => onChangeLabel(e.target.value)}
/>

        )}
      </div>

      <div className="cua2__valueCell">
        <input
          className={`cua2__value ${!field.builtIn ? "cua2__value--withBtn" : ""}`}
          value={field.value}
          onChange={(e) => onChangeValue(e.target.value)}
        />
        {!field.builtIn && (
          <button
            type="button"
            aria-label="Remove"
            className="cua2__removeBtn"
            title="Remove this field"
            onClick={onRemove}
          >
            –
          </button>
        )}
      </div>
    </div>
  );
}
