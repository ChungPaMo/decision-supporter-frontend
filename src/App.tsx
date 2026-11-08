import React, { useState } from 'react';
import MainLayout from './layouts/MainLayout';
import DataUploadScreen from './screens/DataUploadScreen';
import PlanComparisonScreen from './screens/PlanComparisonScreen';
import PredictionAnalysisScreen from './screens/PredictionAnalysisScreen';
import DiagnosisScreen from './screens/DiagnosisScreen';
import ApprovalScreen from './screens/ApprovalScreen';
import { useProductionStore } from './store/productionStore';
import './styles/App.css';
import './styles/layout.css';
import './styles/production.css';

type Step = 'upload' | 'planning' | 'prediction' | 'diagnosis' | 'approval';

export default function App() {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const { setCurrentStep: setStoreStep } = useProductionStore();

  const handleNavigate = (step: string) => {
    setCurrentStep(step as Step);
    setStoreStep(step);
  };

  const handleNext = (step: Step) => {
    setCurrentStep(step);
    setStoreStep(step);
  };

  const handleAnalyze = (planType: string) => {
    // 분석 버튼 클릭 시 예측 분석 화면으로 이동
    handleNext('prediction');
  };

  const handleComplete = () => {
    // 승인 완료 후 처리
    alert('생산계획 의사결정 프로세스가 완료되었습니다!');
    // 원하면 초기 화면으로 돌아가도록 설정
    handleNext('upload');
  };

  return (
    <MainLayout onNavigate={handleNavigate}>
      {currentStep === 'upload' && <DataUploadScreen onNext={() => handleNext('planning')} />}
      {currentStep === 'planning' && (
        <PlanComparisonScreen onNext={() => handleNext('prediction')} onAnalyze={handleAnalyze} />
      )}
      {currentStep === 'prediction' && <PredictionAnalysisScreen onNext={() => handleNext('diagnosis')} />}
      {currentStep === 'diagnosis' && <DiagnosisScreen onNext={() => handleNext('approval')} />}
      {currentStep === 'approval' && <ApprovalScreen onComplete={handleComplete} />}
    </MainLayout>
  );
}
