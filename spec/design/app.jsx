// app.jsx — Tüm ekranları design canvas üstüne yerleştirir.
// Hi-fi tasarım için sıralama: kullanım akışı.

const { DesignCanvas, DCSection, DCArtboard } = window;

function App() {
  return (
    <DesignCanvas
      title="Provit · Yön A"
      subtitle="Sıcak krem + zeytin yeşili · Inter Tight + Instrument Serif"
    >
      <DCSection id="web" title="Web (yönetim paneli)">
        <DCArtboard id="w-login" label="Login" width={1280} height={800}>
          <WebLogin />
        </DCArtboard>
        <DCArtboard id="w-dashboard" label="Panel" width={1280} height={800}>
          <WebDashboard />
        </DCArtboard>
        <DCArtboard id="w-teams" label="Takımlar" width={1280} height={800}>
          <WebTeams />
        </DCArtboard>
        <DCArtboard id="w-checklists" label="Checklist" width={1280} height={800}>
          <WebChecklists />
        </DCArtboard>
        <DCArtboard id="w-task-groups" label="Görev grubu wizard (DAG)" width={1280} height={800}>
          <WebTaskGroups />
        </DCArtboard>
        <DCArtboard id="w-timeline" label="Akış (Kanban)" width={1280} height={800}>
          <WebTimeline />
        </DCArtboard>
        <DCArtboard id="w-approvals" label="Onaylar" width={1280} height={800}>
          <WebApprovals />
        </DCArtboard>
        <DCArtboard id="w-reports" label="Raporlar" width={1280} height={800}>
          <WebReports />
        </DCArtboard>
      </DCSection>

      <DCSection id="mobile" title="Mobil (saha uygulaması)">
        <DCArtboard id="m-login" label="Login" width={420} height={880}>
          <MobLogin />
        </DCArtboard>
        <DCArtboard id="m-today" label="Bugün" width={420} height={880}>
          <MobToday />
        </DCArtboard>
        <DCArtboard id="m-pool" label="Havuz · filtreli liste" width={420} height={880}>
          <MobPool />
        </DCArtboard>
        <DCArtboard id="m-quick-assign" label="Hızlı atama" width={420} height={880}>
          <MobQuickAssign />
        </DCArtboard>
        <DCArtboard id="m-task-wizard" label="Görev sihirbazı · ispat" width={420} height={880}>
          <MobTaskWizard />
        </DCArtboard>
        <DCArtboard id="m-checklist" label="Görev sihirbazı · checklist" width={420} height={880}>
          <MobChecklist />
        </DCArtboard>
        <DCArtboard id="m-approvals" label="Onaylar" width={420} height={880}>
          <MobApprovals />
        </DCArtboard>
        <DCArtboard id="m-profile" label="Profil" width={420} height={880}>
          <MobProfile />
        </DCArtboard>
        <DCArtboard id="m-notifications" label="Bildirimler" width={420} height={880}>
          <MobNotifications />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
