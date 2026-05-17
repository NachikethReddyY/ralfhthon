import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Polling interval in ms
const POLL_MS = 5000;

import { motion, type Variants } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import Logo from '../components/Logo';
import Container from '../components/Container';
import { useCurrentUser } from '../hooks/useCurrentUser';
import './PendingApprovalPage.css';

export function PendingApprovalPage() {
  const navigate = useNavigate();
  const { user, refetch } = useCurrentUser();

  // Poll user status every 5s and auto-redirect if approved
  useEffect(() => {
    if (user?.status === 'active') {
      navigate('/dashboard', { replace: true });
      return;
    }
    const interval = setInterval(() => {
      refetch();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [user?.status, navigate, refetch]);

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  const checkmarkVariants: Variants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15,
        delay: 0.2,
      },
    },
  };

  return (
    <div className="pending-approval-page">
      <div className="pending-approval-decoration" />
      <Container maxWidth="sm">
        <motion.div
          className="pending-approval-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div className="pending-approval-logo" variants={itemVariants}>
            <Logo size="md" showText={true} vertical={true} />
          </motion.div>

          <motion.div className="pending-approval-content" variants={itemVariants}>
            <motion.div className="pending-approval-checkmark" variants={checkmarkVariants}>
              <CheckCircle2 size={80} />
            </motion.div>

            <h1 className="pending-approval-title">Application Submitted</h1>

            <p className="pending-approval-message">
              Pending Approval. Please wait.
            </p>

            <p className="pending-approval-description">
              Your application has been successfully submitted. An administrator will review your profile and approve your access soon.
            </p>
          </motion.div>

          <motion.div className="pending-approval-footer" variants={itemVariants}>
            <p className="pending-approval-note">
              You will be notified once your account is approved.
            </p>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
}

export default PendingApprovalPage;
