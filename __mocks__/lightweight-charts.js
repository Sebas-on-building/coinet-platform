module.exports = {
  createChart: jest.fn(() => ({
    addSeries: jest.fn(() => ({ setData: jest.fn() })),
    remove: jest.fn(),
    timeScale: jest.fn(() => ({ fitContent: jest.fn() })),
    applyOptions: jest.fn(),
    subscribeCrosshairMove: jest.fn(),
  })),
  ColorType: { Solid: "solid" },
  LineSeries: "LineSeries",
  CrosshairMode: { Normal: "normal" },
};
