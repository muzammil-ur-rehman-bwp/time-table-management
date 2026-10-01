import { useData } from '../DataContext';
import { CrudPage } from '../components/CrudPage';

const KINDS = ['bs', 'external', 'fyp', 'grad'];

export default function Courses() {
  const { courses, sessions, sections } = useData();

  const fields = (editing) => [
    {
      name: 'session',
      label: 'Session',
      type: 'select',
      required: true,
      disabled: editing?.__isEdit,
      options: sessions.map((s) => ({ value: s.code, label: s.label })),
    },
    {
      name: 'code',
      label: 'Course code',
      required: true,
      disabled: editing?.__isEdit,
      placeholder: 'e.g. ARIN-1102',
      help: editing?.__isEdit
        ? 'Session + code form this course\'s id - cannot be changed here.'
        : 'Session + code together become this course\'s id.',
    },
    { name: 'title', label: 'Title', required: true },
    {
      name: 'credit_hours',
      label: 'Credit hours',
      placeholder: 'e.g. 3 (2-1)',
      help: 'Format "total (theory-lab)". theory_hours/lab_hours are inferred from this if left blank.',
    },
    { name: 'theory_hours', label: 'Theory hours', type: 'number' },
    { name: 'lab_hours', label: 'Lab hours', type: 'number' },
    { name: 'kind', label: 'Kind', type: 'select', options: KINDS.map((k) => ({ value: k, label: k })) },
    { name: 'meetings_per_week', label: 'Meetings per week', type: 'number' },
    { name: 'slots_per_meeting', label: 'Slots per meeting', type: 'number' },
    { name: 'placeholder_code', label: 'Placeholder code', type: 'checkbox' },
    {
      name: 'sections',
      label: 'Offered to sections',
      type: 'multiselect',
      options: sections.map((s) => ({ value: s.id, label: s.id })),
    },
  ];

  return (
    <CrudPage
      title="Courses"
      resource="courses"
      rows={courses}
      idOf={(c) => c.id}
      columns={[
        { key: 'id', label: 'Id' },
        { key: 'title', label: 'Title' },
        { key: 'credit_hours', label: 'Credit hours' },
        { key: 'kind', label: 'Kind' },
        { key: 'sections', label: 'Sections', render: (c) => (c.sections || []).length },
      ]}
      fields={fields}
    />
  );
}
