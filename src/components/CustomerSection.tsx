import { useMemo } from "react";
import "./CustomerSection.css";
import logo from "../assets/em-logo.png";

export type HeaderRow = {
  labelLeft: string;
  valueLeft: string;
  labelRight: string;
  valueRight: string;
};

type CustomerSectionProps = {
  headerTitle: string;
  headerRows: HeaderRow[];
  onHeaderRowsChange: (rows: HeaderRow[]) => void;
};

type Field = {
  id: string;
  label: string;
  value: string;
  builtIn: boolean;
};

const BUILT_IN_LABELS = new Set([
  "CUSTOMER NAME:",
  "CUSTOMER CONTACT:",
  "CUSTOMER NUMBER:",
  "POC EMAIL:",
  "POC NAME:",
  "POC PHONE:",
]);

function normalizeLabel(label: string): string {
  return label.replace(/\s+:/g, ":").trim().toUpperCase();
}

function isBuiltInLabel(label: string): boolean {
  if (!label) return false;
  return BUILT_IN_LABELS.has(normalizeLabel(label));
}

function headerRowsToFields(rows: HeaderRow[]): Field[] {
  const fields: Field[] = [];
  rows.forEach((row, rowIndex) => {
    if (row.labelLeft || row.valueLeft) {
      fields.push({
        id: `r${rowIndex}_L`,
        label: row.labelLeft ?? "",
        value: row.valueLeft ?? "",
        builtIn: isBuiltInLabel(row.labelLeft ?? ""),
      });
    }
    if (row.labelRight || row.valueRight) {
      fields.push({
        id: `r${rowIndex}_R`,
        label: row.labelRight ?? "",
        value: row.valueRight ?? "",
        builtIn: isBuiltInLabel(row.labelRight ?? ""),
      });
    }
  });

  // fallback: if backend sent nothing, create the standard 3 rows
  if (fields.length === 0) {
    const defaults: HeaderRow[] = [
      {
        labelLeft: "CUSTOMER NAME:",
        valueLeft: "",
        labelRight: "CUSTOMER CONTACT:",
        valueRight: "",
      },
      {
        labelLeft: "CUSTOMER NUMBER:",
        valueLeft: "",
        labelRight: "POC EMAIL:",
        valueRight: "",
      },
      {
        labelLeft: "POC NAME:",
        valueLeft: "",
        labelRight: "POC PHONE:",
        valueRight: "",
      },
    ];
    return headerRowsToFields(defaults);
  }

  return fields;
}

function fieldsToHeaderRows(fields: Field[]): HeaderRow[] {
  const rows: HeaderRow[] = [];

  for (let i = 0; i < fields.length; i += 2) {
    const left = fields[i];
    const right = fields[i + 1];

    rows.push({
      labelLeft: left?.label ?? "",
      valueLeft: left?.value ?? "",
      labelRight: right?.label ?? "",
      valueRight: right?.value ?? "",
    });
  }

  return rows;
}

export default function CustomerSection({
  headerTitle,
  headerRows,
  onHeaderRowsChange,
}: CustomerSectionProps) {
  const fields = useMemo(() => headerRowsToFields(headerRows), [headerRows]);

  const updateFields = (nextFields: Field[]) => {
    const rows = fieldsToHeaderRows(nextFields);
    onHeaderRowsChange(rows);
  };

  const changeValue = (id: string, next: string) => {
    const updated = fields.map((f) =>
      f.id === id ? { ...f, value: next } : f
    );
    updateFields(updated);
  };

  const changeLabel = (id: string, next: string) => {
    const updated = fields.map((f) =>
      f.id === id ? { ...f, label: next } : f
    );
    updateFields(updated);
  };

  const addField = () => {
    const n = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const newField: Field = {
      id: `custom_${n}`,
      label: "LOREM IPSUM :",
      value: "",
      builtIn: false,
    };
    updateFields([...fields, newField]);
  };

  const removeField = (id: string) => {
    const updated = fields.filter((f) => f.id !== id);
    updateFields(updated);
  };

  return (
    <section className="cua2">
      <div className="cua2__logo">
        <img
          src={logo}
          alt="Enviro-Master Logo"
          className="cua2__logo-img"
          width="150"
          height="100"
          loading="eager"
        />
      </div>

      <div className="cua2__right">
        <div className="cua2__headerRow">
          <h1 className="cua2__title">{headerTitle}</h1>
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

type FieldRowProps = {
  field: Field;
  onChangeLabel: (v: string) => void;
  onChangeValue: (v: string) => void;
  onRemove: () => void;
};

function FieldRow({ field, onChangeLabel, onChangeValue, onRemove }: FieldRowProps) {
  return (
    <div className="cua2__field">
      <div className="cua2__labelCell">
        {field.builtIn ? (
          <span className="cua2__labelText">{field.label}</span>
        ) : (
          <input
            className="cua2__labelEdit"
            value={field.label}
            size={Math.min(
              Math.max((field.label ?? "").trimEnd().length, 1),
              26
            )}
            maxLength={26}
            onChange={(e) => onChangeLabel(e.target.value)}
          />
        )}
      </div>

      <div className="cua2__valueCell">
        <input
          className={`cua2__value ${
            !field.builtIn ? "cua2__value--withBtn" : ""
          }`}
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
