import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { OnChainNewsService } from "@/services/onChainNewsService";
import { toast } from "react-hot-toast";
import { Shield, Edit, Trash2, Plus, Check, X } from "lucide-react";

interface ProjectNewsManagerProps {
  projectAddress: string;
  privateKey: string;
}

export const ProjectNewsManager: React.FC<ProjectNewsManagerProps> = ({
  projectAddress,
  privateKey,
}) => {
  const [news, setNews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
  });
  const [editingNews, setEditingNews] = useState<{
    id: string;
    title: string;
    content: string;
  } | null>(null);

  useEffect(() => {
    loadProjectNews();
  }, [projectAddress]);

  const loadProjectNews = async () => {
    try {
      setIsLoading(true);
      // Here you would fetch news from your smart contract
      const response = await fetch(`/api/news/project/${projectAddress}`);
      const data = await response.json();
      setNews(data);
    } catch (error) {
      console.error("Error loading project news:", error);
      toast.error("Failed to load project news");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublishNews = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const verifiedNews =
        await OnChainNewsService.getInstance().signNewsAnnouncement(
          newAnnouncement.title,
          newAnnouncement.content,
          projectAddress,
          privateKey,
        );

      // Store on-chain
      const txHash = await OnChainNewsService.getInstance().storeNewsOnChain(
        verifiedNews,
        privateKey,
      );

      toast.success("News published successfully");
      setNewAnnouncement({ title: "", content: "" });
      await loadProjectNews();
    } catch (error) {
      console.error("Error publishing news:", error);
      toast.error("Failed to publish news");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNews) return;

    try {
      setIsLoading(true);
      const verifiedNews =
        await OnChainNewsService.getInstance().signNewsAnnouncement(
          editingNews.title,
          editingNews.content,
          projectAddress,
          privateKey,
        );

      // Update on-chain
      const txHash = await OnChainNewsService.getInstance().storeNewsOnChain(
        verifiedNews,
        privateKey,
      );

      toast.success("News updated successfully");
      setEditingNews(null);
      await loadProjectNews();
    } catch (error) {
      console.error("Error updating news:", error);
      toast.error("Failed to update news");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNews = async (newsId: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    try {
      setIsLoading(true);
      // Here you would call your smart contract to mark the news as invalid
      await fetch(`/api/news/${newsId}`, { method: "DELETE" });
      toast.success("News deleted successfully");
      await loadProjectNews();
    } catch (error) {
      console.error("Error deleting news:", error);
      toast.error("Failed to delete news");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Project News Manager</h2>

        {/* New Announcement Form */}
        <form onSubmit={handlePublishNews} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              value={newAnnouncement.title}
              onChange={(e) =>
                setNewAnnouncement({
                  ...newAnnouncement,
                  title: e.target.value,
                })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Content
            </label>
            <textarea
              value={newAnnouncement.content}
              onChange={(e) =>
                setNewAnnouncement({
                  ...newAnnouncement,
                  content: e.target.value,
                })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows={4}
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Publish Announcement
          </button>
        </form>
      </div>

      {/* News List */}
      <div className="space-y-4">
        {news.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-md p-6">
            {editingNews?.id === item.id ? (
              <form onSubmit={handleUpdateNews} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editingNews?.title || ""}
                    onChange={(e) =>
                      setEditingNews((prev) =>
                        prev ? { ...prev, title: e.target.value } : null,
                      )
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Content
                  </label>
                  <textarea
                    value={editingNews?.content || ""}
                    onChange={(e) =>
                      setEditingNews((prev) =>
                        prev ? { ...prev, content: e.target.value } : null,
                      )
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    rows={4}
                    required
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingNews(null)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium">{item.title}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingNews(item)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteNews(item.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <p className="text-gray-600">{item.content}</p>
                <div className="mt-4 flex items-center text-sm text-gray-500">
                  <Shield className="w-4 h-4 mr-1" />
                  <span>
                    Verified on{" "}
                    {new Date(item.timestamp * 1000).toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
