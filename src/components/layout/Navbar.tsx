import { Link, NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: '首页' },
  { to: '/scripts', label: '剧本库' },
];

export function Navbar() {
  return (
    <header className="border-b border-white/10 bg-ink/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="font-display text-lg tracking-[0.2em] text-gold">
          真相局
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'text-paper' : 'hover:text-gold')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}