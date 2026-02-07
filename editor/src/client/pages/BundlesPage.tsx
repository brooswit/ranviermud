import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBundles } from '../hooks/useBundles';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function BundlesPage() {
  const navigate = useNavigate();
  const { bundles, loading, createBundle: createBundleApi, toggleBundle } = useBundles();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBundleName, setNewBundleName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreateBundle(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);

    if (!newBundleName || !/^[a-z0-9-]+$/.test(newBundleName)) {
      setCreateError('Bundle name must be lowercase, no spaces, and can contain hyphens');
      return;
    }

    try {
      await createBundleApi(newBundleName);
      setShowCreateModal(false);
      setNewBundleName('');
      navigate(`/bundle/${newBundleName}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create bundle';
      setCreateError(errorMessage);
    }
  }

  async function handleToggleBundle(bundleName: string, isActive: boolean) {
    try {
      await toggleBundle(bundleName);
    } catch (error) {
      console.error('Error toggling bundle:', error);
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading bundles..." />;
  }

  return (
    <div className="app">
      <header>
        <h1>🏰 Ranvier MUD Editor</h1>
        <nav className="tabs">
          <button className="tab active">Bundles</button>
          <button className="tab" onClick={() => navigate('/bundles')}>Editor</button>
        </nav>
      </header>

      <main>
        <section className="view active">
          <div className="toolbar">
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              + New Bundle
            </button>
          </div>
          <div className="list">
            {bundles.map(bundle => (
              <div
                key={bundle.name}
                className="card"
                onClick={() => navigate(`/bundle/${bundle.name}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3>{bundle.name}</h3>
                    <p>Click to edit</p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {bundle.active ? 'Active' : 'Inactive'}
                    </span>
                    <input
                      type="checkbox"
                      checked={bundle.active || false}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleBundle(bundle.name, e.target.checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewBundleName('');
          setCreateError(null);
        }}
        title="Create New Bundle"
      >
        <form onSubmit={handleCreateBundle}>
          <div className="form-group">
            <label>Bundle Name</label>
            <input
              type="text"
              value={newBundleName}
              onChange={(e) => {
                setNewBundleName(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                setCreateError(null);
              }}
              placeholder="bundle-name"
              required
              pattern="[a-z0-9-]+"
            />
            <small style={{ display: 'block', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
              Lowercase, no spaces, hyphens allowed
            </small>
            {createError && (
              <div style={{ marginTop: '0.5rem', color: 'var(--danger)' }}>{createError}</div>
            )}
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Create</button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setShowCreateModal(false);
                setNewBundleName('');
                setCreateError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
