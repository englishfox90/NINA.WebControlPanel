import React, { useState, useEffect } from 'react';
import { Card, Flex, Text, Badge, Grid, Box, Separator } from '@radix-ui/themes';
import { 
  ReloadIcon, 
  ExclamationTriangleIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  SunIcon,
  MoonIcon
} from '@radix-ui/react-icons';
import { WiDaySunny } from 'weather-icons-react';
import { getApiUrl } from '../config/api';
import type { WeatherResponse, WeatherWidgetProps } from '../interfaces/weather';

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ onRefresh, hideHeader = false }) => {
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(getApiUrl('nina/weather'));
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result: WeatherResponse = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching weather data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherData();
  }, []);

  const formatTemp = (temp: number | null) => {
    if (temp === null || temp === undefined) return 'N/A';
    return `${temp.toFixed(1)}°C`;
  };

  const getWindDirection = (degrees: number) => {
    if (degrees === null || degrees === undefined) return 'N/A';
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return `${directions[index]} (${degrees}°)`;
  };

  const getWeatherIcon = () => {
    if (!data?.Response.Connected) return <CrossCircledIcon />;
    const cloudCover = data.Response.CloudCover;
    if (cloudCover < 30) return <WiDaySunny size={20} color="gold" />;
    if (cloudCover < 70) return <SunIcon width="20" height="20" color="orange" />;
    return <MoonIcon width="20" height="20" color="gray" />;
  };

  if (loading) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          {!hideHeader && (
            <Flex align="center" gap="2">
              <WiDaySunny size={20} />
              <Text size="3" weight="medium">Weather Station</Text>
            </Flex>
          )}
          <Flex align="center" justify="center" style={{ minHeight: hideHeader ? '150px' : '200px' }}>
            <Flex direction="column" align="center" gap="2">
              <ReloadIcon className="loading-spinner" />
              <Text size="2" color="gray">Loading weather data...</Text>
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
          {!hideHeader && (
            <Flex align="center" gap="2">
              <WiDaySunny size={20} />
              <Text size="3" weight="medium">Weather Station</Text>
            </Flex>
          )}
          <Flex align="center" justify="center" style={{ minHeight: hideHeader ? '150px' : '200px' }}>
            <Flex direction="column" align="center" gap="2">
              <ExclamationTriangleIcon color="red" width="24" height="24" />
              <Text size="2" color="red">Failed to load weather data</Text>
              <Text size="1" color="gray">{error}</Text>
            </Flex>
          </Flex>
        </Flex>
      </Card>
    );
  }

  if (!data?.Response) return null;

  const weather = data.Response;

  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        {!hideHeader && (
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              {getWeatherIcon()}
              <Text size="3" weight="medium">Weather Station</Text>
            </Flex>
            <Badge color={weather.Connected ? 'green' : 'red'} size="2">
              {weather.Connected ? (
                <CheckCircledIcon width="12" height="12" />
              ) : (
                <CrossCircledIcon width="12" height="12" />
              )}
              {weather.Connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </Flex>
        )}

        {weather.Connected && (
          <Flex direction="column" gap="3">
            <Grid columns="2" gap="3">
              <Flex align="center" gap="2">
                <Text size="1">🌡️</Text>
                <Flex direction="column">
                  <Text size="1" color="gray">Temperature</Text>
                  <Text size="2" weight="medium">{formatTemp(weather.Temperature)}</Text>
                </Flex>
              </Flex>
              
              <Flex align="center" gap="2">
                <Text size="1">💧</Text>
                <Flex direction="column">
                  <Text size="1" color="gray">Humidity</Text>
                  <Text size="2" weight="medium">{weather.Humidity}%</Text>
                </Flex>
              </Flex>

              <Flex align="center" gap="2">
                <Text size="1">📊</Text>
                <Flex direction="column">
                  <Text size="1" color="gray">Pressure</Text>
                  <Text size="2" weight="medium">{weather.Pressure} hPa</Text>
                </Flex>
              </Flex>

              <Flex align="center" gap="2">
                <Text size="1">💨</Text>
                <Flex direction="column">
                  <Text size="1" color="gray">Wind</Text>
                  <Text size="2" weight="medium">{weather.WindSpeed?.toFixed(1)} km/h</Text>
                </Flex>
              </Flex>
            </Grid>

            <Separator />

            <Grid columns="1" gap="2">
              <Flex justify="between" align="center">
                <Text size="2">Cloud Cover</Text>
                <Text size="2" weight="medium">{weather.CloudCover}%</Text>
              </Flex>

              <Flex justify="between" align="center">
                <Text size="2">Dew Point</Text>
                <Text size="2" weight="medium">{formatTemp(weather.DewPoint)}</Text>
              </Flex>

              <Flex justify="between" align="center">
                <Text size="2">Wind Direction</Text>
                <Text size="2" weight="medium">{getWindDirection(weather.WindDirection)}</Text>
              </Flex>

              {parseFloat(weather.RainRate || '0') > 0 && (
                <Flex justify="between" align="center">
                  <Text size="2">Rain Rate</Text>
                  <Text size="2" weight="medium">{weather.RainRate}</Text>
                </Flex>
              )}
            </Grid>

            {weather.DisplayName && (
              <Box mt="2">
                <Text size="1" color="gray">{weather.DisplayName}</Text>
              </Box>
            )}
          </Flex>
        )}

        {!weather.Connected && (
          <Flex align="center" justify="center" style={{ minHeight: '100px' }}>
            <Text size="2" color="gray">Weather station not connected</Text>
          </Flex>
        )}
      </Flex>
    </Card>
  );
};

export default WeatherWidget;
