import { useMemo, useState } from 'react';
import { useData } from '../DataContext';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { PlacementForm } from '../components/PlacementForm';
import { api } from '../api';

export default function Timetable() {
  const { placements, grid, rooms, sections, reloadAll } = useData();
  const [editing, setEditing] = useState(null); // null | {} | placement
  const [view, setView] = useState('list');
  const [focusType, setFocusType] = useState('room');
  const [focusValue, setFocusValue] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [error, setError] = useState(null);

  const filtered = useMemo(
    () =>
      placements.filter(
        (p) =>
          (!filterDay || p.day === filterDay) &&
          (!filterTeacher || p.teacher.toLowerCase().includes(filterTeacher.toLowerCase()))
      ),
    [placements, filterDay, filterTeacher]
  );

  async function handleDelete(row) {
    if (!window.confirm(`Delete placement ${row.id} (${row.course_code} / ${row.teacher})?`)) return;
    setError(null);
    try {
      await api.del(`/placements/${row.id}`);
      await reloadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaved() {
    setEditing(null);
    await reloadAll();
  }

  const focusOptions = focusType === 'room' ? rooms.map((r) => r.id) : sections.map((s) => s.id);

  function cellContent(dayCode, slotIndex) {
    const matches = placements.filter((p) => {
      if (p.day !== dayCode || !p.slots.includes(slotIndex)) return false;
      if (!focusValue) return false;
      return focusType === 'room' ? p.room === focusValue : p.sections.includes(focusValue);
    });
    if (!matches.length) return null;
    return matches.map((p) => (
      <div key={p.id} className="grid-cell-entry">
        <strong>{p.course_code}</strong>
        <span>{p.teacher}</span>
        {focusType === 'section' && <span>{p.room || p.delivery}</span>}
      </div>
    ));
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h2>Timetable (Placements)</h2>
          <p className="muted">
            A placement is one scheduled class: course + teacher + sections, in a room (or online), on a
            day and a contiguous block of slots. New placements are checked against the existing schedule
            for teacher/room/section double-bookings.
          </p>
        </div>
        <div className="btn-group">
          <button className={view === 'list' ? 'btn-toggle active' : 'btn-toggle'} onClick={() => setView('list')}>
            List
          </button>
          <button className={view === 'grid' ? 'btn-toggle active' : 'btn-toggle'} onClick={() => setView('grid')}>
            Weekly grid
          </button>
          <button className="btn-primary" onClick={() => setEditing({})}>
            + Add placement
          </button>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      {view === 'list' && (
        <>
          <div className="filter-row">
            <select value={filterDay} onChange={(e) => setFilterDay(e.target.value)}>
              <option value="">All days</option>
              {grid.days.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              placeholder="Filter by teacher..."
              value={filterTeacher}
              onChange={(e) => setFilterTeacher(e.target.value)}
            />
          </div>
          <DataTable
            columns={[
              { key: 'id', label: 'Id' },
              { key: 'day', label: 'Day' },
              { key: 'time', label: 'Time', render: (p) => `${p.start}-${p.end}` },
              { key: 'course_code', label: 'Course' },
              { key: 'teacher', label: 'Teacher' },
              { key: 'sections', label: 'Sections', render: (p) => p.sections.join(', ') },
              { key: 'room', label: 'Room/Delivery', render: (p) => p.room || p.delivery },
            ]}
            rows={filtered}
            rowKey={(p) => p.id}
            onEdit={(row) => setEditing(row)}
            onDelete={handleDelete}
          />
        </>
      )}

      {view === 'grid' && (
        <>
          <div className="filter-row">
            <select value={focusType} onChange={(e) => { setFocusType(e.target.value); setFocusValue(''); }}>
              <option value="room">View by room</option>
              <option value="section">View by section</option>
            </select>
            <select value={focusValue} onChange={(e) => setFocusValue(e.target.value)}>
              <option value="">-- pick {focusType} --</option>
              {focusOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          {focusValue ? (
            <div className="table-wrap">
              <table className="grid-table">
                <thead>
                  <tr>
                    <th>Slot</th>
                    {grid.days.map((d) => (
                      <th key={d.code}>{d.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.slots.map((s) => (
                    <tr key={s.index}>
                      <td className="slot-label">{s.label}</td>
                      {grid.days.map((d) => (
                        <td key={d.code}>{cellContent(d.code, s.index)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">Pick a {focusType} to see its weekly grid.</p>
          )}
        </>
      )}

      {editing && (
        <Modal title={editing.id ? `Edit ${editing.id}` : 'New placement'} onClose={() => setEditing(null)} wide>
          <PlacementForm
            initial={editing.id ? editing : null}
            isEdit={!!editing.id}
            placementId={editing.id}
            onSaved={handleSaved}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </section>
  );
}
