import React, { useState } from 'react';
import { Box, Tabs, TabList, TabPanels, Tab, TabPanel, useColorModeValue } from '@chakra-ui/react';
import { AlertStudio } from '@/components/alerts/AlertStudio';
import { AlertRulesList } from '@/components/alerts/AlertRulesList';
import { AlertHistory } from '@/components/alerts/AlertHistory';
import { AlertSettings } from '@/components/alerts/AlertSettings';
import { PatternVisualization } from '@/components/alerts/PatternVisualization';
import { SequentialPatternStudio } from '@/components/alerts/SequentialPatternStudio';
import { PatternAnalytics } from '@/components/alerts/PatternAnalytics';

const AlertsPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const bgColor = useColorModeValue('white', 'gray.800');

  return (
    <Box bg={bgColor} minH="100vh" p={6}>
      <Tabs index={activeTab} onChange={setActiveTab} variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>Studio</Tab>
          <Tab>Sequential Patterns</Tab>
          <Tab>Pattern Monitor</Tab>
          <Tab>Pattern Analytics</Tab>
          <Tab>Rules</Tab>
          <Tab>History</Tab>
          <Tab>Settings</Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0} py={6}>
            <AlertStudio />
          </TabPanel>

          <TabPanel px={0} py={6}>
            <SequentialPatternStudio />
          </TabPanel>

          <TabPanel px={0} py={6}>
            <PatternVisualization />
          </TabPanel>

          <TabPanel px={0} py={6}>
            <PatternAnalytics />
          </TabPanel>

          <TabPanel px={0} py={6}>
            <AlertRulesList />
          </TabPanel>

          <TabPanel px={0} py={6}>
            <AlertHistory />
          </TabPanel>

          <TabPanel px={0} py={6}>
            <AlertSettings />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default AlertsPage; 