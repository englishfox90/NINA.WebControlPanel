// Image-related interfaces for the ImageViewer widget

export interface ImageStatistics {
  ExposureTime: number;
  ImageType: string;
  Filter: string;
  Temperature: number;
  CameraName: string;
  Date: string;
  Gain: number;
  Offset: number;
  HFR: number;
  Stars: number;
  Mean: number;
  StDev: number;
  TelescopeName: string;
  RmsText: string;
  [key: string]: any;
}

export interface ImageSaveEvent {
  Type: 'IMAGE-SAVE';
  Timestamp: string;
  Data: {
    ImageStatistics: ImageStatistics;
  };
}
