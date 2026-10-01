import { useData } from '../DataContext';
import { DataTable } from '../components/DataTable';

export default function Reference() {
  const { commonCourses, finalYearProjects, removedOfferings, unstaffed } = useData();

  return (
    <section>
      <h2>Reference lists (read-only)</h2>
      <p className="muted">
        These come from external/authoritative sources (the centrally-arranged common-course timetable,
        FYP supervision records) or have a shape too different to generalize into one form. This app
        displays them for context but doesn't offer CRUD here - edit{' '}
        <code>time-table-fall-2026.json</code> directly if you need to change them.
      </p>

      <h3>Common courses ({commonCourses.length})</h3>
      <DataTable
        columns={[
          { key: 'id', label: 'Id' },
          { key: 'day', label: 'Day' },
          { key: 'course_code', label: 'Course' },
          { key: 'course_title', label: 'Title' },
          { key: 'teacher', label: 'Teacher' },
          { key: 'sections', label: 'Sections', render: (c) => (c.sections || []).join(', ') },
          { key: 'venue', label: 'Venue' },
        ]}
        rows={commonCourses}
        rowKey={(c) => c.id}
      />

      <h3>Final year projects ({finalYearProjects.length})</h3>
      <DataTable
        columns={[
          { key: 'section', label: 'Section' },
          { key: 'course_code', label: 'Course' },
          { key: 'course_title', label: 'Title' },
          { key: 'supervisor', label: 'Supervisor' },
        ]}
        rows={finalYearProjects}
        rowKey={(f) => `${f.section}-${f.course_code}`}
      />

      <h3>Removed offerings ({removedOfferings.length})</h3>
      <DataTable
        columns={[
          { key: 'section', label: 'Section' },
          { key: 'course_code', label: 'Course' },
          { key: 'course_title', label: 'Title' },
          { key: 'reason', label: 'Reason' },
        ]}
        rows={removedOfferings}
        rowKey={(r) => `${r.section}-${r.course_code}`}
      />

      <h3>Unstaffed offerings ({unstaffed.length})</h3>
      <DataTable
        columns={[
          { key: 'section', label: 'Section' },
          { key: 'course_code', label: 'Course' },
        ]}
        rows={unstaffed}
        rowKey={(u) => `${u.section}-${u.course_code}`}
        emptyText="None."
      />
    </section>
  );
}
