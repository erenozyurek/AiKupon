export default function MainContent({ children }) {
  return (
    <main className="flex-1 min-w-0 overflow-y-auto">
      <div className="p-4 lg:p-6">
        {children}
      </div>
    </main>
  );
}
