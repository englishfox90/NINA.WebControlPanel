/**
 * Session Alerts Component
 * Displays critical session alerts like plate solving failures
 */

import React, { useState, useEffect } from 'react';
import { Flex, Text, Badge, Box, Button } from '@radix-ui/themes';
import { ExclamationTriangleIcon, CheckCircledIcon, Cross1Icon } from '@radix-ui/react-icons';
import { useSessionWebSocket } from '../../hooks/useUnifiedWebSocket';

interface SessionAlertsProps {
  sessionData: any;
}

interface AlertState {
  id: string;
  type: 'platesolve-error' | 'platesolve-recovered';
  message: string;
  timestamp: string;
  isActive: boolean;
}

export const SessionAlerts: React.FC<SessionAlertsProps> = ({ sessionData }) => {
  const [alerts, setAlerts] = useState<AlertState[]>([]);
  const [platesolveErrorActive, setPlatesolveErrorActive] = useState(false);
  const [platesolveErrorCount, setPlatesolveErrorCount] = useState(0);
  const [lastPlatesolveError, setLastPlatesolveError] = useState<string | null>(null);

  const { onWidgetEvent } = useSessionWebSocket();

  // Handle WebSocket events for plate solving
  useEffect(() => {
    const unsubscribe = onWidgetEvent((event: any) => {
      const timestamp = new Date().toISOString();
      
      switch (event.Type) {
        case 'ERROR-PLATESOLVE':
          console.log('🚨 Plate solving error detected:', event);
          setPlatesolveErrorActive(true);
          setPlatesolveErrorCount(prev => prev + 1);
          setLastPlatesolveError(timestamp);
          
          // Add/update alert
          setAlerts(prev => {
            const existingIndex = prev.findIndex(a => a.type === 'platesolve-error');
            const newAlert: AlertState = {
              id: 'platesolve-error',
              type: 'platesolve-error',
              message: `Plate solving failed (${platesolveErrorCount + 1}x)`,
              timestamp,
              isActive: true
            };
            
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = newAlert;
              return updated;
            } else {
              return [newAlert, ...prev];
            }
          });
          break;
          
        case 'IMAGE-SAVE':
          // Check if this is a successful image save after plate solve errors
          if (platesolveErrorActive && event.Data?.ImageStatistics?.ImageType === 'LIGHT') {
            console.log('✅ Successful image save after plate solve errors - marking as recovered');
            setPlatesolveErrorActive(false);
            
            // Add recovery alert
            setAlerts(prev => [{
              id: 'platesolve-recovered',
              type: 'platesolve-recovered',
              message: 'Plate solving recovered - imaging resumed',
              timestamp,
              isActive: true
            }, ...prev.slice(0, 2)]); // Keep only recent alerts
          }
          break;
          
        case 'GUIDING':
          // Successful guiding also indicates recovery from plate solve issues
          if (platesolveErrorActive) {
            console.log('✅ Guiding active after plate solve errors - marking as recovered');
            setPlatesolveErrorActive(false);
          }
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [onWidgetEvent, platesolveErrorActive, platesolveErrorCount]);

  // Auto-dismiss recovery alerts after 30 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setAlerts(prev => prev.filter(alert => alert.type !== 'platesolve-recovered'));
    }, 30000);

    return () => clearTimeout(timer);
  }, [alerts]);

  // Dismiss specific alert
  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    if (alertId === 'platesolve-error') {
      setPlatesolveErrorActive(false);
    }
  };

  // Don't render if no active alerts
  const activeAlerts = alerts.filter(alert => alert.isActive);
  if (activeAlerts.length === 0) return null;

  return (
    <Flex direction="column" gap="2" mb="3">
      {activeAlerts.map((alert) => (
        <Box 
          key={alert.id}
          p="3" 
          style={{ 
            backgroundColor: alert.type === 'platesolve-error' ? 'var(--red-2)' : 'var(--green-2)', 
            borderRadius: 'var(--radius-2)',
            border: `1px solid ${alert.type === 'platesolve-error' ? 'var(--red-6)' : 'var(--green-6)'}`
          }}
        >
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              {alert.type === 'platesolve-error' ? (
                <ExclamationTriangleIcon 
                  width="16" 
                  height="16" 
                  style={{ color: 'var(--red-9)' }} 
                />
              ) : (
                <CheckCircledIcon 
                  width="16" 
                  height="16" 
                  style={{ color: 'var(--green-9)' }} 
                />
              )}
              <Text 
                size="2" 
                weight="medium"
                style={{ color: alert.type === 'platesolve-error' ? 'var(--red-11)' : 'var(--green-11)' }}
              >
                {alert.message}
              </Text>
              {alert.type === 'platesolve-error' && lastPlatesolveError && (
                <Badge 
                  variant="soft" 
                  color="red" 
                  size="1"
                >
                  {new Date(lastPlatesolveError).toLocaleTimeString()}
                </Badge>
              )}
            </Flex>
            <Button
              variant="ghost"
              size="1"
              onClick={() => dismissAlert(alert.id)}
              style={{ color: 'var(--gray-9)' }}
            >
              <Cross1Icon width="12" height="12" />
            </Button>
          </Flex>
          
          {alert.type === 'platesolve-error' && (
            <Text size="1" color="gray" mt="1">
              Check target coordinates, camera focus, or observatory conditions
            </Text>
          )}
        </Box>
      ))}
    </Flex>
  );
};
