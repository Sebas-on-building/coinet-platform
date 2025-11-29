export function useSnapToGrid(x: number, y: number, grid = 40) {
  return {
    x: Math.round(x / grid) * grid,
    y: Math.round(y / grid) * grid,
  };
} 