declare module 'weather-icons-react' {
  export interface WeatherIconProps {
    size?: number;
    color?: string;
    className?: string;
  }

  export const WiSunrise: React.FC<WeatherIconProps>;
  export const WiSunset: React.FC<WeatherIconProps>;
  export const WiDaySunny: React.FC<WeatherIconProps>;
  export const WiNightClear: React.FC<WeatherIconProps>;
  export const WiMoonrise: React.FC<WeatherIconProps>;
  export const WiMoonset: React.FC<WeatherIconProps>;
  export const WiMoonNew: React.FC<WeatherIconProps>;
  export const WiMoonWaxingCrescent3: React.FC<WeatherIconProps>;
  export const WiMoonFirstQuarter: React.FC<WeatherIconProps>;
  export const WiMoonWaxingGibbous3: React.FC<WeatherIconProps>;
  export const WiMoonFull: React.FC<WeatherIconProps>;
  export const WiMoonWaningGibbous3: React.FC<WeatherIconProps>;
  export const WiMoonThirdQuarter: React.FC<WeatherIconProps>;
  export const WiMoonWaningCrescent3: React.FC<WeatherIconProps>;
}
