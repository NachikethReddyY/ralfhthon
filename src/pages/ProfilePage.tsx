import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Camera, Shield, Mail, Calendar, Clock, CheckCircle2, TicketIcon, Star, Trash2 } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import Container from '../components/Container';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { usersApi, ticketsApi, type ApiTicket } from '../utils/apiClient';
import './ProfilePage.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function centerAspectCrop(width: number, height: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 80 }, aspect, width, height),
    width,
    height
  );
}

async function cropImageToBlob(img: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const scaleX = img.naturalWidth / img.width;
  const scaleY = img.naturalHeight / img.height;
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d')!;
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
    }, 'image/jpeg', 0.9);
  });
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser } = useCurrentUser();
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');

  // crop modal state
  const [showCropModal, setShowCropModal] = useState(false);
  const [srcImg, setSrcImg] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ticketsApi.list().then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setTickets(Array.isArray(data) ? data : []);
      }
    });
  }, []);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSrcImg(reader.result as string);
      setShowCropModal(true);
      setCrop(undefined);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }, []);

  const handleUpload = async () => {
    if (!completedCrop || !imgRef.current) return;
    setUploading(true);
    setUploadError('');
    try {
      const blob = await cropImageToBlob(imgRef.current, completedCrop);
      const formData = new FormData();
      formData.append('avatar', blob, 'avatar.jpg');
      const res = await usersApi.uploadAvatar(formData);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setUploadError((body as { error?: string }).error || 'Upload failed');
        return;
      }
      const data = await res.json();
      setUser((prev) => prev ? { ...prev, avatar_url: data.avatarUrl } : prev);
      setShowCropModal(false);
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmEmail !== user?.email) {
      alert('Email does not match. Please try again.');
      return;
    }

    if (!confirm(`Are you absolutely sure? This will permanently delete your account and cannot be undone.`)) {
      return;
    }

    try {
      const res = await usersApi.delete(user!.id);
      if (res.ok) {
        localStorage.removeItem('authToken');
        navigate('/login', { replace: true });
      } else {
        alert('Failed to delete account. Please try again.');
      }
    } catch {
      alert('Error deleting account. Please try again.');
    }
  };

  const resolved = tickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length;
  const open = tickets.filter((t) => ['open', 'assigned', 'in_progress', 'pending_routing'].includes(t.status)).length;
  const p1 = tickets.filter((t) => t.priority === 'P1').length;
  const roleBadge = user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : 'User';
  const roleBadgeClass = user?.role === 'super_admin' ? 'badge-super' : user?.role === 'admin' ? 'badge-admin' : 'badge-user';

  return (
    <DashboardLayout>
      <div className="dashboard-content py-8">
        <Container maxWidth="xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="profile-wrapper"
          >
            {/* Avatar + Name Card */}
            <div className="profile-hero">
              <div className="profile-avatar-wrap">
                {user?.avatar_url ? (
                  <img
                    src={`${API_BASE}${user.avatar_url}`}
                    alt="avatar"
                    className="profile-avatar-img"
                  />
                ) : (
                  <div className="profile-avatar-placeholder">
                    {user ? `${user.first_name[0]}${user.last_name[0]}` : '?'}
                  </div>
                )}
                <button
                  className="profile-avatar-edit-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Change avatar"
                >
                  <Camera size={16} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileSelect}
                  style={{ display: 'none' }}
                />
              </div>

              <div className="profile-hero-info">
                <h1 className="profile-name">
                  {user?.first_name} {user?.last_name}
                </h1>
                <span className={`profile-role-badge ${roleBadgeClass}`}>
                  <Shield size={12} />
                  {roleBadge}
                </span>
                <div className="profile-meta-row">
                  <span><Mail size={13} />{user?.email}</span>
                  <span>
                    <Calendar size={13} />
                    Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
                  </span>
                  <span>
                    <Clock size={13} />
                    Last login {user?.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Account Statistics */}
            <div className="profile-stats-section">
              <h2 className="profile-section-title">Account Statistics</h2>
              <div className="profile-stats-grid">
                <div className="profile-stat-card">
                  <TicketIcon size={20} className="psc-icon blue" />
                  <div className="psc-value">{tickets.length}</div>
                  <div className="psc-label">Total Tickets</div>
                </div>
                <div className="profile-stat-card">
                  <CheckCircle2 size={20} className="psc-icon green" />
                  <div className="psc-value">{resolved}</div>
                  <div className="psc-label">Resolved</div>
                </div>
                <div className="profile-stat-card">
                  <Clock size={20} className="psc-icon orange" />
                  <div className="psc-value">{open}</div>
                  <div className="psc-label">Open / In Progress</div>
                </div>
                <div className="profile-stat-card">
                  <Star size={20} className="psc-icon red" />
                  <div className="psc-value">{p1}</div>
                  <div className="psc-label">P1 Critical</div>
                </div>
                <div className="profile-stat-card">
                  <Shield size={20} className="psc-icon purple" />
                  <div className="psc-value">
                    {user?.email_is_verified ? '✓' : '✗'}
                  </div>
                  <div className="psc-label">Email Verified</div>
                </div>
                <div className="profile-stat-card">
                  <Calendar size={20} className="psc-icon muted" />
                  <div className="psc-value">
                    {user?.created_at
                      ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
                      : 0}
                  </div>
                  <div className="psc-label">Days Active</div>
                </div>
              </div>
            </div>

            {/* Recent Tickets */}
            <div className="profile-recent-section">
              <h2 className="profile-section-title">Recent Activity</h2>
              <div className="profile-recent-list">
                {tickets.slice(0, 5).map((t) => (
                  <div key={t.id} className="profile-recent-item">
                    <span className={`profile-priority-dot p${t.priority.toLowerCase()}`} />
                    <div className="pri-info">
                      <span className="pri-title">{t.title}</span>
                      <span className="pri-meta">{t.category_name} · {t.status.replace(/_/g, ' ')}</span>
                    </div>
                    <span className="pri-date">{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
                {tickets.length === 0 && (
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>No tickets yet.</p>
                )}
              </div>
            </div>
          </motion.div>
        </Container>
      </div>

      {/* Crop Modal */}
      {showCropModal && (
        <div className="crop-modal-overlay">
          <div className="crop-modal">
            <h3>Crop your avatar</h3>
            <p>Drag to adjust the crop area, then save.</p>
            {uploadError && <p className="crop-error">{uploadError}</p>}
            <div className="crop-container">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
              >
                <img
                  ref={imgRef}
                  src={srcImg}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  style={{ maxHeight: '400px', maxWidth: '100%' }}
                />
              </ReactCrop>
            </div>
            <div className="crop-actions">
              <button
                className="crop-btn-cancel"
                onClick={() => { setShowCropModal(false); setUploadError(''); }}
              >
                Cancel
              </button>
              <button
                className="crop-btn-save"
                onClick={handleUpload}
                disabled={uploading || !completedCrop}
              >
                {uploading ? 'Uploading…' : 'Save Avatar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="profile-danger-zone"
      >
        <div className="danger-zone-header">
          <h3 style={{ margin: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trash2 size={18} />
            Danger Zone
          </h3>
          <p style={{ margin: '4px 0 0 0', color: '#9ca3af', fontSize: '13px' }}>
            Permanent actions that cannot be undone
          </p>
        </div>

        {!showDeleteConfirm ? (
          <div style={{ padding: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)' }}>
            <p style={{ margin: '0 0 12px 0', color: '#rgb(255,0,0)', fontSize: '13px' }}>
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                padding: '10px 16px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Trash2 size={14} />
              Delete My Account
            </button>
          </div>
        ) : (
          <div style={{ padding: '16px', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)' }}>
            <p style={{ margin: '0 0 12px 0', color: '#d1d5db', fontSize: '13px', fontWeight: '600' }}>
              To confirm deletion, please type your email address:
            </p>
            <input
              type="email"
              placeholder="Enter your email"
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                background: 'rgba(31, 34, 40, 0.6)',
                color: '#f7f8f8',
                fontSize: '13px',
                marginBottom: '12px',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmEmail('');
                }}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmEmail !== user?.email}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: deleteConfirmEmail === user?.email ? '#ef4444' : 'rgba(239, 68, 68, 0.5)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: deleteConfirmEmail === user?.email ? 'pointer' : 'not-allowed',
                  opacity: deleteConfirmEmail === user?.email ? 1 : 0.5,
                }}
              >
                Permanently Delete
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}

export default ProfilePage;
