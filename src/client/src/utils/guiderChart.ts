// Guider Chart Utilities - Time-based chart data processing
// Handles conversion of guide steps to time-based measurements

export interface GuideStep {
  RADistanceRaw?: number;
  RADistanceRawDisplay?: number;
  DECDistanceRaw?: number;
  DECDistanceRawDisplay?: number;
  RADuration?: number;
  DECDuration?: number;
  Id?: number;
  Timestamp?: string;
  timestamp?: number;
}

export interface TimeBasedChartData {
  labels: (string | number)[];
  datasets: any[];
}

export interface ChartTimeSettings {
  exposureDuration: number; // seconds
  useTimeLabels: boolean;
  maxHistoryMinutes?: number;
}

/**
 * Convert guide steps to time-based chart data
 * Uses exposure duration to calculate time intervals
 */
export function processGuideStepsForChart(
  guideSteps: GuideStep[],
  settings: ChartTimeSettings
): TimeBasedChartData {
  if (!guideSteps || guideSteps.length === 0) {
    return {
      labels: [],
      datasets: []
    };
  }

  const { exposureDuration, useTimeLabels, maxHistoryMinutes = 30 } = settings;
  
  // Filter recent steps if max history is specified
  const maxSteps = Math.floor((maxHistoryMinutes * 60) / exposureDuration);
  const recentSteps = guideSteps.slice(-maxSteps);
  
  // Generate timestamps for each step (NINA provides oldest first, newest last)
  const now = new Date();
  const stepsWithTimes = recentSteps.map((step, index) => {
    // Calculate actual timestamp for each step (oldest to newest)
    const timeAgoMs = (recentSteps.length - 1 - index) * exposureDuration * 1000;
    const stepTime = new Date(now.getTime() - timeAgoMs);
    return {
      ...step,
      calculatedTime: stepTime,
      timeAgoSeconds: Math.floor(timeAgoMs / 1000)
    };
  });
  
  // Generate actual time labels (12-hour format) - sample every few steps for readability
  const labels = stepsWithTimes.map((step, index) => {
    if (useTimeLabels) {
      // Show actual time in 12-hour format with AM/PM
      const time = step.calculatedTime;
      const timeString = time.toLocaleTimeString('en-US', { 
        hour12: true, 
        hour: 'numeric', 
        minute: '2-digit', 
        second: '2-digit' 
      });
      
      // For debugging - only log a few samples
      if (index < 3 || index === stepsWithTimes.length - 1) {
        console.log(`🕐 Generated time label for step ${index}: ${timeString}`);
      }
      return timeString;
    } else {
      // Use step numbers (chronological order)
      return `Step ${index + 1}`;
    }
  });

  console.log(`🎯 Total chart labels: ${labels.length}, First: ${labels[0]}, Last: ${labels[labels.length-1]}`);

  // Extract data values with fallbacks for different property names
  const raErrors = recentSteps.map(step => 
    step.RADistanceRawDisplay ?? step.RADistanceRaw ?? 0
  );
  const decErrors = recentSteps.map(step => 
    step.DECDistanceRawDisplay ?? step.DECDistanceRaw ?? 0  
  );
  const raDurations = recentSteps.map(step => step.RADuration ?? 0);
  const decDurations = recentSteps.map(step => step.DECDuration ?? 0);

  return {
    labels,
    datasets: [
      {
        type: 'line' as const,
        label: 'RA Error (")',
        data: raErrors,
        borderColor: 'hsl(206, 100%, 55%)', // Blue - Radix primary
        backgroundColor: 'hsla(206, 100%, 55%, 0.1)',
        yAxisID: 'yError',
        tension: 0.1,
        pointRadius: 2,
        pointHoverRadius: 4,
        borderWidth: 2
      },
      {
        type: 'line' as const,
        label: 'Dec Error (")',
        data: decErrors,
        borderColor: 'hsl(358, 75%, 59%)', // Red
        backgroundColor: 'hsla(358, 75%, 59%, 0.1)',
        yAxisID: 'yError',
        tension: 0.1,
        pointRadius: 2,
        pointHoverRadius: 4,
        borderWidth: 2
      },
      {
        type: 'bar' as const,
        label: 'RA Duration (ms)',
        data: raDurations,
        backgroundColor: 'hsla(206, 100%, 55%, 0.3)',
        borderColor: 'hsl(206, 100%, 45%)',
        yAxisID: 'yDuration',
        barThickness: 3,
        borderWidth: 1
      },
      {
        type: 'bar' as const,
        label: 'Dec Duration (ms)',
        data: decDurations,
        backgroundColor: 'hsla(358, 75%, 59%, 0.3)',
        borderColor: 'hsl(358, 75%, 49%)',
        yAxisID: 'yDuration',
        barThickness: 3,
        borderWidth: 1
      }
    ]
  };
}

/**
 * Generate chart options optimized for time-based display
 */
export function getTimeBasedChartOptions(
  settings: ChartTimeSettings,
  guideStepCount: number,
  rmsData?: { MinY?: number; MaxY?: number; MinDurationY?: number; MaxDurationY?: number }
) {
  const { exposureDuration, useTimeLabels } = settings;
  
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        type: 'category' as const,
        title: {
          display: true,
          text: useTimeLabels ? 'Time (12-hour)' : 'Guide Step',
          color: 'rgb(255, 255, 255)'
        },
        ticks: {
          color: 'rgb(200, 200, 200)',
          maxTicksLimit: 10, // Allow more labels
          maxRotation: 45, // Rotate labels if needed for better fit
          autoSkip: true, // Let Chart.js handle label skipping
          autoSkipPadding: 10
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        }
      },
      yError: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Guide Error (arcsec)',
          color: 'rgb(255, 255, 255)'
        },
        ticks: {
          color: 'rgb(200, 200, 200)',
          callback: function(value: any) {
            return value.toFixed(1) + '"';
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        },
        // Use dynamic scaling based on data if available, otherwise use defaults
        max: rmsData?.MaxY || undefined,
        min: rmsData?.MinY || undefined
      },
      yDuration: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Correction Duration (ms)',
          color: 'rgb(255, 255, 255)'
        },
        ticks: {
          color: 'rgb(200, 200, 200)'
        },
        grid: {
          drawOnChartArea: false,
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        },
        max: rmsData?.MaxDurationY || undefined,
        min: rmsData?.MinDurationY || 0
      }
    },
    plugins: {
      legend: { 
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          color: 'rgb(255, 255, 255)',
          filter: function(item: any) {
            // Only show error lines in legend (hide duration bars to reduce clutter)
            return item.text.includes('Error');
          }
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'rgb(255, 255, 255)',
        bodyColor: 'rgb(200, 200, 200)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          title: function(context: any) {
            if (useTimeLabels) {
              return `Time: ${context[0]?.label}`;
            }
            return `Step #${context[0]?.label}`;
          },
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (label.includes('Error')) {
                label += context.parsed.y.toFixed(2) + '"';
              } else if (label.includes('Duration')) {
                label += context.parsed.y + 'ms';
              } else {
                label += context.parsed.y;
              }
            }
            return label;
          },
          afterBody: function(context: any) {
            if (useTimeLabels && context[0]) {
              const stepNumber = context[0].dataIndex + 1;
              const timeAgo = (guideStepCount - stepNumber) * exposureDuration;
              if (timeAgo > 0) {
                const minutes = Math.floor(timeAgo / 60);
                const seconds = timeAgo % 60;
                if (minutes > 0) {
                  return [`Captured ${minutes}m ${seconds}s ago`];
                } else {
                  return [`Captured ${seconds}s ago`];
                }
              }
            }
            return [];
          }
        }
      }
    }
  };
}
