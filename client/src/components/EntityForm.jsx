import { useState } from 'react';

// Renders a form from a small field-config list and hands the collected
// values back on submit. Used by every simple CRUD page (Teachers, Rooms,
// Sections, Programs, Sessions, Courses, Allocations) so each page only has
// to describe its fields, not re-implement a form.
//
// field: {
//   name, label, type: 'text'|'number'|'select'|'multiselect'|'checkbox'|'textarea',
//   options: [{value,label}] (for select/multiselect),
//   required, placeholder, help
// }
export function EntityForm({ fields, initial, onSubmit, onCancel, submitLabel }) {
  const [values, setValues] = useState(() => {
    const v = {};
    for (const f of fields) {
      if (f.type === 'json') {
        v[f.name] = JSON.stringify(initial?.[f.name] ?? f.jsonDefault ?? {}, null, 1);
      } else {
        v[f.name] = initial?.[f.name] ?? (f.type === 'multiselect' ? [] : f.type === 'checkbox' ? false : '');
      }
    }
    return v;
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function set(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  function toggleMulti(name, option) {
    setValues((v) => {
      const current = v[name] || [];
      const next = current.includes(option)
        ? current.filter((x) => x !== option)
        : [...current, option];
      return { ...v, [name]: next };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    for (const f of fields) {
      if (f.required && !values[f.name] && values[f.name] !== 0) {
        setError(`${f.label} is required`);
        return;
      }
    }
    const payload = { ...values };
    for (const f of fields) {
      if (f.type === 'json') {
        try {
          payload[f.name] = JSON.parse(values[f.name] || '{}');
        } catch {
          setError(`${f.label} must be valid JSON`);
          return;
        }
      }
    }
    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="entity-form">
      {fields.map((f) => (
        <div className="form-row" key={f.name}>
          <label>
            {f.label}
            {f.required && <span className="req">*</span>}
          </label>
          {f.type === 'select' && (
            <select value={values[f.name]} onChange={(e) => set(f.name, e.target.value)}>
              <option value="">-- select --</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          {f.type === 'multiselect' && (
            <div className="checkbox-list">
              {f.options.map((o) => (
                <label key={o.value} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={(values[f.name] || []).includes(o.value)}
                    onChange={() => toggleMulti(f.name, o.value)}
                  />
                  {o.label}
                </label>
              ))}
              {f.options.length === 0 && <span className="muted">No options yet</span>}
            </div>
          )}
          {f.type === 'checkbox' && (
            <input
              type="checkbox"
              checked={!!values[f.name]}
              onChange={(e) => set(f.name, e.target.checked)}
            />
          )}
          {f.type === 'json' && (
            <textarea
              className="json-input"
              rows={6}
              value={values[f.name]}
              onChange={(e) => set(f.name, e.target.value)}
            />
          )}
          {f.type === 'textarea' && (
            <textarea
              value={values[f.name]}
              placeholder={f.placeholder}
              onChange={(e) => set(f.name, e.target.value)}
            />
          )}
          {(!f.type || f.type === 'text' || f.type === 'number') && (
            <input
              type={f.type === 'number' ? 'number' : 'text'}
              value={values[f.name]}
              placeholder={f.placeholder}
              disabled={f.disabled}
              onChange={(e) => set(f.name, f.type === 'number' ? e.target.valueAsNumber : e.target.value)}
            />
          )}
          {f.help && <small className="muted">{f.help}</small>}
        </div>
      ))}
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel || 'Save'}
        </button>
      </div>
    </form>
  );
}
