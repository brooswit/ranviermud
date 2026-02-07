import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import BundlesPage from './pages/BundlesPage';
import EditorPage from './pages/EditorPage';
import LoadingScreen from './components/LoadingScreen';

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate initial load
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/bundles" replace />} />
      <Route path="/bundles" element={<BundlesPage />} />
      <Route path="/bundle/:bundleName/*" element={<EditorPage />} />
      <Route path="*" element={<Navigate to="/bundles" replace />} />
    </Routes>
  );
}

export default App;
