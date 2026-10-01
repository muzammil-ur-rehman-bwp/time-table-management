import { useData } from '../DataContext';
import { CrudPage } from '../components/CrudPage';

const TEACHER_STATUSES = [
  'Regular - Departmental',
  'Regular - Non Departmental',
  'Regular - Non Teaching',
  'Teaching Assistant',
  'Visiting',
];

export default function Teachers() {
  const { teachers } = useData();

  const fields = (editing) => [
    {
      name: 'name',
      label: 'Name',
      required: true,
      disabled: editing?.__isEdit,
      help: editing?.__isEdit
        ? 'Name doubles as this teacher\'s id across the schedule, so it cannot be changed here - delete and re-add instead.'
        : "Also becomes this teacher's id (must be unique).",
    },
    { name: 'salutation', label: 'Salutation', placeholder: 'e.g. Dr., Mr., Prof. Dr.' },
    { name: 'affiliation', label: 'Affiliation', placeholder: 'Department of Artificial Intelligence' },
    {
      name: 'teacher_status',
      label: 'Teacher status',
      type: 'select',
      options: TEACHER_STATUSES.map((s) => ({ value: s, label: s })),
    },
  ];

  return (
    <CrudPage
      title="Teachers"
      resource="teachers"
      rows={teachers}
      idOf={(t) => t.id}
      description="Teaching_days, sections, entries and courses below are computed live from placements and common courses - they can't be edited directly."
      columns={[
        { key: 'id', label: 'Name' },
        { key: 'teacher_status', label: 'Status' },
        { key: 'affiliation', label: 'Affiliation' },
        { key: 'entries', label: 'Entries' },
        { key: 'teaching_days', label: 'Teaching days', render: (t) => (t.teaching_days || []).join(', ') },
        { key: 'sections', label: 'Sections', render: (t) => (t.sections || []).length },
      ]}
      fields={fields}
    />
  );
}
