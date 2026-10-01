import { useState } from 'react';
import { useData } from '../DataContext';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { EntityForm } from '../components/EntityForm';
import { api } from '../api';

export default function Grid() {
  const { grid, reloadAll } = useData();
  const [editingSlot, setEditingSlot] = useState(null);
  const [addingDay, setAddingDay] = useState(false);
  const [error, setError] = useState(null);

  async function saveSlot(values) {
    if (editingSlot.__isEdit) {
      await api.put(`/grid/slots/${editingSlot.index}`, values);
    } else {
      await api.post('/grid/slots', values);
    }
    setEditingSlot(null);
    await reloadAll();
  }

  async function deleteSlot(slot) {
    if (!window.confirm(`Delete slot "${slot.code}"?`)) return;
    setError(null);
    try {
      await api.del(`/grid/slots/${slot.index}`);
      await reloadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveDay(values) {
    await api.post('/grid/days', values);
    setAddingDay(false);
    await reloadAll();
  }

  async function deleteDay(day) {
    if (!window.confirm(`Delete day "${day.code}"?`)) return;
    setError(null);
    try {
      await api.del(`/grid/days/${day.code}`);
      await reloadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h2>Grid: Days &amp; Time Slots</h2>
          <p className="muted">
            The weekly structure every timetable entry is built on. A slot or day in use by an
            existing placement can't be deleted.
          </p>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}

      <h3>Days</h3>
      <div className="page-header">
        <span />
        <button className="btn-primary" onClick={() => setAddingDay(true)}>
          + Add day
        </button>
      </div>
      <DataTable
        columns={[
          { key: 'code', label: 'Code' },
          { key: 'name', label: 'Name' },
        ]}
        rows={grid.days}
        rowKey={(d) => d.code}
        onDelete={deleteDay}
      />

      <h3>Time slots</h3>
      <div className="page-header">
        <span />
        <button className="btn-primary" onClick={() => setEditingSlot({ __isEdit: false })}>
          + Add slot
        </button>
      </div>
      <DataTable
        columns={[
          { key: 'index', label: '#' },
          { key: 'code', label: 'Code' },
          { key: 'start', label: 'Start' },
          { key: 'end', label: 'End' },
          { key: 'label', label: 'Label' },
        ]}
        rows={grid.slots}
        rowKey={(s) => s.index}
        onEdit={(s) => setEditingSlot({ ...s, __isEdit: true })}
        onDelete={deleteSlot}
      />

      {editingSlot && (
        <Modal title={editingSlot.__isEdit ? 'Edit slot' : 'New slot'} onClose={() => setEditingSlot(null)}>
          <EntityForm
            fields={[
              { name: 'code', label: 'Code', required: true, placeholder: 'e.g. 08:30AM' },
              { name: 'start', label: 'Start (HH:MM, 24h)', required: true, placeholder: '08:30' },
              { name: 'end', label: 'End (HH:MM, 24h)', required: true, placeholder: '09:00' },
              { name: 'label', label: 'Label', placeholder: 'e.g. 8:30 AM - 9:00 AM' },
            ]}
            initial={editingSlot}
            onSubmit={saveSlot}
            onCancel={() => setEditingSlot(null)}
            submitLabel={editingSlot.__isEdit ? 'Save changes' : 'Create'}
          />
        </Modal>
      )}

      {addingDay && (
        <Modal title="New day" onClose={() => setAddingDay(false)}>
          <EntityForm
            fields={[
              { name: 'code', label: 'Code', required: true, placeholder: 'e.g. SUN' },
              { name: 'name', label: 'Name', required: true, placeholder: 'e.g. Sunday' },
            ]}
            initial={{}}
            onSubmit={saveDay}
            onCancel={() => setAddingDay(false)}
            submitLabel="Create"
          />
        </Modal>
      )}
    </section>
  );
}
