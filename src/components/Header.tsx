import { Link } from 'react-router-dom';
import Logo from './Logo';
import Button from './Button';
import './Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <Link to="/dashboard/tickets" className="header-logo-link">
          <Logo size="sm" showText={true} />
        </Link>

        <nav className="header-nav">
          {/* Links removed as requested */}
        </nav>

        <div className="header-actions">
          <Link to="/login">
            <Button variant="secondary" size="sm">Log in</Button>
          </Link>
          <Link to="/signup">
            <Button variant="secondary-dark" size="sm">Try Lumina</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Header;
