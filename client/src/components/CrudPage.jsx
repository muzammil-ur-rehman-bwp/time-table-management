import { useState } from 'react';
import { DataTable } from './DataTable';
import { Modal } from './Modal';
import { EntityForm } from './EntityForm';
import { api } from '../api';
import { useData } from '../DataContext';

// A full list+add+edit+delete page for one resource, driven by a column/field
// config. `resource` is the API path segment, e.g. "teachers".
export function CrudPage({ title, resource, rows, columns, fields, idOf, description, transform }) {
  const { reloadAll } = useData();
  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...row} = edit
  const [busyId, setBusyId] = useState(null);
  const [listError, setListError] = useState(null);

  async function handleSubmit(rawValues) {
    const isNew = !editing?.__isEdit;
    const id = editing?.__isEdit ? idOf(editing) : null;
    const values = transform ? transform(rawValues) : rawValues;
    if (isNew) {
      await api.post(`/${resource}`, values);
    } else {
      await api.put(`/${resource}/${encodeURIComponent(id)}`, values);
    }
    setEditing(null);
    await reloadAll();
  }

  async function handleDelete(row) {
    const id = idOf(row);
    if (!window.confirm(`Delete "${id}"? This cannot be undone.`)) return;
    setBusyId(id);
    setListError(null);
    try {
      await api.del(`/${resource}/${encodeURIComponent(id)}`);
      await reloadAll();
    } catch (err) {
      setListError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h2>{title}</h2>
          {description && <p className="muted">{description}</p>}
        </div>
        <button className="btn-primary" onClick={() => setEditing({ __isEdit: false })}>
          + Add {title.replace(/s$/, '')}
        </button>
      </div>
      {listError && <p className="form-error">{listError}</p>}
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={idOf}
        onEdit={(row) => setEditing({ ...row, __isEdit: true })}
        onDelete={handleDelete}
      />
      {busyId && <p className="muted">Deleting {busyId}...</p>}
      {editing && (
        <Modal title={editing.__isEdit ? `Edit ${title}` : `New ${title}`} onClose={() => setEditing(null)}>
          <EntityForm
            fields={typeof fields === 'function' ? fields(editing) : fields}
            initial={editing}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
            submitLabel={editing.__isEdit ? 'Save changes' : 'Create'}
          />
        </Modal>
      )}
    </section>
  );
}
