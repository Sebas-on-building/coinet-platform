import * as UI from '../ui';
import { WidgetAtom } from './WidgetAtom';

export const widgetRegistry = [
  {
    key: 'input',
    title: 'Input',
    icon: '⌨️',
    render: () => (
      <WidgetAtom title="Input" icon="⌨️">
        <UI.Input label="Your Name" helper="Enter your full name" clearable gradient glow />
      </WidgetAtom>
    ),
  },
  {
    key: 'avatar',
    title: 'Avatar',
    icon: '🧑‍💼',
    render: () => (
      <WidgetAtom title="Avatar" icon="🧑‍💼">
        <UI.Avatar initials="SJ" status="online" ring gradient glow />
      </WidgetAtom>
    ),
  },
  // ...add all atoms as widgets
]; 