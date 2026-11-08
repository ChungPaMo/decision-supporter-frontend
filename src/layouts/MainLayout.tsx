import React, { useState } from 'react';
import { useProductionStore } from '../store/productionStore';
import '../styles/layout.css';

interface MainLayoutProps {
  children: React.ReactNode;
  onNavigate: (step: string) => void;
}

export default function MainLayout({ children, onNavigate }: MainLayoutProps) {
  const currentStep = useProductionStore((state) => state.currentStep);

  const steps = [
    { id: 'upload', label: '데이터 업로드', icon: '📤' },
    { id: 'planning', label: '생산계획 비교', icon: '📊' },
    { id: 'prediction', label: '예측 근거 분석', icon: '🔍' },
    { id: 'diagnosis', label: '실행 불가 진단', icon: '⚠️' },
    { id: 'approval', label: '승인 및 출력', icon: '✓' },
  ];

  const stepIndex = steps.findIndex((s) => s.id === currentStep);
  const progress = ((stepIndex + 1) / steps.length) * 100;

  return (
    <div className="main-layout">
      {/* 헤더 */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <h1>생산계획 의사결정 시스템</h1>
            <div className="project-info">
              <span className="label">프로젝트:</span>
              <span className="value">2024-11 수요예측 및 계획</span>
              <span className="divider">•</span>
              <span className="label">기준일:</span>
              <span className="value">2024-11-08</span>
            </div>
          </div>
          <div className="header-right">
            <button className="icon-btn">🔔</button>
            <div className="user-profile">
              <div className="avatar">관</div>
              <div className="user-info">
                <div className="name">관리자</div>
                <div className="role">시스템 관리자</div>
              </div>
            </div>
          </div>
        </div>

        {/* 프로그레스 바 */}
        <div className="progress-section">
          <div className="progress-label">현재 진행 단계</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="progress-steps">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={`progress-step ${step.id === currentStep ? 'active' : ''} ${
                  idx < stepIndex ? 'completed' : ''
                }`}
                onClick={() => {
                  if (idx <= stepIndex) onNavigate(step.id);
                }}
              >
                <div className="step-icon">{step.icon}</div>
                <div className="step-label">{step.label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="layout-container">
        {/* 사이드바 */}
        <aside className="sidebar">
          <div className="logo">🏭</div>
          <nav className="nav-menu">
            {steps.map((step) => (
              <button
                key={step.id}
                className={`nav-item ${step.id === currentStep ? 'active' : ''}`}
                onClick={() => {
                  const idx = steps.findIndex((s) => s.id === step.id);
                  const currentIdx = steps.findIndex((s) => s.id === currentStep);
                  if (idx <= currentIdx) onNavigate(step.id);
                }}
              >
                <span className="nav-icon">{step.icon}</span>
                <span className="nav-label">{step.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
