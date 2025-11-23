/**
 * Chart State API
 * 
 * This API endpoint handles saving and retrieving chart configurations,
 * including indicators, chart type, timeframe, and other preferences.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';
import { ChartConfig } from '@/lib/indicators/types';
import { z } from 'zod';

// Initialize Prisma client
const prisma = new PrismaClient();

// Chart configuration schema validation
const ChartConfigSchema = z.object({
  id: z.string().optional(),
  symbol: z.string().min(1),
  timeframe: z.string().min(1),
  chartType: z.enum(['candlestick', 'line', 'area', 'bar', 'heikinashi']),
  indicators: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      isActive: z.boolean(),
      options: z.record(z.any()),
      visuals: z.record(z.object({
        color: z.string().optional(),
        lineWidth: z.number().optional(),
        lineStyle: z.enum(['solid', 'dashed', 'dotted']).optional(),
        opacity: z.number().optional(),
        area: z.boolean().optional(),
        type: z.enum(['line', 'column', 'area', 'scatter']).optional()
      }).optional()),
      position: z.enum(['main', 'below', 'separate'])
    })
  ),
  showVolume: z.boolean().optional(),
  showGrid: z.boolean().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  zoom: z.object({
    from: z.union([z.string(), z.number()]),
    to: z.union([z.string(), z.number()]).optional()
  }).optional(),
  scales: z.object({
    y: z.object({
      type: z.enum(['linear', 'log']),
      min: z.number().optional(),
      max: z.number().optional()
    })
  }).optional(),
  name: z.string().optional(),
  isDefault: z.boolean().optional()
});

/**
 * Chart State API Handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get the authenticated user
  const session = await getServerSession(req, res, authOptions);

  // If user is not authenticated, return 401
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (session.user as any).id;

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getChartConfig(req, res, userId);
    case 'POST':
      return saveChartConfig(req, res, userId);
    case 'PUT':
      return updateChartConfig(req, res, userId);
    case 'DELETE':
      return deleteChartConfig(req, res, userId);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

/**
 * Get a chart configuration or list of configurations
 */
async function getChartConfig(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { id, defaultOnly } = req.query;

    // If ID is provided, get a specific chart config
    if (id) {
      const chartConfig = await prisma.chartConfig.findFirst({
        where: {
          id: id as string,
          userId
        }
      });

      if (!chartConfig) {
        return res.status(404).json({ error: 'Chart configuration not found' });
      }

      return res.status(200).json(chartConfig);
    }

    // If defaultOnly is true, return only the default configuration
    if (defaultOnly === 'true') {
      const defaultConfig = await prisma.chartConfig.findFirst({
        where: {
          userId,
          isDefault: true
        }
      });

      if (!defaultConfig) {
        // If no default config exists, return the most recently updated one
        const mostRecent = await prisma.chartConfig.findFirst({
          where: { userId },
          orderBy: { updatedAt: 'desc' }
        });

        if (!mostRecent) {
          return res.status(204).end(); // No content
        }

        return res.status(200).json(mostRecent);
      }

      return res.status(200).json(defaultConfig);
    }

    // Otherwise, return all user's chart configurations
    const chartConfigs = await prisma.chartConfig.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });

    return res.status(200).json(chartConfigs);
  } catch (error) {
    console.error('Error getting chart configuration:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Save a new chart configuration
 */
async function saveChartConfig(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    // Validate the request body
    const validationResult = ChartConfigSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid chart configuration',
        details: validationResult.error.format()
      });
    }

    const chartConfig = validationResult.data;

    // Check if this is marked as default
    if (chartConfig.isDefault) {
      // Unset default flag on all other configurations
      await prisma.chartConfig.updateMany({
        where: {
          userId,
          isDefault: true
        },
        data: { isDefault: false }
      });
    }

    // Create the new chart configuration
    const createdConfig = await prisma.chartConfig.create({
      data: {
        userId,
        symbol: chartConfig.symbol,
        timeframe: chartConfig.timeframe,
        chartType: chartConfig.chartType,
        indicators: chartConfig.indicators,
        theme: chartConfig.theme,
        showVolume: chartConfig.showVolume,
        showGrid: chartConfig.showGrid,
        zoom: chartConfig.zoom,
        scales: chartConfig.scales,
        name: chartConfig.name || `${chartConfig.symbol} ${chartConfig.timeframe}`,
        isDefault: chartConfig.isDefault || false
      }
    });

    return res.status(201).json(createdConfig);
  } catch (error) {
    console.error('Error saving chart configuration:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Update an existing chart configuration
 */
async function updateChartConfig(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Chart configuration ID is required' });
    }

    // Validate the request body
    const validationResult = ChartConfigSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid chart configuration',
        details: validationResult.error.format()
      });
    }

    const chartConfig = validationResult.data;

    // Check if the configuration exists and belongs to the user
    const existingConfig = await prisma.chartConfig.findFirst({
      where: {
        id: id as string,
        userId
      }
    });

    if (!existingConfig) {
      return res.status(404).json({ error: 'Chart configuration not found' });
    }

    // Check if this is marked as default
    if (chartConfig.isDefault) {
      // Unset default flag on all other configurations
      await prisma.chartConfig.updateMany({
        where: {
          userId,
          isDefault: true,
          id: { not: id as string }
        },
        data: { isDefault: false }
      });
    }

    // Update the chart configuration
    const updatedConfig = await prisma.chartConfig.update({
      where: { id: id as string },
      data: {
        symbol: chartConfig.symbol,
        timeframe: chartConfig.timeframe,
        chartType: chartConfig.chartType,
        indicators: chartConfig.indicators,
        theme: chartConfig.theme,
        showVolume: chartConfig.showVolume,
        showGrid: chartConfig.showGrid,
        zoom: chartConfig.zoom,
        scales: chartConfig.scales,
        name: chartConfig.name,
        isDefault: chartConfig.isDefault
      }
    });

    return res.status(200).json(updatedConfig);
  } catch (error) {
    console.error('Error updating chart configuration:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Delete a chart configuration
 */
async function deleteChartConfig(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Chart configuration ID is required' });
    }

    // Check if the configuration exists and belongs to the user
    const existingConfig = await prisma.chartConfig.findFirst({
      where: {
        id: id as string,
        userId
      }
    });

    if (!existingConfig) {
      return res.status(404).json({ error: 'Chart configuration not found' });
    }

    // Delete the chart configuration
    await prisma.chartConfig.delete({
      where: { id: id as string }
    });

    return res.status(204).end();
  } catch (error) {
    console.error('Error deleting chart configuration:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
} 