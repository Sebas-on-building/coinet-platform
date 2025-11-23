import { Resizable } from 're-resizable';
import { useWidgetLogic } from '../../hooks/useWidgetLogic';

interface WidgetProps {
  id: string;
  type: string;
  [key: string]: any;
}

export function Widget({ id, type, ...props }: WidgetProps) {
  const { data, render } = useWidgetLogic(type, props);

  return (
    <Resizable
      defaultSize={{ width: 400, height: 300 }}
      className="rounded-xl shadow-lg bg-white/80 backdrop-blur-md border border-gray-200"
    >
      {render(data)}
    </Resizable>
  );
} 