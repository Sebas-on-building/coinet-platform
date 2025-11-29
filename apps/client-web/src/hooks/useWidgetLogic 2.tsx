// This file must be .tsx to support JSX in the render function.
import React, { useMemo } from 'react';

interface WidgetLogicResult {
  data: any;
  render: (data: any) => JSX.Element;
}

export function useWidgetLogic(type: string, props: any): WidgetLogicResult {
  // Example: switch on widget type for demo
  const data = useMemo(() => {
    if (type === 'chart') return { points: [1, 2, 3, 4] };
    if (type === 'status') return { status: 'ok' };
    return {};
  }, [type, props]);

  function render(data: any): JSX.Element {
    if (type === 'chart') {
      return (<div style= {{ padding: 24 }
    }> Chart: { JSON.stringify(data.points) } </div>);
  }
  if (type === 'status') {
    return (<div style= {{ padding: 24 }
  }> Status: { data.status } </div>);
}
return (<div style= {{ padding: 24 }}> Widget: { type } </div>);
  }

return { data, render };
} 