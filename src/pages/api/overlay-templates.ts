import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// Initialize Prisma client
const prisma = new PrismaClient();

// Define user type with subscription level
interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  subscriptionLevel?: 'free' | 'premium' | 'enterprise';
}

// Validation schemas
const SeriesSchema = z.object({
  source: z.string(),
  symbol: z.string().optional(),
  timeframe: z.string().optional(),
  metric: z.string().optional(),
  asset: z.string().optional(),
  frequency: z.string().optional(),
  seriesId: z.string().optional(),
  interval: z.string().optional(),
});

const CreateTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  series: z.array(SeriesSchema).min(1, 'At least one series is required'),
  from: z.string().optional(),
  to: z.string().optional(),
  annotations: z.any().optional(),
  isPublic: z.boolean().optional().default(false),
  isDefault: z.boolean().optional().default(false),
  chartType: z.string().optional(),
  zoom: z.any().optional(),
  yAxes: z.any().optional(),
});

const UpdateTemplateSchema = CreateTemplateSchema.extend({
  id: z.string().min(1, 'Template ID is required'),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get user from Clerk
  const { userId } = getAuth(req);

  // Most endpoints require authentication
  if (!userId && req.method !== 'GET') {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Create user object from Clerk userId
  const user: User | undefined = userId ? { id: userId } : undefined;

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return handleGetTemplates(req, res, user);
    case 'POST':
      return handleCreateTemplate(req, res, user!);
    case 'PUT':
      return handleUpdateTemplate(req, res, user!);
    case 'DELETE':
      return handleDeleteTemplate(req, res, user!);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

/**
 * Get templates - either a specific one by ID, a shared one by token, 
 * or all templates for the current user
 */
async function handleGetTemplates(
  req: NextApiRequest,
  res: NextApiResponse,
  user?: User
) {
  const { id, token } = req.query;

  // Case 1: Get a specific template by ID
  if (id) {
    const template = await prisma.overlayTemplate.findUnique({
      where: { id: id as string },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Check authorization - must be public or owned by user
    if (!template.isPublic && (!user || template.userId !== user.id)) {
      return res.status(403).json({ error: 'Not authorized to view this template' });
    }

    // Increment view count
    await prisma.overlayTemplate.update({
      where: { id: template.id },
      data: { viewCount: { increment: 1 } },
    });

    return res.status(200).json(template);
  }

  // Case 2: Get a shared template by token
  if (token) {
    try {
      // Verify JWT token
      const JWT_SECRET = process.env.JWT_SECRET;
      if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured');
      }

      const decoded = jwt.verify(token as string, JWT_SECRET) as { templateId: string };

      const template = await prisma.overlayTemplate.findUnique({
        where: { id: decoded.templateId },
      });

      if (!template) {
        return res.status(404).json({ error: 'Shared template not found' });
      }

      // Increment view count
      await prisma.overlayTemplate.update({
        where: { id: template.id },
        data: { viewCount: { increment: 1 } },
      });

      return res.status(200).json(template);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid or expired sharing token' });
    }
  }

  // Case 3: Get all templates for current user
  if (user) {
    const templates = await prisma.overlayTemplate.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    });
    return res.status(200).json(templates);
  }

  // Case 4: Get public templates if no specific query and no user
  const publicTemplates = await prisma.overlayTemplate.findMany({
    where: { isPublic: true },
    orderBy: [{ viewCount: 'desc' }, { updatedAt: 'desc' }],
    take: 20, // Limit to 20 most popular
  });

  return res.status(200).json(publicTemplates);
}

/**
 * Create a new template
 */
async function handleCreateTemplate(
  req: NextApiRequest,
  res: NextApiResponse,
  user: User
) {
  try {
    const parseResult = CreateTemplateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid template data',
        details: parseResult.error.format()
      });
    }

    const templateData = parseResult.data;

    // If setting as default, unset any existing defaults
    if (templateData.isDefault) {
      await prisma.overlayTemplate.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Create the template
    const template = await prisma.overlayTemplate.create({
      data: {
        userId: user.id,
        name: templateData.name,
        description: templateData.description,
        series: templateData.series,
        from: templateData.from ? new Date(templateData.from) : null,
        to: templateData.to ? new Date(templateData.to) : null,
        annotations: templateData.annotations || null,
        isPublic: templateData.isPublic,
        isDefault: templateData.isDefault,
        chartType: templateData.chartType,
        zoom: templateData.zoom,
        yAxes: templateData.yAxes,
      },
    });

    return res.status(201).json(template);
  } catch (error: any) {
    console.error('Error creating template:', error);
    return res.status(500).json({ error: 'Failed to create template', message: error.message });
  }
}

/**
 * Update an existing template
 */
async function handleUpdateTemplate(
  req: NextApiRequest,
  res: NextApiResponse,
  user: User
) {
  try {
    const parseResult = UpdateTemplateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid template data',
        details: parseResult.error.format()
      });
    }

    const templateData = parseResult.data;

    // Check if template exists and user owns it
    const existingTemplate = await prisma.overlayTemplate.findUnique({
      where: { id: templateData.id },
    });

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (existingTemplate.userId !== user.id) {
      return res.status(403).json({ error: 'Not authorized to update this template' });
    }

    // If setting as default, unset any existing defaults
    if (templateData.isDefault && !existingTemplate.isDefault) {
      await prisma.overlayTemplate.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Update the template
    const updatedTemplate = await prisma.overlayTemplate.update({
      where: { id: templateData.id },
      data: {
        name: templateData.name,
        description: templateData.description,
        series: templateData.series,
        from: templateData.from ? new Date(templateData.from) : null,
        to: templateData.to ? new Date(templateData.to) : null,
        annotations: templateData.annotations || null,
        isPublic: templateData.isPublic,
        isDefault: templateData.isDefault,
        chartType: templateData.chartType,
        zoom: templateData.zoom,
        yAxes: templateData.yAxes,
      },
    });

    return res.status(200).json(updatedTemplate);
  } catch (error: any) {
    console.error('Error updating template:', error);
    return res.status(500).json({ error: 'Failed to update template', message: error.message });
  }
}

/**
 * Delete a template
 */
async function handleDeleteTemplate(
  req: NextApiRequest,
  res: NextApiResponse,
  user: User
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Template ID is required' });
  }

  try {
    // Check if template exists and user owns it
    const template = await prisma.overlayTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (template.userId !== user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this template' });
    }

    // Delete the template
    await prisma.overlayTemplate.delete({
      where: { id },
    });

    return res.status(200).json({ message: 'Template deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    return res.status(500).json({ error: 'Failed to delete template', message: error.message });
  }
}

/**
 * Generate a sharing token for a template
 */
export async function generateSharingToken(templateId: string, expiresIn = '7d'): Promise<string> {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    { templateId },
    JWT_SECRET,
    { expiresIn }
  );
} 