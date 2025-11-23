import React, { useEffect, useState } from 'react';
import {
  Box, Flex, Heading, Button, Input, Spinner, IconButton, Badge
} from '@chakra-ui/react';
import { useMyPresence, useOthers, useRoom, useBroadcastEvent } from '@liveblocks/react';
import { Alert } from '../atoms/Alert';
import { SettingsIcon } from '@chakra-ui/icons';
import { Table } from '@chakra-ui/react';
import * as TabsNS from '@chakra-ui/react';
import { Menu } from '@chakra-ui/react';
import { Dialog } from '@chakra-ui/react';
import { Tag } from '@chakra-ui/react';
import { Avatar } from '@chakra-ui/react';
import { useToast } from '../../../src/hooks/useToast';

interface Portfolio {
  id: string;
  name: string;
  holdings: Holding[];
}
interface Holding {
  id: string;
  symbol: string;
  quantity: number;
  cost: number;
}

// Mocked user roles/permissions for RBAC UI
const userRole = 'admin';
const userPermissions = ['portfolio:read', 'portfolio:create', 'portfolio:update', 'portfolio:delete', 'analytics:read', 'plugin:execute', 'privacy:export', 'privacy:delete'];

export const PortfolioManager: React.FC = () => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selected, setSelected] = useState<Portfolio | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyticsResult, setAnalyticsResult] = useState<any>(null);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [pluginResult, setPluginResult] = useState<any>(null);
  const [presence, updatePresence] = useMyPresence();
  const others = useOthers();
  const room = useRoom();
  const broadcast = useBroadcastEvent();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const { showToast } = useToast();

  // Fetch portfolios
  useEffect(() => {
    setLoading(true);
    fetch('/api/v1/portfolios')
      .then(res => res.json())
      .then(data => setPortfolios(data.data))
      .catch(() => setError('Failed to load portfolios'))
      .finally(() => setLoading(false));
  }, []);

  // Real-time updates
  useEffect(() => {
    if (!room) return;
    room.subscribe('event', (event: any) => {
      if (['portfolio_created', 'portfolio_updated', 'portfolio_deleted'].includes(event.event)) {
        fetch('/api/v1/portfolios')
          .then(res => res.json())
          .then(data => setPortfolios(data.data));
      }
    });
  }, [room]);

  // Real-time audit log
  useEffect(() => {
    fetch('/api/v1/audit')
      .then(res => res.json())
      .then(data => setAuditLog(data.data));
    // Optionally poll or use WebSocket for real-time
  }, []);

  // Create portfolio
  const createPortfolio = async () => {
    setLoading(true);
    fetch('/api/v1/portfolios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
      .then(res => res.json())
      .then(data => {
        setPortfolios([...portfolios, data.data]);
        setName('');
        broadcast({ event: 'portfolio_created', data: data.data });
      })
      .catch(() => setError('Failed to create portfolio'))
      .finally(() => setLoading(false));
  };

  // AI/ML Analytics: Anomaly Detection
  const runAnomalyDetection = async () => {
    if (!selected) return;
    setLoading(true);
    fetch('/api/v1/ai/anomaly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: selected.holdings.map(h => h.quantity) }),
    })
      .then(res => res.json())
      .then(data => setAnalyticsResult(data.result))
      .catch(() => setError('Failed to run anomaly detection'))
      .finally(() => setLoading(false));
  };

  // AI/ML Analytics: Forecast
  const runForecast = async () => {
    if (!selected) return;
    setLoading(true);
    fetch('/api/v1/ai/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: selected.holdings.map(h => h.quantity), steps: 5 }),
    })
      .then(res => res.json())
      .then(data => setAnalyticsResult(data.result))
      .catch(() => setError('Failed to run forecast'))
      .finally(() => setLoading(false));
  };

  // Plugin analytics (mocked)
  const runPlugin = async () => {
    setLoading(true);
    fetch('/api/v1/plugin/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pluginName: 'demoAnalytics', input: { data: portfolios } }),
    })
      .then(res => res.json())
      .then(data => setPluginResult(data.output))
      .catch(() => setError('Failed to run plugin'))
      .finally(() => setLoading(false));
  };

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
      .then(() => {
        // toast({ title: 'User deleted', status: 'warning' });
        setDialogOpen(false);
      })
      .catch(() => setError('Failed to delete user'))
      .finally(() => setLoading(false));
  };

  return (
    <Box p={8} maxW="1100px" mx="auto" bg="white" borderRadius="2xl" boxShadow="2xl">
      <Flex justify="space-between" align="center" mb={6}>
        <Heading fontSize="2xl" fontWeight="extrabold" color="blue.700">Portfolio Manager</Heading>
        <Menu.Root>
          <Menu.Trigger>
            <IconButton variant="ghost" aria-label="Settings">
              <SettingsIcon />
            </IconButton>
          </Menu.Trigger>
          <Menu.Content>
            <Menu.Item value="export" onClick={exportData}>Export Data (GDPR)</Menu.Item>
            <Menu.Item value="delete" onClick={() => setDialogOpen(true)}>Delete User (GDPR)</Menu.Item>
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
      <TabsNS.Tabs.Root variant="enclosed" colorScheme="blue">
        <TabsNS.Tabs.List>
          <TabsNS.Tabs.Trigger value="item-1">Portfolios</TabsNS.Tabs.Trigger>
          <TabsNS.Tabs.Trigger value="item-2">Analytics</TabsNS.Tabs.Trigger>
          <TabsNS.Tabs.Trigger value="item-3">Plugins</TabsNS.Tabs.Trigger>
          <TabsNS.Tabs.Trigger value="item-4">Audit Log</TabsNS.Tabs.Trigger>
        </TabsNS.Tabs.List>
        <TabsNS.Tabs.Content value="item-1">
          <Flex mb={4} align="center" gap={4}>
            <Input placeholder="Portfolio name" value={name} onChange={e => setName(e.target.value)} maxW="300px" />
            <Button colorScheme="blue" onClick={createPortfolio} loading={loading} borderRadius="xl">Create</Button>
          </Flex>
          <Table.Root variant="line" size="md" bg="gray.50" borderRadius="xl" boxShadow="md">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Name</Table.ColumnHeader>
                <Table.ColumnHeader>Holdings</Table.ColumnHeader>
                <Table.ColumnHeader>Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {portfolios.map(p => (
                <Table.Row key={p.id} bg={selected?.id === p.id ? 'blue.50' : undefined}>
                  <Table.Cell fontWeight="bold">{p.name}</Table.Cell>
                  <Table.Cell>{p.holdings.length}</Table.Cell>
                  <Table.Cell>
                    <Button size="sm" colorScheme="blue" borderRadius="xl" onClick={() => setSelected(p)}>View</Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
          {/* Collaborative presence/awareness */}
          <Flex mt={6} gap={2} align="center">
            <Tag.Root colorScheme="blue">You</Tag.Root>
            <Avatar.Root><Avatar.Fallback>You</Avatar.Fallback></Avatar.Root>
            {others.map((o, i) => (
              <React.Fragment key={i}>
                <Tag.Root colorScheme="green">Collaborator</Tag.Root>
                <Avatar.Root><Avatar.Fallback>{`User ${i + 1}`}</Avatar.Fallback></Avatar.Root>
              </React.Fragment>
            ))}
          </Flex>
        </TabsNS.Tabs.Content>
        <TabsNS.Tabs.Content value="item-2">
          <Flex gap={4} mb={4}>
            <Button colorScheme="teal" onClick={runAnomalyDetection} borderRadius="xl">Run Anomaly Detection (AI/ML)</Button>
            <Button colorScheme="orange" onClick={runForecast} borderRadius="xl">Run Forecast (AI/ML)</Button>
          </Flex>
          {analyticsResult && (
            <Box p={4} bg="gray.50" borderRadius="xl" boxShadow="sm" mt={2}>
              <Heading size="sm" mb={2}>Analytics Result</Heading>
              <pre>{JSON.stringify(analyticsResult, null, 2)}</pre>
            </Box>
          )}
        </TabsNS.Tabs.Content>
        <TabsNS.Tabs.Content value="item-3">
          <Button colorScheme="purple" onClick={runPlugin} borderRadius="xl">Run Plugin Analytics</Button>
          {pluginResult && (
            <Box p={4} bg="gray.50" borderRadius="xl" boxShadow="sm" mt={2}>
              <Heading size="sm" mb={2}>Plugin Output</Heading>
              <pre>{JSON.stringify(pluginResult, null, 2)}</pre>
            </Box>
          )}
        </TabsNS.Tabs.Content>
        <TabsNS.Tabs.Content value="item-4">
          <Box p={4} bg="gray.100" borderRadius="xl" boxShadow="sm">
            <Heading size="sm" mb={2}>Audit Log</Heading>
            {auditLog.length === 0 ? (
              <Spinner />
            ) : (
              <Table.Root size="sm" variant="line">
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
        </TabsNS.Tabs.Content>
      </TabsNS.Tabs.Root>
      {/* Privacy/Compliance Dialog (for delete confirmation) */}
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