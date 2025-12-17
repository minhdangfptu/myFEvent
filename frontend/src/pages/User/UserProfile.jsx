import { useEffect, useRef, useState } from 'react';
import UserLayout from '../../components/UserLayout';
import { userApi } from '../../apis/userApi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Loading from '~/components/Loading';
import { useAuth } from '../../contexts/AuthContext';
import authStorage from '../../utils/authStorage';
import { User, Mail, Phone, FileText, Target } from 'lucide-react';

export default function UserProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setUser } = useAuth?.() || {};

  // notify wrapper using react-toastify
  const notify = (type, msg) => {
    if (!msg) return;
    if (type === 'success') toast.success(msg);
    else if (type === 'error') toast.error(msg);
    else toast.warn(msg);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await userApi.getProfile();
        setProfile(res?.data || res || null);
      } catch (e) {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', bio: '', highlight: '', tags: [] });
  const [phoneError, setPhoneError] = useState('');

  // Validate phone number (Vietnamese format)
  const validatePhone = (phone) => {
    if (!phone || phone.trim() === '') {
      return ''; // Empty is allowed
    }

    // Remove spaces and dashes
    const cleanPhone = phone.replace(/[\s-]/g, '');

    // Vietnamese phone: starts with 0 and has 10 digits, or +84 with 11-12 digits
    const vnPhoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
    const intlPhoneRegex = /^\+84[3|5|7|8|9][0-9]{8}$/;

    if (!vnPhoneRegex.test(cleanPhone) && !intlPhoneRegex.test(cleanPhone)) {
      return 'Số điện thoại không hợp lệ. VD: 0912345678 hoặc +84912345678';
    }

    return '';
  };

  const handlePhoneChange = (value) => {
    // Only allow numbers, +, spaces, and dashes
    const filtered = value.replace(/[^0-9+\s-]/g, '');
    setForm({ ...form, phone: filtered });
    setPhoneError(validatePhone(filtered));
  };

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [unsavedAvatar, setUnsavedAvatar] = useState(false);      // NEW: cờ ảnh chưa lưu
  const objectUrlRef = useRef(null);                              // NEW: lưu URL để revoke

  const [showModal, setShowModal] = useState(false);
  const [modalSelected, setModalSelected] = useState(new Set());

  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);  // modal xem lớn
  const [showAvatarConfirm, setShowAvatarConfirm] = useState(false);  // NEW: modal xác nhận lưu
  const [performingAvatarSave, setPerformingAvatarSave] = useState(false); // NEW: loading khi lưu avatar

  const display = (value) => value || '';

  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.fullName || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        highlight: profile.highlight || '',
        tags: Array.isArray(profile.tags) ? profile.tags : []
      });
      setAvatarPreview(profile?.avatarUrl || null);
      setUnsavedAvatar(false);
      cleanupObjectUrl();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const cleanupObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  // Cảnh báo khi rời trang nếu còn ảnh chưa lưu
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (unsavedAvatar) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    if (unsavedAvatar) {
      window.addEventListener('beforeunload', onBeforeUnload);
      return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }
  }, [unsavedAvatar]);

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // Lưu toàn bộ hồ sơ (bao gồm avatar nếu có)
  const handleSave = async () => {
    if (saving) return;

    // Validate phone before saving
    const phoneValidationError = validatePhone(form.phone);
    if (phoneValidationError) {
      setPhoneError(phoneValidationError);
      notify('error', 'Vui lòng kiểm tra lại số điện thoại.');
      return;
    }

    setSaving(true);
    try {
      // Đảm bảo gửi đầy đủ các field, kể cả khi chúng là empty string
      const payload = {
        fullName: form.fullName || '',
        phone: form.phone || '',
        bio: form.bio || '',
        highlight: form.highlight || '',
        tags: Array.isArray(form.tags) ? form.tags : []
      };
      
      // Chỉ gửi avatarUrl nếu có file mới hoặc muốn giữ nguyên avatar hiện tại
      if (avatarFile) {
        try {
          const b64 = await fileToBase64(avatarFile);
          payload.avatarUrl = b64;
        } catch (_) {
          notify('warning', 'Không thể đọc ảnh đại diện. Vui lòng thử lại.');
          setSaving(false);
          return;
        }
      }
      // Nếu không có avatarFile mới, không gửi avatarUrl để giữ nguyên avatar hiện tại

      const response = await userApi.updateProfile(payload);

      // Backend trả về data đầy đủ trong response
      const newProfile = response?.data || null;

      if (newProfile) {
        setProfile(newProfile);
        setForm({
          fullName: newProfile.fullName || '',
          phone: newProfile.phone || '',
          bio: newProfile.bio || '',
          highlight: newProfile.highlight || '',
          tags: Array.isArray(newProfile.tags) ? newProfile.tags : []
        });
        setAvatarPreview(newProfile.avatarUrl || null);
        setUnsavedAvatar(false);
        // Đồng bộ context, storage, event
        if (setUser) setUser(newProfile);
        authStorage.setUser(newProfile);
        window.dispatchEvent(new CustomEvent('user-updated', { detail: newProfile }));
        try {
          window.dispatchEvent(new CustomEvent('user-updated', { detail: newProfile }));
        } catch (e) {}
      }

      setEditing(false);
      setAvatarFile(null);
      cleanupObjectUrl();

      notify('success', 'Lưu thay đổi thành công!');
      if (payload.avatarUrl) {
        notify('success', 'Ảnh đại diện đã được cập nhật.');
      }
    } catch (e) {
      console.error('Save profile error:', e);
      const errorMessage = e?.response?.data?.message || e?.message || 'Lưu thất bại. Vui lòng thử lại.';
      notify('error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Chỉ lưu avatar (giống Facebook: chọn ảnh → xác nhận → lưu)
  const handleConfirmSaveAvatar = async () => {
    if (!avatarFile) {
      setShowAvatarConfirm(false);
      notify('warning', 'Chưa chọn ảnh mới.');
      return;
    }
    setPerformingAvatarSave(true);
    try {
      const b64 = await fileToBase64(avatarFile);
      const response = await userApi.updateProfile({ avatarUrl: b64 });

      // Backend trả về data đầy đủ trong response
      const newProfile = response?.data || null;
      if (newProfile) {
        setProfile(newProfile);

        // Dispatch event to update other components
        if (setUser) setUser(newProfile);
        authStorage.setUser(newProfile);
        window.dispatchEvent(new CustomEvent('user-updated', { detail: newProfile }));
        try {
          window.dispatchEvent(new CustomEvent('user-updated', { detail: newProfile }));
        } catch (e) {}
      }

      setShowAvatarConfirm(false);
      setUnsavedAvatar(false);
      setAvatarFile(null);
      cleanupObjectUrl();
      notify('success', 'Ảnh đại diện đã được lưu.');
    } catch (e) {
      console.error('Save avatar error:', e);
      const errorMessage = e?.response?.data?.message || e?.message || 'Lưu ảnh đại diện thất bại. Vui lòng thử lại.';
      notify('error', errorMessage);
    } finally {
      setPerformingAvatarSave(false);
    }
  };

  const committeeOptions = [
    'Hậu cần', 'Văn hóa', 'HR', 'Tài chính', 'Truyền thông', 'Tổ chức', 'Kỹ thuật'
  ];

  const handleAvatarChange = (file) => {
    if (!file) return;
    setAvatarFile(file);
    cleanupObjectUrl();
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setAvatarPreview(url);     // hiển thị ngay
    setUnsavedAvatar(true);    // đánh dấu chưa lưu
    notify('warning', 'Ảnh đại diện mới chưa được lưu.');
  };

  const openTagModal = () => {
    setModalSelected(new Set(form.tags || []));
    setShowModal(true);
  };

  const toggleModalSelect = (tag) => {
    const s = new Set(modalSelected);
    if (s.has(tag)) s.delete(tag); else s.add(tag);
    setModalSelected(s);
  };

  const confirmModal = () => {
    const merged = Array.from(new Set([...(form.tags || []), ...Array.from(modalSelected)]));
    setForm({ ...form, tags: merged });
    setShowModal(false);
  };

  const handleViewAvatar = () => {
    setShowAvatarDropdown(false);
    setShowAvatarModal(true);
  };

  const handleChangeAvatarClick = () => {
    setShowAvatarDropdown(false);
    document.getElementById('avatar-upload-input')?.click();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowAvatarDropdown(false);
    if (showAvatarDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showAvatarDropdown]);

  if (loading) {
    return (
      <UserLayout title="Hồ sơ của tôi" activePage="account">
        <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <Loading />
          <div className="text-muted mt-3" style={{ fontSize: 16, fontWeight: 500 }}>Đang tải hồ sơ...</div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout title="Hồ sơ của tôi" activePage="account">

      <style>{`
        .mp-primary { color: #EF4444; }
        .mp-bg-primary { background: #EF4444; }
        .mp-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 1px 2px rgba(16,24,40,.04); }
        .mp-equal { min-height: 520px; }
        .mp-badge { border: 1px solid #e5e7eb; border-radius: 90px; background: #f3f4f6; color: #374151; padding: 6px 10px; font-size: 14px; }
        .mp-section { max-width: 1100px; margin: 0 auto; padding-left: 16px; padding-right: 16px; }
        .mp-header { height: 180px; border-radius: 16px; background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); position: relative; }
        .mp-gear { background: #fee2e2; border: 1px solid #fecaca; color: #991B1B; border-radius: 12px; width: 84px; height: 84px; display: grid; place-items: center; }
        .mp-info-row { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; transition: all 0.2s; }
        .mp-info-row:hover { background: #f3f4f6; }
        .mp-avatar-wrapper { position: relative; cursor: pointer; }
        .mp-avatar-wrapper:hover .mp-avatar-overlay { opacity: 1; }
        .mp-avatar-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.4); border-radius: 50%; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; color: white; font-size: 12px; }
        .mp-dropdown { position: absolute; top: 100%; left: 0; background: white; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); min-width: 200px; z-index: 1000; margin-top: 8px; overflow: hidden; }
        .mp-dropdown-item { padding: 12px 16px; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; gap: 8px; font-size: 14px; }
        .mp-dropdown-item:hover { background: #f3f4f6; }

        /* Toast */
        .mp-toast {
          position: fixed; right: 20px; top: 20px; z-index: 3000;
          min-width: 280px; max-width: 92vw;
          background: #ffffff; border: 1px solid #e5e7eb; border-left-width: 6px;
          border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.12);
          padding: 14px 16px; display: flex; gap: 12px; align-items: flex-start;
          animation: mp-slide-in .2s ease-out;
        }
        .mp-toast .mp-toast-title { font-weight: 700; margin-bottom: 4px; }
        .mp-toast .mp-toast-msg { font-size: 14px; color: #374151; }
        .mp-toast .mp-toast-close { border: none; background: transparent; font-size: 18px; line-height: 1; color: #6b7280; }
        .mp-toast-success { border-left-color: #10B981; }
        .mp-toast-error   { border-left-color: #EF4444; }
        .mp-toast-warning { border-left-color: #F59E0B; }
        @keyframes mp-slide-in { from { transform: translateY(-8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }

        /* Banner nổi góc phải (kiểu Facebook khi đổi avatar) */
        .mp-fab-banner {
          position: fixed; right: 20px; top: 90px; z-index: 2500;
          background: #fff; border: 1px solid #e5e7eb; border-radius: 14px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.12);
          padding: 12px; min-width: 300px; display: flex; align-items: center; gap: 10px;
          animation: mp-slide-in .2s ease-out;
        }
      `}</style>

      <div className="container-fluid">
        <div className="position-relative" style={{ minHeight: 120 }}>
          <div className="mp-header d-flex align-items-start justify-content-between" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 180, zIndex: 0 }}>
            <div className="mp-section text-white fw-semibold p-3 fs-4 mt-4">HỒ SƠ CỦA TÔI </div>
          </div>

          <div className="mp-section position-relative" style={{ zIndex: 1, paddingTop: 120 }}>
            <div className="row g-4">
              <div className="col-12 col-lg-6">
                <div className="mp-card p-4 mp-equal">
                  <div className="d-flex align-items-start gap-3 mb-4">
                    <div
                      className="mp-avatar-wrapper"
                      onClick={(e) => { e.stopPropagation(); setShowAvatarDropdown(!showAvatarDropdown); }}
                      style={{ position: 'relative' }}
                    >
                      <img
                        src={avatarPreview || display(profile?.avatarUrl) || 'https://i.pravatar.cc/120?img=5'}
                        alt="avatar"
                        className="rounded-circle"
                        style={{ width: 96, height: 96, objectFit: 'cover', marginTop: -40, border: '6px solid #fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                      />
                      {showAvatarDropdown && (
                        <div className="mp-dropdown" onClick={(e) => e.stopPropagation()}>
                          <div className="mp-dropdown-item" onClick={handleViewAvatar}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            Xem ảnh đại diện
                          </div>
                          <div className="mp-dropdown-item" onClick={handleChangeAvatarClick}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                            Thay đổi ảnh đại diện
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex-grow-1">
                      <div className="fs-4 fw-bold mb-1">{display(profile?.fullName)}</div>
                      <div className="text-muted small">{display(profile?.email)}</div>
                    </div>
                  </div>

                  <input
                    type="file"
                    id="avatar-upload-input"
                    accept="image/*"
                    hidden
                    onChange={(e) => handleAvatarChange(e.target.files?.[0])}
                  />

                  <div className="mt-3">
                    {[
                      { key: 'fullName', label: 'Họ và tên', value: display(form.fullName), icon: <User size={16} /> },
                      { key: 'email', label: 'Email', value: display(profile?.email), icon: <Mail size={16} /> },
                      { key: 'phone', label: 'Số điện thoại', value: display(form.phone), icon: <Phone size={16} /> }
                    ].map((row, i) => (
                      <div key={i} className="mp-info-row mb-3">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span style={{ display: 'flex', alignItems: 'center' }}>{row.icon}</span>
                          <div className="small text-muted fw-medium">{row.label}</div>
                        </div>
                        {editing && row.key === 'fullName' && (
                          <input
                            className="form-control"
                            value={form.fullName}
                            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                            placeholder="Nhập họ và tên"
                          />
                        )}
                        {editing && row.key === 'phone' && (
                          <>
                            <input
                              className={`form-control ${phoneError ? 'is-invalid' : ''}`}
                              value={form.phone}
                              onChange={(e) => handlePhoneChange(e.target.value)}
                              placeholder="Nhập số điện thoại (VD: 0912345678)"
                              maxLength={15}
                            />
                            {phoneError && (
                              <div className="invalid-feedback d-block">
                                {phoneError}
                              </div>
                            )}
                          </>
                        )}
                        {(!editing || (row.key !== 'fullName' && row.key !== 'phone')) && (
                          <div className="fw-medium">{row.value || <span className="text-muted">Chưa cập nhật</span>}</div>
                        )}
                      </div>
                    ))}

                    <div className="mp-info-row">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <FileText size={16} />
                        <div className="small text-muted fw-medium">Bio</div>
                      </div>
                      {editing ? (
                        <textarea
                          className="form-control"
                          rows={3}
                          value={form.bio}
                          onChange={(e) => setForm({ ...form, bio: e.target.value })}
                          placeholder="Giới thiệu về bản thân..."
                        />
                      ) : (
                        <div className="text-muted">{display(profile?.bio) || 'Chưa có thông tin'}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-lg-6">
                <div className="mp-card p-4 mb-3 mp-equal">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <span>✨</span>
                    <div className="fw-semibold">Thông tin chi tiết</div>
                  </div>
                  {editing ? (
                    <textarea
                      className="form-control mb-3"
                      rows={2}
                      value={form.highlight}
                      onChange={(e) => setForm({ ...form, highlight: e.target.value })}
                      placeholder="Điểm nổi bật của bạn..."
                    />
                  ) : (
                    <div className="text-muted small mb-3">{display(profile?.highlight) || 'Chưa có thông tin'}</div>
                  )}

                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {(form.tags || []).map((t, idx) => (
                      <span key={idx} className="mp-badge d-inline-flex align-items-center gap-2">
                        <span>{t}</span>
                        {editing && (
                          <button
                            className="btn btn-sm p-0 border-0 bg-transparent"
                            style={{ fontSize: '18px', lineHeight: 1, color: '#6b7280' }}
                            onClick={async () => {
                              try { await userApi.removeTag(t); } catch (_) {}
                              setForm({ ...form, tags: form.tags.filter(x => x !== t) });
                            }}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                    {editing && (
                      <button className="btn btn-sm btn-outline-danger" style={{ borderRadius: 90 }} onClick={openTagModal}>
                        + Thêm tag
                      </button>
                    )}
                  </div>

                  <div>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <Target size={16} />
                      <div className="small text-muted fw-medium">Tổng số sự kiện đã tham gia</div>
                    </div>
                    <div className="mp-info-row d-flex align-items-center justify-content-between" style={{ minHeight: 100 }}>
                      <div>
                        <div className="fs-3 fw-bold mp-primary">{display(profile?.totalEvents) || '0'}</div>
                        <div className="text-muted small">Sự kiện</div>
                      </div>
                      <div className="mp-gear" style={{ fontSize: '40px' }}>⚙️</div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span>🔐</span>
                      <div className="small text-muted fw-medium">Trạng thái tài khoản</div>
                    </div>
                    <div className="mp-info-row d-flex align-items-center justify-content-between" style={{ minHeight: 80 }}>
                      <span className="fw-medium">Xác thực tài khoản</span>
                      <span
                        className="badge px-3 py-2"
                        style={{
                          background: profile?.verified ? '#10B981' : '#9CA3AF',
                          color: '#fff',
                          borderRadius: 90
                        }}
                      >
                        {profile?.verified ? '✓ Đã xác thực' : '⏳ Chưa xác thực'}
                      </span>
                    </div>
                  </div>

                  <div className="d-flex justify-content-end mt-3">
                    {!editing ? (
                      <button className="btn btn-outline-secondary px-4" onClick={() => setEditing(true)}>Chỉnh sửa hồ sơ</button>
                    ) : (
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-outline-secondary px-4"
                          onClick={() => {
                            setEditing(false);
                            setPhoneError('');
                            if (profile) {
                              setForm({
                                fullName: profile.fullName || '',
                                phone: profile.phone || '',
                                bio: profile.bio || '',
                                highlight: profile.highlight || '',
                                tags: Array.isArray(profile.tags) ? profile.tags : []
                              });
                              setAvatarPreview(profile?.avatarUrl || null);
                              setAvatarFile(null);
                              setUnsavedAvatar(false);
                              cleanupObjectUrl();
                            }
                          }}
                        >
                          Hủy
                        </button>
                        <button className="btn btn-danger px-4" onClick={handleSave} disabled={saving || !!phoneError}>
                          {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div> {/* row */}
          </div>
        </div>
      </div>

      {/* Banner góc phải: Ảnh đại diện chưa lưu */}
      {unsavedAvatar && (
        <div className="mp-fab-banner">
          <img
            src={avatarPreview}
            alt="preview"
            className="rounded-circle"
            style={{ width: 48, height: 48, objectFit: 'cover' }}
          />
          <div className="flex-grow-1">
            <div className="fw-semibold">Ảnh đại diện chưa lưu</div>
            <div className="text-muted" style={{ fontSize: 13 }}>Hãy lưu để áp dụng thay đổi.</div>
          </div>
          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => {
                // Bỏ thay đổi: revert về ảnh server
                setAvatarPreview(profile?.avatarUrl || null);
                setAvatarFile(null);
                setUnsavedAvatar(false);
                cleanupObjectUrl();
                notify('warning', 'Đã bỏ thay đổi ảnh đại diện.');
              }}
            >
              Bỏ
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setShowAvatarConfirm(true)}
            >
              Lưu
            </button>
          </div>
        </div>
      )}

      {/* Modal xem ảnh đại diện phóng to */}
      {showAvatarModal && (
        <>
          <div
            className="modal-backdrop"
            style={{ position: 'fixed', inset: 0, zIndex: 1050, background: 'rgba(0,0,0,0.85)' }}
            onClick={() => setShowAvatarModal(false)}
          />
          <div className="modal d-block" tabIndex={-1} style={{ zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content" style={{ background: 'transparent', border: 'none' }}>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="text-white">
                    <h5 className="mb-1">{display(profile?.fullName)}</h5>
                    <small className="text-white-50">Ảnh đại diện</small>
                  </div>
                  <button
                    type="button"
                    className="btn btn-light btn-sm rounded-circle"
                    style={{ width: 40, height: 40, fontSize: '24px', lineHeight: 1 }}
                    onClick={() => setShowAvatarModal(false)}
                  >
                    ×
                  </button>
                </div>
                <div className="text-center">
                  <img
                    src={avatarPreview || display(profile?.avatarUrl) || 'https://i.pravatar.cc/400?img=5'}
                    alt="avatar"
                    className="img-fluid rounded-4"
                    style={{ maxHeight: '70vh', objectFit: 'contain' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal xác nhận lưu ảnh đại diện (kiểu Facebook) */}
      {showAvatarConfirm && (
        <>
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 1050 }} onClick={() => setShowAvatarConfirm(false)} />
          <div className="modal d-block" tabIndex={-1} style={{ zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Lưu ảnh đại diện?</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAvatarConfirm(false)} />
                </div>
                <div className="modal-body">
                  <div className="d-flex align-items-center gap-3">
                    <img
                      src={avatarPreview}
                      alt="preview"
                      className="rounded-circle"
                      style={{ width: 64, height: 64, objectFit: 'cover' }}
                    />
                    <div className="text-muted">Ảnh mới sẽ thay thế ảnh đại diện hiện tại.</div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAvatarConfirm(false)}>Hủy</button>
                  <button type="button" className="btn btn-danger" onClick={handleConfirmSaveAvatar} disabled={performingAvatarSave}>
                    {performingAvatarSave ? 'Đang lưu…' : 'Lưu'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal chọn ban */}
      {showModal && (
        <>
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 1050 }} onClick={() => setShowModal(false)} />
          <div className="modal d-block" tabIndex={-1} style={{ zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Chọn ban</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
                </div>
                <div className="modal-body">
                  <div className="d-flex flex-wrap gap-2">
                    {committeeOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`btn ${modalSelected.has(opt) ? 'btn-danger text-white' : 'btn-outline-secondary'}`}
                        style={{ borderRadius: 90 }}
                        onClick={() => toggleModalSelect(opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                  <button type="button" className="btn btn-danger" onClick={confirmModal}>Thêm</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* React Toastify container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </UserLayout>
  );
}
