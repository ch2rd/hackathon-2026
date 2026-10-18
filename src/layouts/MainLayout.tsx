import { Outlet } from 'react-router-dom';
import { Footer } from '../components/layout/Footer';
import { Navbar } from '../components/layout/Navbar';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-ink text-paper">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}