import Navbar from './Navbar';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import CouponPanel from './CouponPanel';
import Footer from './Footer';

export default function Layout({ children }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <MainContent>{children}</MainContent>
          <Footer />
        </div>
        <CouponPanel />
      </div>
    </div>
  );
}
