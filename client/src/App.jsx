import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FixturesPage from './pages/FixturesPage';
import AnalysisPage from './pages/AnalysisPage';
import AccountPage from './pages/AccountPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="*"
        element={
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/fixtures" element={<FixturesPage />} />
              <Route path="/analysis" element={<AnalysisPage />} />
              <Route path="/account" element={<AccountPage />} />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  );
}

export default App;
