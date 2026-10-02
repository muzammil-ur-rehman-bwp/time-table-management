import { useState } from 'react';
import { useData } from '../DataContext';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { EntityForm } from '../components/EntityForm';
import { AllocationForm } from '../components/AllocationForm';
import { api } from '../api';

const DELIVERIES = ['in-room', 'online'];

export default function Allocations() {
  const { allocations, courses, teachers, sections, reloadAll } = useData();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  const addFields = [
    {
      name: 'course_id',
      label: 'Course',
      type: 'select',
      required: true,
      options: courses.map((c) => ({ value: c.id, label: `${c.code} - ${c.title}` })),
    },
    {
      name: 'teacher',
      label: 'Teacher',
      type: 'select',
      required: true,
      options: teachers.map((t) => ({ value: t.id, label: t.id })),
    },
    {
      name: 'sections',
      label: 'Sections',
      type: 'multiselect',
      options: sections.map((s) => ({ value: s.id, label: s.id })),
    },
    { name: 'delivery', label: 'Delivery', type: 'select', options: DELIVERIES.map((d) => ({ value: d, label: d })) },
    { name: 'meetings_per_week', label: 'Meetings per week', type: 'number' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  async function handleAdd(values) {
    await api.post('/allocations', values);
    setAdding(false);
    await reloadAll();
  }

  async function handleDelete(row) {
    const linked = row.linked_placement_ids?.length || 0;
    if (linked > 0) {
      window.alert(
        `"${row.id}" is still linked to ${linked} timetable ${linked === 1 ? 'entry' : 'entries'}. Delete or reassign those first.`
      );
      return;
    }
    if (!window.confirm(`Delete allocation "${row.id}"?`)) return;
    setError(null);
    try {
      await api.del(`/allocations/${row.id}`);
      await reloadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAllocationSaved() {
    setEditing(null);
    await reloadAll();
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h2>Allocations</h2>
          <p className="muted">
            Who teaches what, for which sections - the workload assignment behind the timetable. Every
            allocation here was either derived once from the existing timetable entries (see notes) or
            created by hand. Changing an allocation's teacher updates every timetable entry it produced,
            after checking the new teacher isn't already busy at those times.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setAdding(true)}>
          + Add allocation
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      <DataTable
        columns={[
          { key: 'id', label: 'Id' },
          { key: 'course_code', label: 'Course' },
          { key: 'teacher', label: 'Teacher' },
          { key: 'sections', label: 'Sections', render: (a) => (a.sections || []).join(', ') },
          { key: 'delivery', label: 'Delivery' },
          { key: 'linked', label: 'Timetable entries', render: (a) => a.linked_placement_ids?.length || 0 },
        ]}
        rows={allocations}
        rowKey={(a) => a.id}
        onEdit={(row) => setEditing(row)}
        onDelete={handleDelete}
      />

      {adding && (
        <Modal title="New allocation" onClose={() => setAdding(false)}>
          <EntityForm
            fields={addFields}
            initial={{}}
            onSubmit={handleAdd}
            onCancel={() => setAdding(false)}
            submitLabel="Create"
          />
        </Modal>
      )}

      {editing && (
        <Modal title={`Edit ${editing.id}`} onClose={() => setEditing(null)} wide>
          <AllocationForm allocation={editing} onSaved={handleAllocationSaved} onCancel={() => setEditing(null)} />
        </Modal>
      )}
    </section>
  );
}
