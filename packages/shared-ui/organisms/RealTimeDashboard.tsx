import React, { useEffect, useState, useRef } from 'react';
import { Box, Flex, Heading, Button, Input, Spinner, IconButton } from '@chakra-ui/react';
import { Table } from '@chakra-ui/react';
import { Tabs } from '@chakra-ui/react';
import { Menu } from '@chakra-ui/react';
import { Dialog } from '@chakra-ui/react';
import { Stat } from '@chakra-ui/react';
import { Avatar } from '@chakra-ui/react';
import { Tag } from '@chakra-ui/react';
import { Badge } from '@chakra-ui/react';
import { SettingsIcon } from '@chakra-ui/icons';
import { Alert } from '../atoms/Alert';
import { useMyPresence, useOthers, useRoom, useBroadcastEvent } from '@liveblocks/react';
import { StatGroup } from '@chakra-ui/react';
import { useToast } from '../../../src/hooks/useToast';

// Mocked user roles/permissions for RBAC UI
const userRole = 'admin';
const userPermissions = ['market:read', 'plugin:execute', 'analytics:read', 'privacy:export', 'privacy:delete'];

export const RealTimeDashboard: React.FC = () => {
  const [marketData, setMarketData] = useState<any[]>([]);
  const [pluginResults, setPluginResults] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [presence, updatePresence] = useMyPresence();
  const others = useOthers();
  const room = useRoom();
  const wsRef = useRef<WebSocket | null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const { showToast } = useToast();

  // Real-time market ticker via WS
  useEffect(() => {
    const ws = new WebSocket('wss://api.coinet.com/stream');
    wsRef.current = ws;
    ws.onopen = () => {
      ws.send(JSON.stringify({ subscribe: 'BTCUSD', token: 'demo-jwt-token' }));
      ws.send(JSON.stringify({ subscribe: 'ETHUSD', token: 'demo-jwt-token' }));
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.symbol && data.price) {
          setMarketData(prev => {
            const filtered = prev.filter(d => d.symbol !== data.symbol);
            return [...filtered, data];
          });
        }
        if (data.pluginResult) {
          setPluginResults(prev => [...prev, data.pluginResult]);
        }
        if (data.metrics) {
          setMetrics(data.metrics);
        }
        if (data.audit) {
          setAuditLog(prev => [...prev, data.audit]);
        }
      } catch { }
    };
    ws.onerror = () => setError('WebSocket error');
    ws.onclose = () => setError('WebSocket closed');
    return () => ws.close();
  }, []);

  // Privacy/Compliance: Data export
  const exportData = async () => {
    setLoading(true);
    fetch('/api/v1/user/data-export', { method: 'POST' })
      .then(res => res.json())
      .then(() => showToast('Data export started', 'info'))
      .catch(() => setError('Failed to export data'))
      .finally(() => setLoading(false));
  };

  // Privacy/Compliance: Delete user
  const deleteUser = async () => {
    setLoading(true);
    fetch('/api/v1/user', { method: 'DELETE' })
      .then(res => res.json())
      .then(() => showToast('User deleted', 'warning'))
      .catch(() => setError('Failed to delete user'))
      .finally(() => {
        setDialogOpen(false);
        setLoading(false);
      });
  };

  return (
    <Box p={8} maxW="1200px" mx="auto" bg="white" borderRadius="2xl" boxShadow="2xl">
      <Flex justify="space-between" align="center" mb={6}>
        <Heading fontSize="2xl" fontWeight="extrabold" color="blue.700">Real-Time Dashboard</Heading>
        <Menu.Root>
          <Menu.Trigger asChild>
            <IconButton variant="ghost" aria-label="Settings">
              <SettingsIcon />
            </IconButton>
          </Menu.Trigger>
          <Menu.Content>
            {userPermissions.includes('privacy:export') && (
              <Menu.Item value="export" onClick={exportData}>Export Data (GDPR)</Menu.Item>
            )}
            {userPermissions.includes('privacy:delete') && (
              <Menu.Item value="delete" onClick={() => setDialogOpen(true)}>Delete User (GDPR)</Menu.Item>
            )}
          </Menu.Content>
        </Menu.Root>
      </Flex>
      {/* RBAC UI */}
      <Flex mb={4} gap={2} align="center">
        <Badge colorScheme="purple" borderRadius="xl">Role: {userRole}</Badge>
        {userPermissions.map(p => (
          <Badge key={p} colorScheme="blue" borderRadius="xl">{p}</Badge>
        ))}
      </Flex>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      <Tabs.Root variant="enclosed" colorScheme="blue" defaultValue="ticker">
        <Tabs.List>
          <Tabs.Trigger value="ticker">Market Ticker</Tabs.Trigger>
          <Tabs.Trigger value="plugin" disabled={!userPermissions.includes('plugin:execute')}>Plugin Widgets</Tabs.Trigger>
          <Tabs.Trigger value="audit">Audit & Metrics</Tabs.Trigger>
          <Tabs.Trigger value="collab">Collaborators</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="ticker">
          <Table.Root bg="gray.50" borderRadius="xl" boxShadow="md">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Symbol</Table.ColumnHeader>
                <Table.ColumnHeader>Price</Table.ColumnHeader>
                <Table.ColumnHeader>Timestamp</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {marketData.map((d, i) => (
                <Table.Row key={i}>
                  <Table.Cell fontWeight="bold">{d.symbol}</Table.Cell>
                  <Table.Cell>{d.price}</Table.Cell>
                  <Table.Cell>{d.timestamp}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Tabs.Content>
        <Tabs.Content value="plugin">
          {userPermissions.includes('plugin:execute') ? (
            <Box>
              <Heading size="sm" mb={2}>Plugin Analytics (Real-Time)</Heading>
              {pluginResults.length === 0 ? <Spinner /> : pluginResults.map((r, i) => (
                <Box key={i} p={4} bg="gray.50" borderRadius="xl" boxShadow="sm" mt={2}>
                  <pre>{JSON.stringify(r, null, 2)}</pre>
                </Box>
              ))}
            </Box>
          ) : <Alert type="warning" message="No permission to execute plugins." />}
        </Tabs.Content>
        <Tabs.Content value="audit">
          <StatGroup mb={4}>
            <Stat.Root>
              <Stat.Label>WS Connections</Stat.Label>
              <Stat.ValueText>{metrics.ws_connections || 0}</Stat.ValueText>
              <Stat.HelpText>Active</Stat.HelpText>
            </Stat.Root>
            <Stat.Root>
              <Stat.Label>WS Messages</Stat.Label>
              <Stat.ValueText>{metrics.ws_messages_total || 0}</Stat.ValueText>
              <Stat.HelpText>Total</Stat.HelpText>
            </Stat.Root>
            <Stat.Root>
              <Stat.Label>Auth Failures</Stat.Label>
              <Stat.ValueText>{metrics.ws_auth_failures || 0}</Stat.ValueText>
              <Stat.HelpText>Total</Stat.HelpText>
            </Stat.Root>
          </StatGroup>
          <Box p={4} bg="gray.100" borderRadius="xl" boxShadow="sm">
            <Heading size="sm" mb={2}>Audit Log</Heading>
            {auditLog.length === 0 ? (
              <Spinner />
            ) : (
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>User</Table.ColumnHeader>
                    <Table.ColumnHeader>Action</Table.ColumnHeader>
                    <Table.ColumnHeader>Timestamp</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {auditLog.map((log, i) => (
                    <Table.Row key={i}>
                      <Table.Cell>{log.user}</Table.Cell>
                      <Table.Cell>{log.action}</Table.Cell>
                      <Table.Cell>{log.timestamp}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            )}
          </Box>
        </Tabs.Content>
        <Tabs.Content value="collab">
          <Flex gap={2} align="center">
            <Tag.Root colorScheme="blue">You</Tag.Root>
            <Avatar.Root><Avatar.Fallback>You</Avatar.Fallback></Avatar.Root>
            {others.map((o, i) => (
              <React.Fragment key={i}>
                <Tag.Root colorScheme="green">Collaborator</Tag.Root>
                <Avatar.Root><Avatar.Fallback>{`User ${i + 1}`}</Avatar.Fallback></Avatar.Root>
              </React.Fragment>
            ))}
          </Flex>
        </Tabs.Content>
      </Tabs.Root>
      <Dialog.Root open={isDialogOpen} onOpenChange={details => setDialogOpen(details.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Title>Confirm Delete</Dialog.Title>
            <Dialog.Description>Are you sure you want to delete your user and all data? This action cannot be undone.</Dialog.Description>
            <Dialog.Footer>
              <Button colorScheme="red" mr={3} onClick={deleteUser}>Delete</Button>
              <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}; 