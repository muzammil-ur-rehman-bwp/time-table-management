import { useState } from 'react';
import { useData } from '../DataContext';
import { api } from '../api';

const DELIVERIES = ['in-room', 'online'];

// Editing an allocation's teacher is special: it cascades onto every
// timetable entry (placement) this allocation produced, so it needs the
// same check-conflicts / force-save dance as the Timetable form uses for a
// brand-new placement - except here it's checking a reassignment against
// entries that already exist.
export function AllocationForm({ allocation, onSaved, onCancel }) {
  const { teachers, sections } = useData();
  const [teacher, setTeacher] = useState(allocation.teacher);
  const [allocSections, setAllocSections] = useState(allocation.sections || []);
  const [delivery, setDelivery] = useState(allocation.delivery || 'in-room');
  const [meetingsPerWeek, setMeetingsPerWeek] = useState(allocation.meetings_per_week ?? '');
  const [notes, setNotes] = useState(allocation.notes || '');
  const [conflictReport, setConflictReport] = useState(null);
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  const teacherChanged = teacher !== allocation.teacher;
  const linkedCount = allocation.linked_placement_ids?.length || 0;

  function toggleSection(id) {
    setAllocSections((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function buildPayload(force) {
    const payload = {
      teacher,
      sections: allocSections,
      delivery,
      meetings_per_week: meetingsPerWeek === '' ? undefined : Number(meetingsPerWeek),
      notes,
    };
    if (force) payload.force = true;
    return payload;
  }

  async function handleCheck() {
    setError(null);
    setChecking(true);
    try {
      const result = await api.post(`/allocations/${allocation.id}/check-teacher-change`, { teacher });
      setConflictReport(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  async function handleSave(force) {
    setError(null);
    setSaving(true);
    try {
      await api.put(`/allocations/${allocation.id}`, buildPayload(force));
      await onSaved();
    } catch (err) {
      if (err.body?.conflicts) {
        setConflictReport({ conflicts: err.body.conflicts, hasConflict: true });
      }
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const hasConflict = conflictReport?.hasConflict;

  return (
    <div className="entity-form">
      <div className="form-row">
        <label>Course (fixed)</label>
        <input type="text" value={`${allocation.course_code} - ${allocation.course_title}`} disabled />
        <small className="muted">
          Changing the course on an existing allocation isn't supported here - delete and re-create it instead.
        </small>
      </div>

      <div className="form-row">
        <label>Teacher *</label>
        <select
          value={teacher}
          onChange={(e) => {
            setTeacher(e.target.value);
            setConflictReport(null);
          }}
        >
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.id}
            </option>
          ))}
        </select>
        <small className="muted">
          {linkedCount > 0
            ? `This allocation produced ${linkedCount} timetable ${linkedCount === 1 ? 'entry' : 'entries'}. Changing the teacher here updates ${linkedCount === 1 ? 'it' : 'all of them'} too.`
            : 'No timetable entries reference this allocation yet.'}
        </small>
      </div>

      <div className="form-row">
        <label>Sections</label>
        <div className="checkbox-list">
          {sections.map((s) => (
            <label key={s.id} className="checkbox-item">
              <input type="checkbox" checked={allocSections.includes(s.id)} onChange={() => toggleSection(s.id)} />
              {s.id}
            </label>
          ))}
        </div>
        <small className="muted">Doesn't affect existing timetable entries - only the allocation record.</small>
      </div>

      <div className="form-row two-col">
        <div>
          <label>Delivery</label>
          <select value={delivery} onChange={(e) => setDelivery(e.target.value)}>
            {DELIVERIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Meetings per week</label>
          <input type="number" value={meetingsPerWeek} onChange={(e) => setMeetingsPerWeek(e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <label>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {error && <p className="form-error">{error}</p>}

      {teacherChanged && conflictReport && (
        <div className={hasConflict ? 'conflict-box conflict-bad' : 'conflict-box conflict-ok'}>
          {hasConflict ? (
            <>
              <strong>
                Reassigning to {teacher} would double-book them on {conflictReport.conflicts.length}{' '}
                {conflictReport.conflicts.length === 1 ? 'entry' : 'entries'}:
              </strong>
              <ul>
                {conflictReport.conflicts.map((c) => (
                  <li key={c.placement_id}>
                    {c.placement_id}: clashes with {[...c.conflicts.teacher, ...c.conflicts.room, ...c.conflicts.section].join(', ')}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <strong>No conflicts - {teacher} is free for all {linkedCount} linked timetable entries.</strong>
          )}
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        {teacherChanged && (
          <button type="button" className="btn-secondary" onClick={handleCheck} disabled={checking || saving}>
            {checking ? 'Checking...' : 'Check conflicts'}
          </button>
        )}
        {teacherChanged && hasConflict ? (
          <button type="button" className="btn-danger" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? 'Saving...' : 'Save anyway (force)'}
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        )}
      </div>
    </div>
  );
}
