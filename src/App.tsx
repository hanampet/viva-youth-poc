import { SessionProvider } from './contexts/SessionContext';
import { Header } from './components/layout/Header';
import { ClientView } from './components/layout/ClientView';
import { OperatorView } from './components/layout/OperatorView';

function AppContent() {
  return (
    <div className="h-screen flex flex-col bg-surface-100">
      <Header />
      <main className="flex-1 flex min-h-0">
        <ClientView />
        <OperatorView />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}
