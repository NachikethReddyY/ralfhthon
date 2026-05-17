import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Container from '../components/Container';
import './ErrorPage.css';

export function ServerErrorPage() {
  const navigate = useNavigate();

  const codeVariants = {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.2 } },
  };

  const contentVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.4 } },
  };

  const buttonVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.6 } },
  };

  return (
    <div className="error-page">
      <div className="error-decoration" />
      <Container maxWidth="md">
        <motion.div
          className="error-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div className="error-code error-code--500" variants={codeVariants}>
            <div className="error-glitch error-glitch--500" />
            500
          </motion.div>

          <motion.div className="error-content" variants={contentVariants}>
            <h1 className="error-title">Something went wrong</h1>
            <p className="error-message">
              We're experiencing a server issue. Our team has been notified and is working on a fix. Please try again shortly.
            </p>
          </motion.div>

          <motion.div className="error-actions" variants={buttonVariants}>
            <Button onClick={() => window.location.reload()} size="lg">
              Retry
            </Button>
            <Button onClick={() => navigate('/dashboard')} variant="secondary" size="lg">
              Go to Dashboard
            </Button>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
}

export default ServerErrorPage;
