import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Container from '../components/Container';
import './ErrorPage.css';

export function NotFoundPage() {
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
          <motion.div className="error-code error-code--404" variants={codeVariants}>
            <div className="error-glitch" />
            404
          </motion.div>

          <motion.div className="error-content" variants={contentVariants}>
            <h1 className="error-title">Page not found</h1>
            <p className="error-message">
              The page you're looking for doesn't exist or has been moved. Let's get you back on track.
            </p>
          </motion.div>

          <motion.div className="error-actions" variants={buttonVariants}>
            <Button onClick={() => navigate('/dashboard')} size="lg">
              Go to Dashboard
            </Button>
            <Button onClick={() => navigate(-1)} variant="secondary" size="lg">
              Go Back
            </Button>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
}

export default NotFoundPage;
