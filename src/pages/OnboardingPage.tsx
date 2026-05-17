import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, X, CheckCircle2, Crown } from 'lucide-react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Container from '../components/Container';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useToast } from '../context/ToastContext';
import { usersApi } from '../utils/apiClient';
import './OnboardingPage.css';

type Status = 'idle' | 'loading' | 'success' | 'error';

const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'Customer Success',
  'HR',
  'Finance',
  'Operations',
  'Legal',
  'Other',
];

const getRoleColor = (role: string) => {
  switch (role) {
    case 'super_admin': return 'from-purple-600 to-pink-600';
    case 'admin': return 'from-blue-600 to-cyan-600';
    default: return 'from-gray-600 to-gray-700';
  }
};

const getRoleLabel = (role: string) => {
  return role === 'super_admin' ? 'Super Admin' : role.charAt(0).toUpperCase() + role.slice(1);
};

async function cropImageToBlob(img: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const scaleX = img.naturalWidth / img.width;
  const scaleY = img.naturalHeight / img.height;
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d')!;

  // Create circular clipping path
  ctx.beginPath();
  ctx.arc(crop.width / 2, crop.height / 2, crop.width / 2, 0, Math.PI * 2);
  ctx.clip();

  ctx.drawImage(
    img,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas empty'));
    }, 'image/jpeg', 0.95);
  });
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, refetch } = useCurrentUser();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropImgRef = useRef<HTMLImageElement>(null);

  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [rawImage, setRawImage] = useState<string>('');
  const [crop, setCrop] = useState<Crop>({ unit: 'px', width: 200, height: 200, x: 0, y: 0 });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>(user?.role || 'user');
  const [status, setStatus] = useState<Status>('idle');
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    // After onboarding is complete, always check approval status:
    if (user?.onboarding_completed) {
      if (user.status === 'active') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/pending-approval', { replace: true });
      }
    }
  }, [user?.onboarding_completed, user?.status, navigate]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const minDim = Math.min(width, height);
    const startX = (width - minDim) / 2;
    const startY = (height - minDim) / 2;

    setCrop({
      unit: 'px',
      width: minDim * 0.8,
      height: minDim * 0.8,
      x: startX + (minDim * 0.1),
      y: startY + (minDim * 0.1),
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setRawImage(event.target?.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async () => {
    if (!cropImgRef.current) {
      showToast('Image not loaded. Please try again.', 'error');
      return;
    }

    if (!completedCrop || !completedCrop.width || !completedCrop.height) {
      showToast('Please adjust the crop area first', 'error');
      return;
    }

    try {
      const blob = await cropImageToBlob(cropImgRef.current, completedCrop);
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      setAvatarFile(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
        setShowCropModal(false);
        setRawImage('');
      };
      reader.readAsDataURL(file);
    } catch {
      showToast('Failed to crop image. Please try again.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim() || !department) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmation(false);
    setStatus('loading');
    try {
      // Upload avatar if provided (server updates profile; URL not needed for onboarding payload)
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        const avatarRes = await usersApi.uploadAvatar(formData);
        if (!avatarRes.ok) {
          await avatarRes.json().catch(() => ({}));
          setStatus('error');
          setShowConfirmation(false);
          showToast('Failed to upload avatar', 'error');
          return;
        }
      }

      // Save onboarding info
      const res = await usersApi.saveOnboarding(jobTitle, department);
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };

      if (!res.ok) {
        setStatus('error');
        setShowConfirmation(false);
        showToast(data.error || 'Failed to save onboarding info', 'error');
        return;
      }

      setStatus('success');
      await refetch();
    } catch {
      setStatus('error');
      setShowConfirmation(false);
      showToast('Network error. Please try again.', 'error');
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-decoration" />
      <Container maxWidth="sm">
        <motion.div
          className="onboarding-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div className="onboarding-logo" variants={itemVariants}>
            <Logo size="md" showText={true} vertical={true} />
          </motion.div>

          <motion.div className="onboarding-header" variants={itemVariants}>
            <h1 className="onboarding-title">Complete your profile</h1>
            <p className="onboarding-subtitle">
              Help us personalize your experience with a bit more about you
            </p>
          </motion.div>

          {user && (
            <motion.div className="onboarding-user-section" variants={itemVariants}>
              {/* Avatar Section */}
              <div className="onboarding-avatar-wrapper">
                <div className="onboarding-avatar-container">
                  {avatarPreview || user.avatar_url ? (
                    <img
                      key={avatarPreview || user.avatar_url}
                      src={avatarPreview || `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${user.avatar_url}`}
                      alt={user.first_name}
                      className="onboarding-avatar"
                    />
                  ) : (
                    <div className="onboarding-avatar-placeholder">
                      <span className="avatar-initials">{user.first_name[0]}{user.last_name[0]}</span>
                    </div>
                  )}
                  {avatarFile && (
                    <button
                      type="button"
                      className="onboarding-avatar-remove"
                      onClick={() => {
                        setAvatarFile(null);
                        setAvatarPreview('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="onboarding-avatar-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={status === 'loading'}
                >
                  <Upload size={16} />
                  {avatarFile ? 'Change Photo' : 'Upload Photo'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </div>

              {/* User Info Section */}
              <div className="onboarding-user-info">
                <div className="onboarding-name-section">
                  <h2 className="onboarding-user-name">
                    {user.first_name} {user.last_name}
                  </h2>
                  {user.email_is_verified && (
                    <div className="onboarding-verified-badge">
                      <CheckCircle2 size={16} />
                      <span>Verified</span>
                    </div>
                  )}
                </div>
                <p className="onboarding-user-email">{user.email}</p>

                {/* Role Selection */}
                {user.role === 'super_admin' ? (
                  <div className={`onboarding-role-badge bg-gradient-to-r ${getRoleColor(user.role)}`}>
                    <Crown size={14} />
                    <span>{getRoleLabel(user.role)}</span>
                  </div>
                ) : (
                  <div className="role-selection">
                    <label>Role</label>
                    <div className="role-options">
                      <button
                        type="button"
                        className={`role-option ${selectedRole === 'user' ? 'active' : ''}`}
                        onClick={() => setSelectedRole('user')}
                      >
                        User
                      </button>
                      <button
                        type="button"
                        className={`role-option ${selectedRole === 'admin' ? 'active' : ''}`}
                        onClick={() => setSelectedRole('admin')}
                      >
                        Admin
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          <form className="onboarding-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="jobTitle">
                <span>Job Title</span>
                <span className="text-red-400">*</span>
              </label>
              <input
                id="jobTitle"
                type="text"
                placeholder="e.g. Senior Engineer, Product Manager"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                disabled={status === 'loading'}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="department">
                <span>Department</span>
                <span className="text-red-400">*</span>
              </label>
              <select
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={status === 'loading'}
                className="form-select"
              >
                <option value="">Select a department</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              size="lg"
              loading={status === 'loading'}
              disabled={!jobTitle.trim() || !department || status === 'loading'}
              className="w-full onboarding-submit-btn"
            >
              Continue to Approval
            </Button>
          </form>

          <motion.div className="onboarding-footer" variants={itemVariants}>
            <p className="onboarding-step-counter">Step 2 of 3</p>
          </motion.div>
        </motion.div>
      </Container>

      {/* Crop Modal */}
      {showCropModal && (
        <motion.div
          className="crop-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="crop-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="crop-modal-header">
              <h3>Crop your photo</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCropModal(false);
                  setRawImage('');
                }}
                className="crop-modal-close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="crop-container">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
              >
                <img
                  ref={cropImgRef}
                  src={rawImage}
                  alt="Crop"
                  className="crop-image"
                  onLoad={onImageLoad}
                />
              </ReactCrop>
            </div>

            <div className="crop-modal-actions">
              <button
                type="button"
                onClick={() => {
                  setShowCropModal(false);
                  setRawImage('');
                }}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCropComplete}
                className="btn-confirm"
              >
                Apply Crop
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <motion.div
          className="crop-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="crop-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="crop-modal-header">
              <h3>Submit Application</h3>
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                className="crop-modal-close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="confirmation-content">
              <p className="confirmation-message">
                Are you sure you want to submit your application? Once submitted, it will be reviewed by an administrator.
              </p>
            </div>

            <div className="crop-modal-actions">
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                className="btn-cancel"
                disabled={status === 'loading'}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="btn-confirm"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? 'Submitting…' : 'Submit Application'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export default OnboardingPage;
