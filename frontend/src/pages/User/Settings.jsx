import { useState } from 'react';
import UserLayout from '../../components/UserLayout';

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState('General Settings');
  const [settings, setSettings] = useState({ language: 'Tiếng Việt', backgroundColor: 'Sáng', notifications: true });

  const tabs = ['General Settings', 'Agents\' Settings', 'Users\' Settings', 'Maintenance', 'Security'];

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    console.log('Saving settings:', settings);
    alert('Cài đặt đã được lưu!');
  };

  return (
    <UserLayout title="Cài đặt" activePage="settings">
      <style>{`
        .set-wrap{max-width:1100px;margin:0 auto;padding:0 16px}
        .set-tab{color:#6b7280;border-bottom:2px solid transparent}
        .set-tab.active{color:#EF4444;border-bottom-color:#EF4444}
        .set-card{border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 1px 2px rgba(16,24,40,.04)}
        .input-soft{background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;height:44px}
        .btn-primary-soft{background:#EF4444;color:#fff;border:none}
      `}</style>
      <div className="container-fluid set-wrap">
        <h4 className="fw-semibold mb-1">Cài đặt</h4>
        <div className="text-muted mb-3">Chỉnh sửa các cài đặt hệ thống của bạn.</div>

        <div className="d-flex align-items-center gap-4 border-bottom mb-3">
          {tabs.map((t) => (
            <button key={t} className={`btn btn-link text-decoration-none py-3 px-0 set-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
          ))}
        </div>

        <div className="set-card p-4">
          <div className="fw-semibold mb-3">General</div>
          <div className="row gy-4">
            <div className="col-md-6">
              <div className="mb-2 small text-muted">Ngôn ngữ hệ thống</div>
              <select className="form-select input-soft" value={settings.language} onChange={(e) => handleSettingChange('language', e.target.value)}>
                <option>Tiếng Việt</option>
                <option>English</option>
              </select>
            </div>
            <div className="col-md-6">
              <div className="mb-2 small text-muted">Notifications</div>
              <div className="input-soft d-flex align-items-center justify-content-between px-3">
                <span className="text-muted small">Cho phép thông báo</span>
                <div className="form-check form-switch m-0">
                  <input className="form-check-input" type="checkbox" checked={settings.notifications} onChange={(e) => handleSettingChange('notifications', e.target.checked)} style={{ backgroundColor: settings.notifications ? '#EF4444' : '', borderColor: settings.notifications ? '#EF4444' : '' }} />
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-2 small text-muted">Màu nền</div>
              <select className="form-select input-soft" value={settings.backgroundColor} onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}>
                <option>Sáng</option>
                <option>Tối</option>
              </select>
            </div>
            <div className="col-md-6 d-flex justify-content-end align-items-end">
              <button className="btn btn-primary-soft px-4" onClick={handleSave}>Lưu cài đặt</button>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}