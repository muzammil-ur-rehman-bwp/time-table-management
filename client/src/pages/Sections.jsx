import { useData } from '../DataContext';
import { CrudPage } from '../components/CrudPage';

const SHIFTS = ['Morning', 'Evening'];

export default function Sections() {
  const { sections, programs, sessions, grid } = useData();

  const fields = (editing) => [
    {
      name: 'id',
      label: 'Section id',
      required: true,
      disabled: editing?.__isEdit,
      placeholder: 'e.g. BSARIN-1ST-1M',
      help: 'Convention: <program_prefix>-<semester ordinal>-<group><shift letter>.',
    },
    {
      name: 'program_prefix',
      label: 'Program',
      type: 'select',
      options: programs.map((p) => ({ value: p.prefix, label: `${p.prefix} - ${p.name}` })),
    },
    { name: 'semester', label: 'Semester number', type: 'number' },
    { name: 'number', label: 'Section number', type: 'number' },
    { name: 'shift', label: 'Shift', type: 'select', options: SHIFTS.map((s) => ({ value: s, label: s })) },
    {
      name: 'session',
      label: 'Session',
      type: 'select',
      options: sessions.map((s) => ({ value: s.code, label: s.label })),
    },
    { name: 'group', label: 'Group', type: 'number' },
    { name: 'group_days', label: 'Group days label', placeholder: 'e.g. MON-THU' },
    {
      name: 'teaching_days',
      label: 'Teaching days',
      type: 'multiselect',
      options: grid.days.map((d) => ({ value: d.code, label: d.name })),
    },
  ];

  return (
    <CrudPage
      title="Sections"
      resource="sections"
      rows={sections}
      idOf={(s) => s.id}
      description="A section is one class group of students (a program + semester + shift + group)."
      transform={(v) => ({ ...v, teaching_day_count: (v.teaching_days || []).length })}
      columns={[
        { key: 'id', label: 'Section' },
        { key: 'program', label: 'Program', render: (s) => s.program || s.program_prefix },
        { key: 'semester', label: 'Sem' },
        { key: 'shift', label: 'Shift' },
        { key: 'session', label: 'Session' },
        { key: 'teaching_days', label: 'Teaching days', render: (s) => (s.teaching_days || []).join(', ') },
      ]}
      fields={fields}
    />
  );
}
