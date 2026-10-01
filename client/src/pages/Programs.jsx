import { useData } from '../DataContext';
import { CrudPage } from '../components/CrudPage';

export default function Programs() {
  const { programs } = useData();

  const fields = (editing) => [
    {
      name: 'prefix',
      label: 'Prefix',
      required: true,
      disabled: editing?.__isEdit,
      placeholder: 'e.g. BSARIN',
      help: "Also becomes this program's id.",
    },
    { name: 'name', label: 'Name', required: true, placeholder: 'e.g. BS AI' },
  ];

  return (
    <CrudPage
      title="Programs"
      resource="programs"
      rows={programs}
      idOf={(p) => p.prefix}
      columns={[
        { key: 'prefix', label: 'Prefix' },
        { key: 'name', label: 'Name' },
      ]}
      fields={fields}
    />
  );
}
