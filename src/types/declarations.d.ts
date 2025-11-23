/**
 * Type declarations for libraries without TypeScript definitions
 */

// ReactFlow declarations
declare module 'reactflow' {
  import { CSSProperties, ReactNode, MouseEvent as ReactMouseEvent } from 'react';

  export type NodeTypes = Record<string, React.ComponentType<NodeProps>>;

  export interface NodeProps<T = any> {
    id: string;
    data: T;
    type?: string;
    selected?: boolean;
    isConnectable?: boolean;
    xPos?: number;
    yPos?: number;
    dragHandle?: string;
    style?: CSSProperties;
    className?: string;
    sourcePosition?: Position;
    targetPosition?: Position;
    hidden?: boolean;
    dragging?: boolean;
    draggable?: boolean;
    selectable?: boolean;
    connectable?: boolean;
    zIndex?: number;
    ariaLabel?: string;
  }

  export enum Position {
    Left = 'left',
    Top = 'top',
    Right = 'right',
    Bottom = 'bottom'
  }

  export interface HandleProps {
    type: 'source' | 'target';
    position: Position;
    id?: string;
    style?: CSSProperties;
    className?: string;
    isConnectable?: boolean;
    isConnectableStart?: boolean;
    isConnectableEnd?: boolean;
    onConnect?: (params: Edge | Connection) => void;
  }

  export interface EdgeProps {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    type?: string;
    animated?: boolean;
    style?: CSSProperties;
    className?: string;
    selected?: boolean;
    data?: any;
    zIndex?: number;
    ariaLabel?: string;
  }

  export interface Edge<T = any> {
    id?: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    type?: string;
    animated?: boolean;
    style?: CSSProperties;
    data?: T;
    className?: string;
    sourceNode?: Node;
    targetNode?: Node;
    selected?: boolean;
    markerEnd?: {
      type: MarkerType;
      color?: string;
      width?: number;
      height?: number;
      markerUnits?: string;
      orient?: string;
    };
    markerStart?: {
      type: MarkerType;
      color?: string;
      width?: number;
      height?: number;
      markerUnits?: string;
      orient?: string;
    };
    zIndex?: number;
    ariaLabel?: string;
  }

  export interface Connection {
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }

  export enum MarkerType {
    Arrow = 'arrow',
    ArrowClosed = 'arrowclosed',
  }

  export interface ReactFlowProps {
    nodes?: Node[];
    edges?: Edge[];
    defaultNodes?: Node[];
    defaultEdges?: Edge[];
    onNodesChange?: (changes: NodeChange[]) => void;
    onEdgesChange?: (changes: EdgeChange[]) => void;
    onConnect?: (connection: Connection) => void;
    onInit?: (instance: any) => void;
    onNodeClick?: (event: ReactMouseEvent, node: Node) => void;
    onNodeDragStart?: (event: ReactMouseEvent, node: Node) => void;
    onNodeDrag?: (event: ReactMouseEvent, node: Node) => void;
    onNodeDragStop?: (event: ReactMouseEvent, node: Node) => void;
    onNodesDelete?: (nodes: Node[]) => void;
    onEdgesDelete?: (edges: Edge[]) => void;
    onSelectionChange?: (elements: { nodes: Node[]; edges: Edge[] }) => void;
    onSelectionDragStart?: (event: ReactMouseEvent, nodes: Node[]) => void;
    onSelectionDrag?: (event: ReactMouseEvent, nodes: Node[]) => void;
    onSelectionDragStop?: (event: ReactMouseEvent, nodes: Node[]) => void;
    onSelectionContextMenu?: (event: ReactMouseEvent, nodes: Node[]) => void;
    onConnectStart?: (event: ReactMouseEvent, params: any) => void;
    onConnectStop?: (event: ReactMouseEvent) => void;
    onConnectEnd?: (event: ReactMouseEvent) => void;
    onClickConnectStart?: (event: ReactMouseEvent, params: any) => void;
    onClickConnectStop?: (event: ReactMouseEvent) => void;
    onClickConnectEnd?: (event: ReactMouseEvent) => void;
    onNodeMouseEnter?: (event: ReactMouseEvent, node: Node) => void;
    onNodeMouseMove?: (event: ReactMouseEvent, node: Node) => void;
    onNodeMouseLeave?: (event: ReactMouseEvent, node: Node) => void;
    onNodeContextMenu?: (event: ReactMouseEvent, node: Node) => void;
    onEdgeContextMenu?: (event: ReactMouseEvent, edge: Edge) => void;
    onPaneClick?: (event: ReactMouseEvent) => void;
    onPaneScroll?: (event?: ReactMouseEvent) => void;
    onPaneContextMenu?: (event: ReactMouseEvent) => void;
    onPaneMouseEnter?: (event: ReactMouseEvent) => void;
    onPaneMouseMove?: (event: ReactMouseEvent) => void;
    onPaneMouseLeave?: (event: ReactMouseEvent) => void;
    onMove?: (event?: ReactMouseEvent, viewport?: Viewport) => void;
    onMoveStart?: (event?: ReactMouseEvent, viewport?: Viewport) => void;
    onMoveEnd?: (event?: ReactMouseEvent, viewport?: Viewport) => void;
    nodeTypes?: NodeTypes;
    edgeTypes?: Record<string, React.ComponentType<EdgeProps>>;
    connectionLineType?: string;
    connectionLineStyle?: CSSProperties;
    connectionLineComponent?: React.ComponentType<any>;
    connectionMode?: string;
    deleteKeyCode?: string | null;
    selectionKeyCode?: string | null;
    multiSelectionKeyCode?: string | null;
    zoomActivationKeyCode?: string | null;
    snapToGrid?: boolean;
    snapGrid?: [number, number];
    nodesDraggable?: boolean;
    nodesConnectable?: boolean;
    elementsSelectable?: boolean;
    selectNodesOnDrag?: boolean;
    panOnDrag?: boolean | number[];
    panOnScroll?: boolean;
    panOnScrollSpeed?: number;
    panOnScrollMode?: string;
    zoomOnScroll?: boolean;
    zoomOnPinch?: boolean;
    zoomOnDoubleClick?: boolean;
    preventScrolling?: boolean;
    defaultViewport?: Viewport;
    minZoom?: number;
    maxZoom?: number;
    attributionPosition?: string;
    fitView?: boolean;
    fitViewOptions?: any;
    connectOnClick?: boolean;
    defaultMarkerColor?: string;
    defaultEdgeOptions?: any;
    children?: ReactNode;
  }

  export interface Node<T = any> {
    id: string;
    position: {
      x: number;
      y: number;
    };
    data: T;
    type?: string;
    style?: CSSProperties;
    className?: string;
    sourcePosition?: Position;
    targetPosition?: Position;
    hidden?: boolean;
    selected?: boolean;
    dragging?: boolean;
    draggable?: boolean;
    selectable?: boolean;
    connectable?: boolean;
    dragHandle?: string;
    width?: number;
    height?: number;
    parentNode?: string;
    zIndex?: number;
    extent?: 'parent' | [number, number, number, number];
    expandParent?: boolean;
    positionAbsolute?: {
      x: number;
      y: number;
    };
    ariaLabel?: string;
  }

  export type NodeChange = any;
  export type EdgeChange = any;
  export type Viewport = { x: number; y: number; zoom: number };

  export const Handle: React.FC<HandleProps>;
  export const Background: React.FC<any>;
  export const Controls: React.FC<any>;
  export const MiniMap: React.FC<any>;
  export const Panel: React.FC<any>;
  export function ReactFlowProvider(props: any): JSX.Element;
  export function useNodesState(initialNodes: Node[]): [Node[], (nodes: Node[]) => void, (changes: NodeChange[]) => void];
  export function useEdgesState(initialEdges: Edge[]): [Edge[], (edges: Edge[]) => void, (changes: EdgeChange[]) => void];
  export function addEdge(edgeParams: Edge | Connection, edges: Edge[]): Edge[];

  export default function ReactFlow(props: ReactFlowProps): JSX.Element;
}

// Heroicons declarations
declare module '@heroicons/react/outline' {
  import { ComponentType, SVGAttributes } from 'react';

  export const ChartBarIcon: ComponentType<SVGAttributes<SVGElement>>;
  export const CogIcon: ComponentType<SVGAttributes<SVGElement>>;
  export const InformationCircleIcon: ComponentType<SVGAttributes<SVGElement>>;
  export const RefreshIcon: ComponentType<SVGAttributes<SVGElement>>;
  export const LightningBoltIcon: ComponentType<SVGAttributes<SVGElement>>;
  export const TrashIcon: ComponentType<SVGAttributes<SVGElement>>;
  export const DocumentTextIcon: ComponentType<SVGAttributes<SVGElement>>;
  export const ExclamationIcon: ComponentType<SVGAttributes<SVGElement>>;
  export const CheckCircleIcon: ComponentType<SVGAttributes<SVGElement>>;
  export const XCircleIcon: ComponentType<SVGAttributes<SVGElement>>;
  export const PlusCircleIcon: ComponentType<SVGAttributes<SVGElement>>;
  export const MinusCircleIcon: ComponentType<SVGAttributes<SVGElement>>;
  export const CurrencyDollarIcon: ComponentType<SVGAttributes<SVGElement>>;
  export const SaveIcon: ComponentType<SVGAttributes<SVGElement>>;
  export const AdjustmentsIcon: ComponentType<SVGAttributes<SVGElement>>;
  export const ArrowsExpandIcon: ComponentType<SVGAttributes<SVGElement>>;
  export const XIcon: ComponentType<SVGAttributes<SVGElement>>;
  export const ChevronDownIcon: ComponentType<SVGAttributes<SVGElement>>;
  export const SwitchHorizontalIcon: ComponentType<SVGAttributes<SVGElement>>;
  export const ArrowSmRightIcon: ComponentType<SVGAttributes<SVGElement>>;
  export const CashIcon: ComponentType<SVGAttributes<SVGElement>>;
  export const ShieldCheckIcon: ComponentType<SVGAttributes<SVGElement>>;
  export const BellIcon: ComponentType<SVGAttributes<SVGElement>>;
  export const PlusIcon: ComponentType<SVGAttributes<SVGElement>>;
}

declare module '@testing-library/react';
declare module 'clsx';
declare module 'node-schedule';
declare module 'react-hot-toast';
declare module 'nodemailer';
declare module '@sentry/nextjs';
declare module 'rss-parser';
declare module '@reduxjs/toolkit';
declare module 'redux-persist';
declare module 'redux-persist/lib/storage';
declare module 'firebase/app';
declare module 'firebase/messaging';
declare module 'firebase/firestore';
declare module 'winston';
declare module 'node-mocks-http';
declare module '@tensorflow/tfjs-node';
declare module 'ethers';
declare module '@/services/tokenRegistry';
declare module 'tailwind-merge';
declare module '@fingerprintjs/fingerprintjs';
declare module 'jose';
declare module '@amplitude/analytics-browser';
declare module '@segment/analytics-next';
declare module 'bad-words';
declare module 'franc-min';
declare module 'sentiment';
declare module 'sentiment-fr';
declare module 'twilio';
declare module 'zxcvbn';
declare module 'express-rate-limit';
declare module 'dompurify';
declare module '@/services/market/MarketDataService'; 