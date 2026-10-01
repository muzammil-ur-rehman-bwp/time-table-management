import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';

const DataContext = createContext(null);

const EMPTY = {
  teachers: [],
  courses: [],
  rooms: [],
  sections: [],
  programs: [],
  sessions: [],
  allocations: [],
  placements: [],
  grid: { days: [], slots: [], slot_minutes: 30 },
  meta: null,
  index: null,
  commonCourses: [],
  finalYearProjects: [],
  removedOfferings: [],
  unstaffed: [],
  conflicts: [],
};

export function DataProvider({ children }) {
  const [state, setState] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        teachers,
        courses,
        rooms,
        sections,
        programs,
        sessions,
        allocations,
        placements,
        grid,
        meta,
        index,
        commonCourses,
        finalYearProjects,
        removedOfferings,
        unstaffed,
        conflicts,
      ] = await Promise.all([
        api.get('/teachers'),
        api.get('/courses'),
        api.get('/rooms'),
        api.get('/sections'),
        api.get('/programs'),
        api.get('/sessions'),
        api.get('/allocations'),
        api.get('/placements'),
        api.get('/grid'),
        api.get('/meta'),
        api.get('/meta/index'),
        api.get('/meta/common-courses'),
        api.get('/meta/final-year-projects'),
        api.get('/meta/removed-offerings'),
        api.get('/meta/unstaffed'),
        api.get('/conflicts'),
      ]);
      setState({
        teachers,
        courses,
        rooms,
        sections,
        programs,
        sessions,
        allocations,
        placements,
        grid,
        meta,
        index,
        commonCourses,
        finalYearProjects,
        removedOfferings,
        unstaffed,
        conflicts,
      });
    } catch (err) {
      setError(err.message || 'Failed to load data from the API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  return (
    <DataContext.Provider value={{ ...state, loading, error, reloadAll }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
