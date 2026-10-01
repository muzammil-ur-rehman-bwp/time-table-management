import { useData } from '../DataContext';
import { CrudPage } from '../components/CrudPage';

export default function Sessions() {
  const { sessions } = useData();

  const fields = (editing) => [
    {
      name: 'code',
      label: 'Code',
      required: true,
      disabled: editing?.__isEdit,
      placeholder: 'e.g. Fall-26',
      help: "Also becomes this session's id.",
    },
    { name: 'label', label: 'Label', placeholder: 'e.g. Fall 2026' },
    { name: 'semester', label: 'Semester index', type: 'number', help: 'Used only for ordering sessions.' },
  ];

  return (
    <CrudPage
      title="Sessions"
      resource="sessions"
      rows={sessions}
      idOf={(s) => s.code}
      columns={[
        { key: 'code', label: 'Code' },
        { key: 'label', label: 'Label' },
        { key: 'semester', label: 'Semester index' },
      ]}
      fields={fields}
    />
  );
}
