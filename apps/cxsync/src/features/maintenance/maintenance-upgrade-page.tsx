import type { ReactNode } from "react"
import { AlertTriangle, CheckCircle2, DatabaseBackup, ShieldCheck, UploadCloud } from "lucide-react"
import { FleetUpgradePage } from "../fleet/fleet-upgrade-page"

export function MaintenanceUpgradePage() {
  return <div className="mode-stack">
    <section className="workspace-panel page-surface page-surface--cloud">
      <header className="panel-heading-row">
        <div>
          <small>CXSync Maintenance Upgrade</small>
          <h2>Manual safe cloud database upgrade</h2>
          <p>Full clone, local or candidate upgrade, verification, backup upload, and later controlled cutover. This mode is intentionally manual and does not run daily business sync.</p>
        </div>
      </header>
      <div className="overview-status-grid">
        <ModeStep icon={<DatabaseBackup size={18} />} label="Clone" value="Full DB copy" />
        <ModeStep icon={<ShieldCheck size={18} />} label="Upgrade" value="Candidate only" />
        <ModeStep icon={<CheckCircle2 size={18} />} label="Verify" value="Schema + rows" />
        <ModeStep icon={<UploadCloud size={18} />} label="Cutover" value="Later approval" />
      </div>
      <div className="form-message form-message--warning"><AlertTriangle size={16} />Maintenance Upgrade must never be mixed with Mirror. It works with full database artifacts and approved release windows only.</div>
    </section>
    <FleetUpgradePage />
  </div>
}

function ModeStep({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <article className="summary-item"><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>
}
