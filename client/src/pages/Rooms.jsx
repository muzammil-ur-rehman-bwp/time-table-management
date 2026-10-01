import { useData } from '../DataContext';
import { CrudPage } from '../components/CrudPage';

export default function Rooms() {
  const { rooms } = useData();

  const fields = (editing) => [
    {
      name: 'name',
      label: 'Room name/number',
      required: true,
      disabled: editing?.__isEdit,
      help: editing?.__isEdit ? 'Also this room\'s id - cannot be changed here.' : "Also becomes this room's id.",
    },
    { name: 'building', label: 'Building code', placeholder: 'DAI' },
    { name: 'building_name', label: 'Building name' },
    { name: 'owner', label: 'Owner' },
    {
      name: 'on_room_sheet',
      label: 'On the room sheet (counts toward capacity)',
      type: 'checkbox',
    },
    {
      name: 'availability',
      label: 'Weekly availability (JSON)',
      type: 'json',
      jsonDefault: {},
      help: 'Object of day code -> array of slot codes, e.g. {"MON":["08:30AM","09:00AM"]}. units_available/units_used are computed from this and from placements.',
    },
  ];

  return (
    <CrudPage
      title="Rooms"
      resource="rooms"
      rows={rooms}
      idOf={(r) => r.id}
      description="units_used/units_available are computed live from placements and the availability field."
      columns={[
        { key: 'id', label: 'Room' },
        { key: 'building', label: 'Building' },
        { key: 'owner', label: 'Owner' },
        { key: 'units_used', label: 'Units used' },
        { key: 'units_available', label: 'Units available' },
      ]}
      fields={fields}
    />
  );
}
