import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  HStack,
  VStack,
  Text,
  Badge,
  IconButton,
  Tooltip,
  useColorModeValue,
  Card,
  CardBody
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import type {
  ASTNode,
  SignalConditionNode,
  LogicalOperatorNode,
  GroupNode,
  RuleParsingError,
  AlertStudioState
} from '@/services/signal-evaluation-engine/src/alerts/types';
import type { SignalType } from '@/services/signal-evaluation-engine/src/types';

interface RuleBuilderProps {
  studioState: AlertStudioState;
  onExpressionChange: (expression: string, ast?: any) => void;
  onValidate: (expression: string) => Promise<any>;
}

interface ExpressionNode {
  id: string;
  type: 'condition' | 'operator' | 'group';
  signalType?: string;
  operator?: string;
  threshold?: number;
  field?: string;
  left?: ExpressionNode;
  right?: ExpressionNode;
  parent?: ExpressionNode;
}

export const RuleBuilder: React.FC<RuleBuilderProps> = ({
  studioState,
  onExpressionChange,
  onValidate
}) => {
  const [rootNode, setRootNode] = useState<ExpressionNode | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<string | null>(null);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Convert AST-like structure to expression string
  const nodeToExpression = useCallback((node: ExpressionNode): string => {
    if (!node) return '';

    switch (node.type) {
      case 'condition':
        return `${node.signalType} ${node.operator} ${node.threshold}`;

      case 'operator':
        const leftExpr = node.left ? nodeToExpression(node.left) : '';
        const rightExpr = node.right ? nodeToExpression(node.right) : '';

        if (node.operator === 'NOT') {
          return `NOT ${leftExpr}`;
        }

        return `(${leftExpr} ${node.operator} ${rightExpr})`;

      case 'group':
        return `(${nodeToExpression(node.left || node.right!)})`;

      default:
        return '';
    }
  }, []);

  // Update expression when root node changes
  useEffect(() => {
    if (rootNode) {
      const expression = nodeToExpression(rootNode);
      onExpressionChange(expression, rootNode);

      // Auto-validate
      onValidate(expression);
    } else {
      onExpressionChange('', null);
    }
  }, [rootNode, nodeToExpression, onExpressionChange, onValidate]);

  // Create a new condition node
  const createConditionNode = useCallback((signalType: string): ExpressionNode => {
    return {
      id: `condition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'condition',
      signalType,
      operator: '>',
      threshold: 0,
      field: 'value'
    };
  }, []);

  // Create an operator node
  const createOperatorNode = useCallback((operator: string, left?: ExpressionNode, right?: ExpressionNode): ExpressionNode => {
    return {
      id: `operator_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'operator',
      operator,
      left,
      right
    };
  }, []);

  // Add a signal condition
  const addCondition = useCallback((signalType: string) => {
    const newNode = createConditionNode(signalType);

    if (!rootNode) {
      setRootNode(newNode);
    } else {
      // Add as right child of current selection or root
      const targetNode = selectedNodeId ? findNodeById(rootNode, selectedNodeId) : rootNode;

      if (targetNode && targetNode.type !== 'condition') {
        // Replace empty right child
        if (!targetNode.right) {
          targetNode.right = newNode;
          newNode.parent = targetNode;
        } else if (!targetNode.left) {
          targetNode.left = newNode;
          newNode.parent = targetNode;
        }
      } else {
        // Create AND operator to combine
        const operatorNode = createOperatorNode('AND', rootNode, newNode);
        newNode.parent = operatorNode;
        if (rootNode) rootNode.parent = operatorNode;
        setRootNode(operatorNode);
      }

      setRootNode({ ...rootNode });
    }

    setSelectedNodeId(newNode.id);
  }, [rootNode, selectedNodeId, createConditionNode, createOperatorNode]);

  // Add a logical operator
  const addOperator = useCallback((operator: string) => {
    if (!selectedNodeId || !rootNode) return;

    const selectedNode = findNodeById(rootNode, selectedNodeId);
    if (!selectedNode || selectedNode.type === 'operator') return;

    const newOperatorNode = createOperatorNode(operator);
    const parent = selectedNode.parent;

    if (parent) {
      // Replace the selected node with the new operator
      if (parent.left?.id === selectedNode.id) {
        parent.left = newOperatorNode;
      } else if (parent.right?.id === selectedNode.id) {
        parent.right = newOperatorNode;
      }
      newOperatorNode.parent = parent;

      // Move selected node to left of operator
      newOperatorNode.left = selectedNode;
      selectedNode.parent = newOperatorNode;
    } else {
      // Replace root with operator
      newOperatorNode.left = selectedNode;
      selectedNode.parent = newOperatorNode;
      setRootNode(newOperatorNode);
    }

    setRootNode({ ...rootNode });
    setSelectedNodeId(newOperatorNode.id);
  }, [selectedNodeId, rootNode, createOperatorNode]);

  // Delete a node
  const deleteNode = useCallback((nodeId: string) => {
    if (!rootNode) return;

    const deleteFromTree = (node: ExpressionNode): ExpressionNode | null => {
      if (node.left?.id === nodeId) {
        node.left = null;
        return node;
      }

      if (node.right?.id === nodeId) {
        node.right = null;
        return node;
      }

      if (node.left) node.left = deleteFromTree(node.left);
      if (node.right) node.right = deleteFromTree(node.right);

      return node;
    };

    const newRoot = deleteFromTree(rootNode);

    if (newRoot?.id === nodeId) {
      setRootNode(null);
    } else {
      setRootNode(newRoot);
    }

    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  }, [rootNode, selectedNodeId]);

  // Find node by ID
  const findNodeById = useCallback((node: ExpressionNode, id: string): ExpressionNode | null => {
    if (node.id === id) return node;

    if (node.left) {
      const found = findNodeById(node.left, id);
      if (found) return found;
    }

    if (node.right) {
      const found = findNodeById(node.right, id);
      if (found) return found;
    }

    return null;
  }, []);

  // Render a node
  const renderNode = useCallback((node: ExpressionNode, isRoot: boolean = false): React.ReactNode => {
    const isSelected = selectedNodeId === node.id;

    const nodeStyle = {
      p: 3,
      border: '2px solid',
      borderColor: isSelected ? 'blue.400' : borderColor,
      borderRadius: 'md',
      bg: isSelected ? 'blue.50' : bgColor,
      cursor: 'pointer',
      minW: '120px',
      position: 'relative' as const,
      _hover: {
        borderColor: 'blue.300'
      }
    };

    switch (node.type) {
      case 'condition':
        return (
          <Card key={node.id} {...nodeStyle} onClick={() => setSelectedNodeId(node.id)}>
            <CardBody p={2}>
              <VStack spacing={1} align="stretch">
                <Badge colorScheme="purple" fontSize="xs">
                  {node.signalType}
                </Badge>
                <Text fontSize="sm" fontWeight="medium">
                  {node.operator} {node.threshold}
                </Text>
                <HStack spacing={1}>
                  <Tooltip label="Delete">
                    <IconButton
                      aria-label="Delete condition"
                      icon={<DeleteIcon />}
                      size="xs"
                      colorScheme="red"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNode(node.id);
                      }}
                    />
                  </Tooltip>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        );

      case 'operator':
        return (
          <Card key={node.id} {...nodeStyle} onClick={() => setSelectedNodeId(node.id)}>
            <CardBody p={2}>
              <VStack spacing={2} align="stretch">
                <Badge colorScheme="green" fontSize="xs" textAlign="center">
                  {node.operator}
                </Badge>

                <Flex direction="column" gap={2}>
                  {node.left && (
                    <Box>
                      {renderNode(node.left)}
                    </Box>
                  )}

                  {node.right && (
                    <Box>
                      {renderNode(node.right)}
                    </Box>
                  )}

                  {!node.left && !node.right && (
                    <Text fontSize="xs" color="gray.500" textAlign="center">
                      Drop conditions here
                    </Text>
                  )}
                </Flex>

                <HStack spacing={1}>
                  <Tooltip label="Delete">
                    <IconButton
                      aria-label="Delete operator"
                      icon={<DeleteIcon />}
                      size="xs"
                      colorScheme="red"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNode(node.id);
                      }}
                    />
                  </Tooltip>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        );

      default:
        return null;
    }
  }, [selectedNodeId, borderColor, bgColor, deleteNode]);

  return (
    <Box h="400px">
      <VStack spacing={4} align="stretch" h="100%">
        {/* Toolbar */}
        <HStack spacing={2} wrap="wrap">
          <Text fontSize="sm" fontWeight="medium">Add Condition:</Text>
          {studioState.availableSignals.map((signal) => (
            <Button
              key={signal}
              size="sm"
              variant="outline"
              colorScheme="purple"
              onClick={() => addCondition(signal)}
            >
              {signal}
            </Button>
          ))}
        </HStack>

        <HStack spacing={2} wrap="wrap">
          <Text fontSize="sm" fontWeight="medium">Add Operator:</Text>
          {['AND', 'OR', 'NOT'].map((operator) => (
            <Button
              key={operator}
              size="sm"
              variant="outline"
              colorScheme="green"
              onClick={() => addOperator(operator)}
              isDisabled={!selectedNodeId || selectedNodeId === rootNode?.id}
            >
              {operator}
            </Button>
          ))}
        </HStack>

        <Box border="2px dashed" borderColor={borderColor} borderRadius="md" p={4} minH="200px">
          {rootNode ? (
            renderNode(rootNode, true)
          ) : (
            <VStack spacing={4} align="center" justify="center" h="100%" color="gray.500">
              <Text fontSize="lg" textAlign="center">
                Start building your rule
              </Text>
              <Text fontSize="sm" textAlign="center">
                Click on signal types above to add conditions, then use operators to combine them
              </Text>
            </VStack>
          )}
        </Box>

        {/* Expression Preview */}
        {rootNode && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2}>
              Expression:
            </Text>
            <Box
              p={3}
              bg="gray.100"
              borderRadius="md"
              fontFamily="mono"
              fontSize="sm"
              wordBreak="break-all"
            >
              {nodeToExpression(rootNode)}
            </Box>
          </Box>
        )}
      </VStack>
    </Box>
  );
};
