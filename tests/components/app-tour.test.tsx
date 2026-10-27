import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppTour } from '../../src/app/components/Tour/AppTour';
import { TourWelcomeBanner } from '../../src/app/components/Tour/TourWelcomeBanner';
import { TOUR_STEPS, KEYBOARD_SHORTCUTS } from '../../src/app/components/Tour/tourSteps';

describe('AppTour component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <AppTour
        isOpen={false}
        onClose={vi.fn()}
        activeTab="dial"
        onNavigateTab={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders welcome step by default when open', () => {
    render(
      <AppTour
        isOpen={true}
        onClose={vi.fn()}
        activeTab="dial"
        onNavigateTab={vi.fn()}
      />
    );

    expect(screen.getByText('FocusChecker Interactive Tour')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 8')).toBeInTheDocument();
    expect(screen.getByText(TOUR_STEPS[0].title)).toBeInTheDocument();
    expect(screen.getByText(TOUR_STEPS[0].headline)).toBeInTheDocument();
  });

  it('navigates through steps and calls onNavigateTab', () => {
    const onNavigateTab = vi.fn();
    const setMobileDialView = vi.fn();

    render(
      <AppTour
        isOpen={true}
        onClose={vi.fn()}
        activeTab="dial"
        onNavigateTab={onNavigateTab}
        setMobileDialView={setMobileDialView}
      />
    );

    // Click Next Step
    const nextBtn = screen.getByText('Next Step');
    fireEvent.click(nextBtn);

    expect(onNavigateTab).toHaveBeenCalledWith(TOUR_STEPS[1].tab);
    expect(screen.getByText('Step 2 of 8')).toBeInTheDocument();
    expect(screen.getByText(TOUR_STEPS[1].title)).toBeInTheDocument();

    // Click Back
    const backBtn = screen.getByText('Back');
    fireEvent.click(backBtn);
    expect(screen.getByText('Step 1 of 8')).toBeInTheDocument();
    expect(screen.getByText(TOUR_STEPS[0].title)).toBeInTheDocument();
  });

  it('switches between guided tour and keyboard shortcuts mode', () => {
    render(
      <AppTour
        isOpen={true}
        onClose={vi.fn()}
        activeTab="dial"
        onNavigateTab={vi.fn()}
      />
    );

    const shortcutsTab = screen.getByText('Shortcuts');
    fireEvent.click(shortcutsTab);

    expect(screen.getByText('Keyboard Shortcuts Cheatsheet')).toBeInTheDocument();
    expect(screen.getByText('Start or pause focus timer / breathing pacer')).toBeInTheDocument();
    expect(screen.getByText('Direct Feature Jump')).toBeInTheDocument();
  });

  it('calls onClose when close button or try this screen is clicked', () => {
    const onClose = vi.fn();
    render(
      <AppTour
        isOpen={true}
        onClose={onClose}
        activeTab="dial"
        onNavigateTab={vi.fn()}
      />
    );

    const tryBtn = screen.getByText('Try this screen');
    fireEvent.click(tryBtn);

    expect(onClose).toHaveBeenCalled();
    expect(localStorage.getItem('focus-checker-tour-seen')).toBe('true');
  });

  it('supports jumping to specific steps using dots', () => {
    const onNavigateTab = vi.fn();
    render(
      <AppTour
        isOpen={true}
        onClose={vi.fn()}
        activeTab="dial"
        onNavigateTab={onNavigateTab}
      />
    );

    // Jump to step 4 (Readiness)
    const step4Button = screen.getByLabelText(`Go to step 4: ${TOUR_STEPS[3].title}`);
    fireEvent.click(step4Button);

    expect(screen.getByText('Step 4 of 8')).toBeInTheDocument();
    expect(screen.getByText(TOUR_STEPS[3].title)).toBeInTheDocument();
    expect(onNavigateTab).toHaveBeenCalledWith(TOUR_STEPS[3].tab);
  });

  it('handles keyboard events (ArrowRight, ArrowLeft, Escape)', () => {
    const onClose = vi.fn();
    const onNavigateTab = vi.fn();

    render(
      <AppTour
        isOpen={true}
        onClose={onClose}
        activeTab="dial"
        onNavigateTab={onNavigateTab}
      />
    );

    // ArrowRight
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('Step 2 of 8')).toBeInTheDocument();

    // ArrowLeft
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('Step 1 of 8')).toBeInTheDocument();

    // Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('TourWelcomeBanner component', () => {
  it('renders correctly and handles start tour and dismiss actions', () => {
    const onStartTour = vi.fn();
    const onDismiss = vi.fn();

    render(
      <TourWelcomeBanner
        onStartTour={onStartTour}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('New to FocusChecker?')).toBeInTheDocument();

    // Click Take Tour
    const tourBtn = screen.getByText('Take Tour');
    fireEvent.click(tourBtn);
    expect(onStartTour).toHaveBeenCalled();

    // Click Explore alone
    const dismissBtn = screen.getByText('Explore alone');
    fireEvent.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalled();
  });
});
