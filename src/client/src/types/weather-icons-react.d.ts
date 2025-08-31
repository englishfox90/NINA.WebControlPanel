declare module 'weather-icons-react' {
  import { Component } from 'react';

  export interface WeatherIconProps {
    name?: string;
    size?: string | number;
    color?: string;
    className?: string;
    style?: React.CSSProperties;
  }

  export class WeatherIcon extends Component<WeatherIconProps> {}

  // Specific weather icon components
  export class WiSunrise extends Component<WeatherIconProps> {}
  export class WiSunset extends Component<WeatherIconProps> {}
  export class WiMoonNew extends Component<WeatherIconProps> {}
  export class WiMoonWaxingCrescent3 extends Component<WeatherIconProps> {}
  export class WiMoonFirstQuarter extends Component<WeatherIconProps> {}
  export class WiMoonWaxingGibbous3 extends Component<WeatherIconProps> {}
  export class WiMoonFull extends Component<WeatherIconProps> {}
  export class WiMoonWaningGibbous3 extends Component<WeatherIconProps> {}
  export class WiMoonThirdQuarter extends Component<WeatherIconProps> {}
  export class WiMoonWaningCrescent3 extends Component<WeatherIconProps> {}

  // Weather condition icons
  export class WiDaySunny extends Component<WeatherIconProps> {}
  export class WiDayCloudy extends Component<WeatherIconProps> {}
  export class WiDayCloudyWindy extends Component<WeatherIconProps> {}
  export class WiDayRain extends Component<WeatherIconProps> {}
  export class WiDayRainMix extends Component<WeatherIconProps> {}
  export class WiDaySnow extends Component<WeatherIconProps> {}
  export class WiCloudy extends Component<WeatherIconProps> {}
  export class WiCloudyWindy extends Component<WeatherIconProps> {}
  export class WiRain extends Component<WeatherIconProps> {}
  export class WiRainMix extends Component<WeatherIconProps> {}
  export class WiSnow extends Component<WeatherIconProps> {}
  export class WiFog extends Component<WeatherIconProps> {}
  export class WiThunderstorm extends Component<WeatherIconProps> {}
  export class WiHurricane extends Component<WeatherIconProps> {}
  export class WiTornado extends Component<WeatherIconProps> {}

  // Atmospheric condition icons
  export class WiBarometer extends Component<WeatherIconProps> {}
  export class WiHumidity extends Component<WeatherIconProps> {}
  export class WiThermometer extends Component<WeatherIconProps> {}
  export class WiStrongWind extends Component<WeatherIconProps> {}
  export class WiWindy extends Component<WeatherIconProps> {}
  export class WiDust extends Component<WeatherIconProps> {}
  export class WiSmoke extends Component<WeatherIconProps> {}
  export class WiHot extends Component<WeatherIconProps> {}
  export class WiSandstorm extends Component<WeatherIconProps> {}

  export default WeatherIcon;
}
