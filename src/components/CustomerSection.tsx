import { useState } from "react";
import "./CustomerSection.css";
import logo from "../assets/em-logo.png";

/** dummy API response, in the order you want them to appear */
const initialFieldsFromAPI = [
  { id: "customerName",   label: "CUSTOMER NAME :",    value: "", builtIn: true },
  { id: "customerContact",label: "CUSTOMER CONTACT :", value: "", builtIn: true },
  { id: "customerNumber", label: "CUSTOMER NUMBER :",  value: "", builtIn: true },
  { id: "pocEmail",       label: "POC EMAIL :",        value: "", builtIn: true },
  { id: "pocPhone",       label: "POC PHONE :",        value: "", builtIn: true },
  // if you ever need a full-row item, add { full: true }
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
      {
        id: `custom_${n}`,
        label: "LOREM IPSUM :",
        value: "",
        builtIn: false,   // custom (editable + removable)
      },
    ]);
  };

  const removeField = (id) => setFields(prev => prev.filter(f => f.id !== id));

  return (
    <section className="cua2">
      {/* left: logo */}
      <div className="cua2__logo">
        <img src={logo} alt="Enviro-Master Logo" className="cua2__logo-img" />
      </div>

      {/* right: heading + fields */}
      <div className="cua2__right">
        <div className="cua2__headerRow">
          <h1 className="cua2__title">Customer Update Addendum</h1>
          <button type="button" className="cua2__addBtn" onClick={addField}>
            + Add field
          </button>
        </div>

        <div className="cua2__fields">
          {fields.map((f) => (
            <div
              key={f.id}
              className={`cua2__field ${f.full ? "cua2__field--full" : ""}`}
            >
              {/* static vs editable label */}
              {f.builtIn ? (
                <label>{f.label}</label>
              ) : (
                <div className="cua2__labelWrap">
                  <input
                    className="cua2__labelEdit"
                    value={f.label}
                    onChange={(e) => changeLabel(f.id, e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label="Remove"
                    className="cua2__removeBtn"
                    onClick={() => removeField(f.id)}
                    title="Remove this field"
                  >
                    –
                  </button>
                </div>
              )}

              {/* value underline input */}
              <input
                className="cua2__value"
                value={f.value}
                onChange={(e) => changeValue(f.id, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
