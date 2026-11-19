interface RemoteWorkersSectionProps {
  remoteHosts: string
  onChange: (value: string) => void
}

export function RemoteWorkersSection({ remoteHosts, onChange }: RemoteWorkersSectionProps) {
  return (
    <div className="settings-section">
      <div className="settings-section-title">Distributed Remote Load Workers (-R remote_hosts)</div>
      <p className="settings-help">
        Distribute load generation across multiple remote JMeter worker server nodes.
      </p>
      <div style={{ marginTop: 8 }}>
        <input
          type="text"
          className="path-input"
          placeholder="e.g. 192.168.1.101:1099, 192.168.1.102:1099, worker.k8s.lan"
          value={remoteHosts}
          onChange={(e) => onChange(e.target.value)}
        />
        <div style={{ fontSize: 11, color: 'var(--text-muted, #888)', marginTop: 4 }}>
          When populated, test execution will automatically append <code>-R &lt;hosts&gt;</code> to distribute threads across workers.
        </div>
      </div>
    </div>
  )
}
