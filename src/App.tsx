import { useEffect } from 'react';
import MainLayout from './layouts/MainLayout';
import DataUploadScreen from './screens/DataUploadScreen';
import ForecastScreen from './screens/ForecastScreen';
import PlanComparisonScreen from './screens/PlanComparisonScreen';
import DiagnosisScreen from './screens/DiagnosisScreen';
import ApprovalScreen from './screens/ApprovalScreen';
import { useProductionStore } from './store/productionStore';
import './styles/app.css';

export default function App() {
  useEffect(() => {
    const restoreRoute = () => {
      if (window.location.hash === '#forecast') useProductionStore.getState().setStep('forecast');
      else if (!window.location.hash) useProductionStore.getState().setStep('data');
    };
    window.addEventListener('hashchange', restoreRoute);
    return () => window.removeEventListener('hashchange', restoreRoute);
  }, []);
  const step = useProductionStore((state) => state.step);

  return (
    <MainLayout>
      {step === 'data' && <DataUploadScreen />}
      {step === 'forecast' && <ForecastScreen />}
      {step === 'plans' && <PlanComparisonScreen />}
      {step === 'diagnosis' && <DiagnosisScreen />}
      {step === 'approval' && <ApprovalScreen />}
    </MainLayout>
  );
}
