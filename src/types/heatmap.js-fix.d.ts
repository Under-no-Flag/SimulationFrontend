declare module 'heatmap.js-fix' {
  interface HeatmapDataPoint {
    x: number;
    y: number;
    value: number;
  }

  interface HeatmapData {
    max: number;
    data: HeatmapDataPoint[];
  }

  interface HeatmapConfig {
    container: HTMLElement;
    width?: number;
    height?: number;
    blur?: string | number;
    radius?: number;
  }

  interface HeatmapInstance {
    _renderer: {
      canvas: HTMLCanvasElement;
    };
    setData(data: HeatmapData): void;
  }

  const h337: {
    create(config: HeatmapConfig): HeatmapInstance;
  };

  export = h337;
}
