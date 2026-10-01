import { useData } from '../DataContext';
import { CrudPage } from '../components/CrudPage';

const DELIVERIES = ['in-room', 'online'];

export default function Allocations() {
  const { allocations, courses, teachers, sections } = useData();

  const fields = () => [
    {
      name: 'course_id',
      label: 'Course',
      type: 'select',
      required: true,
      options: courses.map((c) => ({ value: c.id, label: `${c.code} - ${c.title}` })),
    },
    {
      name: 'teacher',
      label: 'Teacher',
      type: 'select',
      required: true,
      options: teachers.map((t) => ({ value: t.id, label: t.id })),
    },
    {
      name: 'sections',
      label: 'Sections',
      type: 'multiselect',
      options: sections.map((s) => ({ value: s.id, label: s.id })),
    },
    { name: 'delivery', label: 'Delivery', type: 'select', options: DELIVERIES.map((d) => ({ value: d, label: d })) },
    { name: 'meetings_per_week', label: 'Meetings per week', type: 'number' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  return (
    <CrudPage
      title="Allocations"
      resource="allocations"
      rows={allocations}
      idOf={(a) => a.id}
      description="Allocation = which teacher is assigned to teach a course for which sections, before it is scheduled into a room/day/time. Create the Timetable entry afterwards to put it on the schedule."
      columns={[
        { key: 'id', label: 'Id' },
        { key: 'course_code', label: 'Course' },
        { key: 'teacher', label: 'Teacher' },
        { key: 'sections', label: 'Sections', render: (a) => (a.sections || []).join(', ') },
        { key: 'delivery', label: 'Delivery' },
        { key: 'scheduled', label: 'Scheduled?', render: (a) => (a.scheduled ? 'Yes' : 'No') },
      ]}
      fields={fields}
    />
  );
}
