import React, { useState, useEffect } from 'react';
import { Card, Flex, Box, Text, Badge, Progress, Button, ScrollArea } from '@radix-ui/themes';
import { 
  TargetIcon, 
  ReloadIcon, 
  ExclamationTriangleIcon,
  CheckCircledIcon,
  DotFilledIcon,
  ImageIcon,
  ClockIcon
} from '@radix-ui/react-icons';

interface TargetSchedulerProps {
  onRefresh?: () => void;
}

export const TargetSchedulerWidget: React.FC<TargetSchedulerProps> = ({ onRefresh }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3001/api/scheduler/progress');
      if (!response.ok) throw new Error('Failed to fetch');
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'API Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchData();
    onRefresh?.();
  };

  if (loading) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex align="center" gap="2">
            <TargetIcon />
            <Text size="3" weight="medium">Target Scheduler</Text>
          </Flex>
          <Flex align="center" justify="center" style={{ minHeight: '200px' }}>
            <Flex direction="column" align="center" gap="2">
              <ReloadIcon className="loading-spinner" />
              <Text size="2" color="gray">Loading projects...</Text>
            </Flex>
          </Flex>
        </Flex>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex align="center" gap="2">
            <TargetIcon />
            <Text size="3" weight="medium">Target Scheduler</Text>
          </Flex>
          <Flex align="center" justify="center" style={{ minHeight: '200px' }}>
            <Flex direction="column" align="center" gap="2">
              <ExclamationTriangleIcon color="red" width="24" height="24" />
              <Text size="2" color="red">Failed to load data</Text>
              <Text size="1" color="gray">{error}</Text>
              <Button size="1" onClick={handleRefresh}>
                <ReloadIcon /> Try Again
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </Card>
    );
  }

  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        <Flex justify="between" align="center">
          <Flex align="center" gap="2">
            <TargetIcon />
            <Text size="3" weight="medium">Target Scheduler</Text>
          </Flex>
          <Flex align="center" gap="2">
            <Badge color="green" size="2">
              <CheckCircledIcon width="12" height="12" />
              {data?.activeProjects || 0} Projects
            </Badge>
            <Button variant="ghost" size="1" onClick={handleRefresh}>
              <ReloadIcon />
            </Button>
          </Flex>
        </Flex>

        <ScrollArea style={{ height: '300px' }}>
          <Flex direction="column" gap="3">
            {data?.projects?.map((project: any) => (
              <Card key={project.id} variant="surface">
                <Box p="3">
                  <Flex justify="between" align="center" mb="2">
                    <Text weight="bold" size="3">{project.name}</Text>
                    <Badge variant="soft" color={project.priority === 2 ? 'red' : 'amber'}>
                      {project.priority === 2 ? 'High' : 'Normal'}
                    </Badge>
                  </Flex>
                  
                  <Flex justify="between" align="center" mb="2">
                    <Flex align="center" gap="2">
                      <ImageIcon width="14" height="14" />
                      <Text size="2" color="gray">{project.totalImages} images</Text>
                    </Flex>
                    <Text size="2" weight="bold" color="green">
                      {project.totalCompletion?.toFixed(1) || 0}% complete
                    </Text>
                  </Flex>
                  
                  <Progress 
                    value={project.totalCompletion || 0} 
                    color="green"
                  />
                </Box>
              </Card>
            )) || <Text size="2" color="gray">No projects found</Text>}
          </Flex>
        </ScrollArea>

        <Flex justify="between" align="center" pt="2" style={{ borderTop: '1px solid var(--gray-6)' }}>
          <Text size="1" color="gray">
            Last updated: {new Date().toLocaleTimeString()}
          </Text>
          <Flex align="center" gap="1">
            <DotFilledIcon color="green" width="12" height="12" />
            <Text size="1" color="green">Live Data</Text>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
};

export default TargetSchedulerWidget;
