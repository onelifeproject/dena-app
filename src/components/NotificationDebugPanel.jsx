import { useState } from 'react';

export default function NotificationDebugPanel({
  loans,
  onRequestPermission,
  onResync,
  onGetPending,
  onSendTest,
  onSendRealPreview,
  onClearAll,
}) {
  const [status, setStatus] = useState('Ready');
  const [pendingRows, setPendingRows] = useState([]);

  const handleAction = async (runner, successText) => {
    try {
      setStatus('Running...');
      const result = await runner();
      if (successText) setStatus(successText);
      return result;
    } catch (error) {
      setStatus(`Error: ${error?.message || 'unknown error'}`);
      return null;
    }
  };

  const loadPending = async () => {
    const result = await handleAction(onGetPending, 'Pending refreshed');
    if (result) setPendingRows(result);
  };

  const sendTest = async () => {
    const result = await handleAction(onSendTest, 'Test scheduled');
    if (result?.at) {
      setStatus(`Test যাবে: ${new Date(result.at).toLocaleString('bn-BD')}`);
    }
  };

  const sendRealPreview = async () => {
    const result = await handleAction(onSendRealPreview, 'Real previews scheduled');
    if (result?.length) {
      const previewTimes = result.map((item) => new Date(item.at).toLocaleTimeString('bn-BD')).join(', ');
      setStatus(`Real messages যাবে: ${previewTimes}`);
    }
  };

  return (
    <div className="glass-card mt-6" style={{ padding: '1rem' }}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-bold">Notification Debug Panel</h3>
        <span className="text-xs text-muted">Loans: {loans.length}</span>
      </div>

      <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => handleAction(onRequestPermission, 'Permission checked')}>
          Permission Check
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => handleAction(onResync, 'Resync completed')}>
          Resync Reminders
        </button>
        <button className="btn btn-secondary btn-sm" onClick={sendTest}>
          Send Test (30s)
        </button>
        <button className="btn btn-secondary btn-sm" onClick={sendRealPreview}>
          Real Messages (10/20/30s)
        </button>
        <button className="btn btn-secondary btn-sm" onClick={loadPending}>
          Show Pending
        </button>
        <button className="btn btn-danger btn-sm" onClick={() => handleAction(onClearAll, 'All pending cleared')}>
          Clear Pending
        </button>
      </div>

      <p className="text-xs text-muted mt-4">{status}</p>

      {pendingRows.length > 0 && (
        <div className="mt-4" style={{ maxHeight: '180px', overflowY: 'auto' }}>
          {pendingRows.map((item) => (
            <p key={item.id} className="text-xs text-secondary" style={{ marginBottom: '0.4rem' }}>
              #{item.id} - {item.title} - {item.body}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
