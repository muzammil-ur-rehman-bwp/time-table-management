import { useData } from '../DataContext';

export default function Dashboard() {
  const { meta, conflicts, loading } = useData();

  if (loading || !meta) return <p className="muted">Loading...</p>;

  const counts = meta.counts || {};
  const tiles = [
    ['Teachers', counts.teachers],
    ['Courses', counts.courses],
    ['Rooms', counts.rooms],
    ['Sections', counts.sections],
    ['Allocations', counts.allocations],
    ['Placements', counts.placements],
    ['Common course blocks', counts.common_course_blocks],
    ['Final year projects', counts.final_year_projects],
  ];

  return (
    <section>
      <h2>{meta.title}</h2>
      <p className="muted">
        {meta.department} - {meta.faculty} - {meta.university}
      </p>

      <div className="tile-grid">
        {tiles.map(([label, value]) => (
          <div className="tile" key={label}>
            <div className="tile-value">{value ?? '-'}</div>
            <div className="tile-label">{label}</div>
          </div>
        ))}
      </div>

      <h3>Live schedule conflicts</h3>
      {conflicts.length === 0 ? (
        <p className="muted">No teacher/room/section double-bookings detected.</p>
      ) : (
        <ul>
          {conflicts.map((c) => (
            <li key={c.placement_id}>
              <strong>{c.placement_id}</strong>:{' '}
              {[
                c.conflicts.teacher.length && `teacher clashes with ${c.conflicts.teacher.join(', ')}`,
                c.conflicts.room.length && `room clashes with ${c.conflicts.room.join(', ')}`,
                c.conflicts.section.length && `section clashes with ${c.conflicts.section.join(', ')}`,
              ]
                .filter(Boolean)
                .join('; ')}
            </li>
          ))}
        </ul>
      )}

      <h3>About this data</h3>
      <p className="muted">
        This app reads and writes <code>time-table-fall-2026.json</code> directly. The counts above and the
        conflict scan are computed live; the historical <code>meta.verification</code> / <code>meta.rules</code>{' '}
        block from the original generation pipeline is left untouched - see the project README for what this
        app does and doesn't re-validate.
      </p>
    </section>
  );
}
