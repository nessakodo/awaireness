import { DisclosureGate } from './components/DisclosureGate';
import { AirdropLogin } from './components/AirdropLogin';
import { ImpactDashboard } from './components/ImpactDashboard';
import { useSession } from './hooks/useSession';
import { useNetworkGuard } from './hooks/useNetworkGuard';

export function App() {
  const {
    state,
    acceptDisclosure,
    setUsageData,
    toggleEstimates,
    reset,
    goBack,
    source,
  } = useSession();

  // Block network in import/demo modes
  useNetworkGuard(source);

  return (
    <main className="min-h-screen bg-surface-0 text-white">
      {state.phase === 'disclosure' && (
        <DisclosureGate onAccept={acceptDisclosure} />
      )}

      {state.phase === 'login' && (
        <AirdropLogin onData={setUsageData} onBack={goBack} />
      )}

      {state.phase === 'dashboard' && state.metrics && state.usageData && (
        <ImpactDashboard
          metrics={state.metrics}
          verification={state.usageData.verification}
          showEstimates={state.showEstimates}
          onToggleEstimates={toggleEstimates}
          onReset={reset}
          onBack={goBack}
        />
      )}
    </main>
  );
}
