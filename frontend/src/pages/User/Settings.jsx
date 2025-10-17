import { useEffect, useState } from 'react';
import UserLayout from '../../components/UserLayout';
import { useTranslation } from 'react-i18next';
import { applyTheme, getSavedTheme } from '../../theme';

export default function SystemSettingsPage() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('General Settings');
  const [settings, setSettings] = useState({ language: i18n.language?.split('-')[0] || 'vi', backgroundColor: getSavedTheme() === 'dark' ? 'Tối' : 'Sáng', notifications: true });

  const tabs = [t('settings.tabs.general'), t('settings.tabs.agents'), t('settings.tabs.users'), t('settings.tabs.maintenance'), t('settings.tabs.security')];

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const onLangChanged = () => setSettings(s => ({ ...s, language: i18n.language?.split('-')[0] || 'vi' }));
    i18n.on('languageChanged', onLangChanged);
    return () => i18n.off('languageChanged', onLangChanged);
  }, [i18n]);

  const handleSave = () => {
    i18n.changeLanguage(settings.language);
    applyTheme(settings.backgroundColor === 'Tối' ? 'dark' : 'light');
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
        <h4 className="fw-semibold mb-1">{t('settings.title')}</h4>
        <div className="text-muted mb-3">{t('settings.subtitle')}</div>

        <div className="d-flex align-items-center gap-4 border-bottom mb-3">
          {tabs.map((t) => (
            <button key={t} className={`btn btn-link text-decoration-none py-3 px-0 set-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
          ))}
        </div>

        <div className="set-card p-4">
          <div className="fw-semibold mb-3">{t('general')}</div>
          <div className="row gy-4">
            <div className="col-md-6">
              <div className="mb-2 small text-muted">{t('language')}</div>
              <select className="form-select input-soft" value={settings.language} onChange={(e) => handleSettingChange('language', e.target.value)}>
                <option value="vi">{t('languages.vi')}</option>
                <option value="en">{t('languages.en')}</option>
              </select>
            </div>
            <div className="col-md-6">
              <div className="mb-2 small text-muted">{t('notifications')}</div>
              <div className="input-soft d-flex align-items-center justify-content-between px-3">
                <span className="text-muted small">{t('allowNotifications')}</span>
                <div className="form-check form-switch m-0">
                  <input className="form-check-input" type="checkbox" checked={settings.notifications} onChange={(e) => handleSettingChange('notifications', e.target.checked)} style={{ backgroundColor: settings.notifications ? '#EF4444' : '', borderColor: settings.notifications ? '#EF4444' : '' }} />
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-2 small text-muted">{t('theme')}</div>
              <select className="form-select input-soft" value={settings.backgroundColor} onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}>
                <option>{t('light')}</option>
                <option>{t('dark')}</option>
              </select>
            </div>
            <div className="col-md-6 d-flex justify-content-end align-items-end">
              <button className="btn btn-primary-soft px-4" onClick={handleSave}>{t('save')}</button>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}