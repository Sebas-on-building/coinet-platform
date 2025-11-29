import React from 'react';
import { Box, Flex, VStack } from '@chakra-ui/react';
import { VideoTimeline } from './VideoTimeline';
import { VideoAIAnalytics } from './VideoAIAnalytics';
import { CollabSidebar } from './CollabSidebar';
import { VideoExportPanel } from './VideoExportPanel';
import { PluginWidgetLoader } from '../dashboard/plugins/PluginWidgetLoader';

export const VideoEditorSuite = () => (
  <Flex minH="100vh" bgGradient="linear(to-br, blue.50, purple.50)">
    <CollabSidebar />
    <Box flex={1} display="flex" flexDirection="column" p={6}>
      <Box flex={1} borderRadius="2xl" boxShadow="2xl" bg="white" mb={4}>
        {/* Real-time video preview area */}
        <Box h={320} borderRadius="2xl" bg="gray.100" mb={4} />
        <Flex gap={4}>
          <VideoAIAnalytics />
          <PluginWidgetLoader widgetId="video-plugin" widgetRegistry={{}} />
        </Flex>
      </Box>
      <VideoTimeline />
      <VideoExportPanel />
    </Box>
  </Flex>
); 