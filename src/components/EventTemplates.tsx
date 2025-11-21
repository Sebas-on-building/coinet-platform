import React, { useState, useMemo } from "react";
import { CalendarEvent } from "../services/calendarService";
import { toast } from "react-hot-toast";
import {
  Search,
  Filter,
  Tag,
  Clock,
  Calendar,
  Share2,
  Download,
  Upload,
  Copy,
} from "lucide-react";

interface EventTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  duration: number; // in minutes
  color: string;
  tags: string[];
  category: string;
  reminderTypes: string[];
  frequency?: "once" | "daily" | "weekly" | "monthly";
  location?: string;
  attendees?: string[];
}

interface EventTemplatesProps {
  onUseTemplate: (template: EventTemplate) => void;
}

const CATEGORIES = [
  "Meeting",
  "Appointment",
  "Task",
  "Reminder",
  "Social",
  "Other",
];

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

export const EventTemplates: React.FC<EventTemplatesProps> = ({
  onUseTemplate,
}) => {
  const [templates, setTemplates] = useState<EventTemplate[]>([
    {
      id: "1",
      name: "Team Meeting",
      title: "Team Sync",
      description: "Regular team sync meeting",
      duration: 60,
      color: "#3B82F6",
      tags: ["team", "meeting"],
      category: "Meeting",
      reminderTypes: ["email", "browser"],
      frequency: "weekly",
      location: "Conference Room A",
      attendees: ["team@example.com"],
    },
    {
      id: "2",
      name: "Client Call",
      title: "Client Meeting",
      description: "Client discussion and updates",
      duration: 30,
      color: "#10B981",
      tags: ["client", "meeting"],
      category: "Appointment",
      reminderTypes: ["email", "browser", "sms"],
      location: "Zoom",
      attendees: ["client@example.com"],
    },
    {
      id: "3",
      name: "Lunch Break",
      title: "Lunch",
      description: "Lunch break",
      duration: 60,
      color: "#F59E0B",
      tags: ["break"],
      category: "Reminder",
      reminderTypes: ["browser"],
      frequency: "daily",
    },
  ]);

  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTemplate, setNewTemplate] = useState<Partial<EventTemplate>>({
    name: "",
    title: "",
    description: "",
    duration: 60,
    color: "#3B82F6",
    tags: [],
    category: "Other",
    reminderTypes: ["browser"],
    frequency: "once",
  });

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        !selectedCategory || template.category === selectedCategory;

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((tag) => template.tags.includes(tag));

      return matchesSearch && matchesCategory && matchesTags;
    });
  }, [templates, searchQuery, selectedCategory, selectedTags]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    templates.forEach((template) => {
      template.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags);
  }, [templates]);

  const handleCreateTemplate = () => {
    if (!newTemplate.name || !newTemplate.title) {
      toast.error("Please fill in all required fields");
      return;
    }

    const template: EventTemplate = {
      id: Date.now().toString(),
      name: newTemplate.name,
      title: newTemplate.title,
      description: newTemplate.description || "",
      duration: newTemplate.duration || 60,
      color: newTemplate.color || "#3B82F6",
      tags: newTemplate.tags || [],
      category: newTemplate.category || "Other",
      reminderTypes: newTemplate.reminderTypes || ["browser"],
      frequency: newTemplate.frequency || "once",
      location: newTemplate.location,
      attendees: newTemplate.attendees,
    };

    setTemplates([...templates, template]);
    setIsCreating(false);
    setNewTemplate({
      name: "",
      title: "",
      description: "",
      duration: 60,
      color: "#3B82F6",
      tags: [],
      category: "Other",
      reminderTypes: ["browser"],
      frequency: "once",
    });
    toast.success("Template created successfully");
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(templates.filter((t) => t.id !== id));
    toast.success("Template deleted successfully");
  };

  const handleShareTemplate = async (template: EventTemplate) => {
    try {
      const shareData = {
        title: template.name,
        text: `Check out this event template: ${template.title}`,
        url: `${window.location.origin}/templates/${template.id}`,
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(shareData.url);
        toast.success("Template link copied to clipboard");
      }
    } catch (error) {
      toast.error("Failed to share template");
    }
  };

  const handleExportTemplates = () => {
    try {
      const exportData = JSON.stringify(templates, null, 2);
      const blob = new Blob([exportData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "event-templates.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Templates exported successfully");
    } catch (error) {
      toast.error("Failed to export templates");
    }
  };

  const handleImportTemplates = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedTemplates = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedTemplates)) {
          setTemplates([...templates, ...importedTemplates]);
          toast.success("Templates imported successfully");
        } else {
          throw new Error("Invalid template format");
        }
      } catch (error) {
        toast.error("Failed to import templates");
      }
    };
    reader.readAsText(file);
  };

  const handleDuplicateTemplate = (template: EventTemplate) => {
    const newTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
    };
    setTemplates([...templates, newTemplate]);
    toast.success("Template duplicated successfully");
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Event Templates</h3>
        <div className="flex space-x-2">
          <button
            onClick={handleExportTemplates}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <label className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImportTemplates}
              className="hidden"
            />
          </label>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Create Template
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div className="relative">
            <select
              value={selectedCategory || ""}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setSelectedTags((prev) =>
                  prev.includes(tag)
                    ? prev.filter((t) => t !== tag)
                    : [...prev, tag],
                );
              }}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedTags.includes(tag)
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {isCreating && (
        <div className="mb-6 p-4 border rounded-lg">
          <h4 className="font-medium mb-4">Create New Template</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Template Name
              </label>
              <input
                type="text"
                value={newTemplate.name}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, name: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Event Title
              </label>
              <input
                type="text"
                value={newTemplate.title}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, title: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={newTemplate.description}
                onChange={(e) =>
                  setNewTemplate({
                    ...newTemplate,
                    description: e.target.value,
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                value={newTemplate.category}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, category: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Duration
              </label>
              <select
                value={newTemplate.duration}
                onChange={(e) =>
                  setNewTemplate({
                    ...newTemplate,
                    duration: parseInt(e.target.value),
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                {DURATION_PRESETS.map((duration) => (
                  <option key={duration} value={duration}>
                    {duration} minutes
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Frequency
              </label>
              <select
                value={newTemplate.frequency}
                onChange={(e) =>
                  setNewTemplate({
                    ...newTemplate,
                    frequency: e.target.value as any,
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="once">Once</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Color
              </label>
              <input
                type="color"
                value={newTemplate.color}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, color: e.target.value })
                }
                className="mt-1 block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Tags
              </label>
              <input
                type="text"
                placeholder="Add tags (comma-separated)"
                onChange={(e) =>
                  setNewTemplate({
                    ...newTemplate,
                    tags: e.target.value.split(",").map((tag) => tag.trim()),
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Location
              </label>
              <input
                type="text"
                value={newTemplate.location}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, location: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Optional location"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Attendees
              </label>
              <input
                type="text"
                value={newTemplate.attendees?.join(", ")}
                onChange={(e) =>
                  setNewTemplate({
                    ...newTemplate,
                    attendees: e.target.value
                      .split(",")
                      .map((email) => email.trim()),
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Add attendees (comma-separated emails)"
              />
            </div>
            <div className="md:col-span-2 flex justify-end space-x-2">
              <button
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTemplate}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="p-4 border rounded-lg hover:shadow-md transition-shadow"
            style={{ borderLeft: `4px solid ${template.color}` }}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-medium">{template.name}</h4>
                <span className="text-xs text-gray-500">
                  {template.category}
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleDuplicateTemplate(template)}
                  className="text-gray-400 hover:text-indigo-500"
                  title="Duplicate template"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleShareTemplate(template)}
                  className="text-gray-400 hover:text-indigo-500"
                  title="Share template"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="text-gray-400 hover:text-red-500"
                  title="Delete template"
                >
                  ×
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">{template.title}</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {template.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs bg-gray-100 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="w-4 h-4 mr-1" />
                {template.duration} min
              </div>
              {template.frequency && template.frequency !== "once" && (
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  {template.frequency.charAt(0).toUpperCase() +
                    template.frequency.slice(1)}
                </div>
              )}
              {template.location && (
                <div className="text-sm text-gray-500 truncate">
                  📍 {template.location}
                </div>
              )}
            </div>
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                {template.reminderTypes.map((type) => (
                  <span
                    key={type}
                    className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-full"
                  >
                    {type}
                  </span>
                ))}
              </div>
              <button
                onClick={() => onUseTemplate(template)}
                className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200"
              >
                Use Template
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
