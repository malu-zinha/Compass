import { useState } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import { Sidebar } from '../components/layout';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Outlet context={{ openSidebar: () => setSidebarOpen(true) }} />
    </>
  );
}
export const useLayout = () => useOutletContext();
