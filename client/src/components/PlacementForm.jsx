import { useMemo, useState } from 'react';
import { useData } from '../DataContext';
import { api } from '../api';

const LEVELS = ['undergraduate', 'graduate'];
const DELIVERIES = ['in-room', 'online'];
const STAFFINGS = ['assigned', 'unassigned'];

function buildInitial(initial, grid) {
  const slots = initial?.slots || [];
  return {
    course_id: initial?.course_id || '',
    teacher: initial?.teacher || '',
    sections: initial?.sections || [],
    day: initial?.day || grid.days[0]?.code || '',
    startSlot: slots.length ? String(Math.min(...slots)) : '',
    endSlot: slots.length ? String(Math.max(...slots)) : '',
    delivery: initial?.delivery || 'in-room',
    room: initial?.room || '',
    allocation_id: initial?.allocation_id || '',
    level: initial?.level || '',
    staffing: initial?.staffing || 'assigned',
  };
}

export function PlacementForm({ initial, isEdit, placementId, onSaved, onCancel }) {
  const { grid, courses, teachers, sections, rooms, allocations } = useData();
  const [values, setValues] = useState(() => buildInitial(initial, grid));
  const [conflicts, setConflicts] = useState(null);
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (name, v) => {
    setValues((s) => ({ ...s, [name]: v }));
    setConflicts(null);
  };

  const toggleSection = (id) => {
    setValues((s) => ({
      ...s,
      sections: s.sections.includes(id) ? s.sections.filter((x) => x !== id) : [...s.sections, id],
    }));
    setConflicts(null);
  };

  const relevantAllocations = useMemo(
    () => allocations.filter((a) => (!values.teacher || a.teacher === values.teacher) && (!values.course_id || a.course_id === values.course_id)),
    [allocations, values.teacher, values.course_id]
  );

  function buildPayload(force) {
    const start = Number(values.startSlot);
    const end = Number(values.endSlot);
    const slots = [];
    for (let i = Math.min(start, end); i <= Math.max(start, end); i++) slots.push(i);
    const payload = {
      course_id: values.course_id || undefined,
      teacher: values.teacher,
      sections: values.sections,
      day: values.day,
      slots,
      delivery: values.delivery,
      room: values.delivery === 'in-room' ? values.room : undefined,
      allocation_id: values.allocation_id || undefined,
      level: values.level || undefined,
      staffing: values.staffing,
    };
    if (force) payload.force = true;
    return payload;
  }

  function validateBasics() {
    if (!values.teacher) return 'Teacher is required';
    if (!values.sections.length) return 'At least one section is required';
    if (!values.day) return 'Day is required';
    if (values.startSlot === '' || values.endSlot === '') return 'Start and end slot are required';
    if (values.delivery === 'in-room' && !values.room) return 'Room is required for in-room delivery';
    if (!values.course_id && !initial?.course_code) return 'Course is required';
    return null;
  }

  async function handleCheck() {
    const basicError = validateBasics();
    if (basicError) {
      setError(basicError);
      return;
    }
    setError(null);
    setChecking(true);
    try {
      const payload = buildPayload(false);
      if (isEdit) payload.id = placementId;
      const result = await api.post('/placements/check-conflicts', payload);
      setConflicts(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  async function handleSave(force) {
    const basicError = validateBasics();
    if (basicError) {
      setError(basicError);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = buildPayload(force);
      if (isEdit) {
        await api.put(`/placements/${placementId}`, payload);
      } else {
        await api.post('/placements', payload);
      }
      await onSaved();
    } catch (err) {
      if (err.body?.conflicts) {
        setConflicts({ conflicts: err.body.conflicts, hasConflict: true });
      }
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const hasConflict = conflicts?.hasConflict;

  return (
    <div className="entity-form">
      <div className="form-row">
        <label>Course</label>
        <select value={values.course_id} onChange={(e) => set('course_id', e.target.value)}>
          <option value="">-- select --</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} - {c.title}
            </option>
          ))}
        </select>
        {!values.course_id && initial?.course_code && (
          <small className="muted">Currently: {initial.course_code} - {initial.course_title}</small>
        )}
      </div>

      <div className="form-row">
        <label>Teacher *</label>
        <select value={values.teacher} onChange={(e) => set('teacher', e.target.value)}>
          <option value="">-- select --</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.id}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label>Allocation (optional)</label>
        <select value={values.allocation_id} onChange={(e) => set('allocation_id', e.target.value)}>
          <option value="">-- none --</option>
          {relevantAllocations.map((a) => (
            <option key={a.id} value={a.id}>
              {a.id}: {a.course_code} / {a.teacher}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label>Sections *</label>
        <div className="checkbox-list">
          {sections.map((s) => (
            <label key={s.id} className="checkbox-item">
              <input type="checkbox" checked={values.sections.includes(s.id)} onChange={() => toggleSection(s.id)} />
              {s.id}
            </label>
          ))}
        </div>
      </div>

      <div className="form-row">
        <label>Day *</label>
        <select value={values.day} onChange={(e) => set('day', e.target.value)}>
          {grid.days.map((d) => (
            <option key={d.code} value={d.code}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row two-col">
        <div>
          <label>Start slot *</label>
          <select value={values.startSlot} onChange={(e) => set('startSlot', e.target.value)}>
            <option value="">--</option>
            {grid.slots.map((s) => (
              <option key={s.index} value={s.index}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>End slot *</label>
          <select value={values.endSlot} onChange={(e) => set('endSlot', e.target.value)}>
            <option value="">--</option>
            {grid.slots.map((s) => (
              <option key={s.index} value={s.index}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <small className="muted">Slots must form one contiguous block (e.g. start=0, end=2 covers 3 half-hours).</small>

      <div className="form-row">
        <label>Delivery</label>
        <select value={values.delivery} onChange={(e) => set('delivery', e.target.value)}>
          {DELIVERIES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {values.delivery === 'in-room' && (
        <div className="form-row">
          <label>Room *</label>
          <select value={values.room} onChange={(e) => set('room', e.target.value)}>
            <option value="">-- select --</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="form-row two-col">
        <div>
          <label>Level</label>
          <select value={values.level} onChange={(e) => set('level', e.target.value)}>
            <option value="">(infer from course)</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Staffing</label>
          <select value={values.staffing} onChange={(e) => set('staffing', e.target.value)}>
            {STAFFINGS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      {conflicts && (
        <div className={hasConflict ? 'conflict-box conflict-bad' : 'conflict-box conflict-ok'}>
          {hasConflict ? (
            <>
              <strong>Conflicts found:</strong>
              <ul>
                {conflicts.conflicts.teacher.length > 0 && <li>Teacher double-booked with: {conflicts.conflicts.teacher.join(', ')}</li>}
                {conflicts.conflicts.room.length > 0 && <li>Room double-booked with: {conflicts.conflicts.room.join(', ')}</li>}
                {conflicts.conflicts.section.length > 0 && <li>Section double-booked with: {conflicts.conflicts.section.join(', ')}</li>}
              </ul>
            </>
          ) : (
            <strong>No conflicts - clear to save.</strong>
          )}
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="btn-secondary" onClick={handleCheck} disabled={checking || saving}>
          {checking ? 'Checking...' : 'Check conflicts'}
        </button>
        {hasConflict ? (
          <button type="button" className="btn-danger" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? 'Saving...' : 'Save anyway (force)'}
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create'}
          </button>
        )}
      </div>
    </div>
  );
}
