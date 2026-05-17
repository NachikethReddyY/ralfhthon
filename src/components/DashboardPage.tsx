import { motion } from 'framer-motion';
import Header from './Header';
import Container from './Container';
import './DashboardPage.css';

export function DashboardPage() {
  return (
    <div className="dashboard-page">
      <Header />

      <main className="dashboard-main">
        <Container maxWidth="lg">
          <motion.div
            className="dashboard-placeholder"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="placeholder-icon">✓</div>
            <h1 className="placeholder-title">Welcome to Your Dashboard</h1>
            <p className="placeholder-subtitle">
              Your account has been created successfully. The dashboard is coming soon!
            </p>
            <p className="placeholder-text">
              Here you'll be able to:
            </p>
            <ul className="placeholder-features">
              <li>Submit and track support tickets</li>
              <li>Monitor ticket status in real-time</li>
              <li>View ticket history</li>
              <li>Receive automated updates</li>
            </ul>
          </motion.div>
        </Container>
      </main>
    </div>
  );
}

export default DashboardPage;
